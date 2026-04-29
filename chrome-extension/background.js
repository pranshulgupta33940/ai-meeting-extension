chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SUMMARIZE") {
    handleSummarize(message.payload).then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});

async function handleSummarize(payload) {
  const { transcript, emails } = payload;
  
  const storageKeys = ["GEMINI_API_KEY", "EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY"];
  const keys = await chrome.storage.local.get(storageKeys);
  
  if (!keys.GEMINI_API_KEY) {
    throw new Error("Gemini API key not found. Please set it in options.");
  }
  
  const systemPrompt = `You are an expert meeting analyst. Given a Google Meet transcript where each line is formatted as 'SpeakerName: text', produce a JSON object (and nothing else — no markdown, no explanation) with this exact structure:
{
  "meetingTitle": "string (infer from context or use 'Team Meeting')",
  "date": "string (today's date)",
  "duration": "string (estimate from timestamps if available)",
  "keyPoints": ["string (5-8 most important discussion points)"],
  "actionItems": [{ "owner": "string", "task": "string" }],
  "decisions": ["string"],
  "speakerSummaries": [{ 
    "name": "string", 
    "contribution": "string (2-3 sentence summary of what this person discussed)"
  }],
  "overallSummary": "string (3-4 sentence executive summary)"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt + "\n\nHere is the transcript:\n" + transcript }]
        }]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.candidates[0].content.parts[0].text;
  
  // Clean up the markdown if Gemini returns markdown code block
  let cleanedText = textContent.replace(/```json/i, "").replace(/```/g, "").trim();
  
  let summaryJson;
  try {
    summaryJson = JSON.parse(cleanedText);
  } catch (e) {
    throw new Error("Failed to parse Gemini response as JSON: " + cleanedText);
  }

  return { success: true, summary: summaryJson, emails, keys };
}
