const axios = require("axios");

// We'll use bart-large-cnn as it is excellent for free zero-shot summarization.
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn";

/**
 * Sleeps for ms milliseconds (used for rate limiting retries).
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls Hugging Face Inference API. Wraps axios with auto-retry logic 
 * in case the free model is loading (503 error).
 * @param {string} text Input text
 * @returns {string} Summary text
 */
async function queryHuggingFace(text, retries = 3) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("Missing HF_API_KEY in environment variables.");
  }

  try {
    const response = await axios.post(
      HF_API_URL,
      {
        inputs: text,
        parameters: {
          max_length: 250,
          min_length: 30,
          do_sample: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    if (response.data && response.data[0] && response.data[0].summary_text) {
        return response.data[0].summary_text;
    }
    throw new Error("Unexpected HF API response format.");
    
  } catch (error) {
    // If model is loading, it throws 503. Retry after delay.
    if (error.response && error.response.status === 503 && retries > 0) {
      console.log("[HF] Model is loading. Retrying in 15 seconds...");
      await sleep(15000);
      return queryHuggingFace(text, retries - 1);
    }
    throw new Error(
      error.response?.data?.error || error.message || "HF API failed"
    );
  }
}

/**
 * Splits text into chunks by roughly tracking characters to avoid 
 * exceeding model token limits (BART handles ~1024 tokens or roughly ~4000 chars safely).
 * @param {string} text 
 * @param {number} maxChars 
 * @returns {string[]}
 */
function chunkText(text, maxChars = 3500) {
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (currentChunk.join(" ").length + word.length > maxChars) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
    } else {
      currentChunk.push(word);
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  return chunks;
}

/**
 * Process transcript: chunk -> summarize chunks -> combine -> final extraction.
 * @param {string} transcript 
 * @returns {Object} Structured data { keyPoints, actionItems, decisions }
 */
async function summarizeTranscript(transcript) {
  // 1. Chunk transcript
  const chunks = chunkText(transcript);
  console.log(`[HF] Split transcript into ${chunks.length} chunks.`);

  // 2. Summarize each chunk
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[HF] Summarizing chunk ${i + 1}/${chunks.length}...`);
    const summary = await queryHuggingFace(chunks[i]);
    chunkSummaries.push(summary);
    // Pause briefly between chunks to respect free API rate limits
    if (i < chunks.length - 1) await sleep(2000); 
  }

  // 3. Combine chunk summaries. If still long, summarize again!
  let combinedSummary = chunkSummaries.join(" ");
  if (combinedSummary.length > 4000) {
    console.log("[HF] Combined summary too long, doing second pass...");
    combinedSummary = await queryHuggingFace(combinedSummary);
  }

  // 4. Extract structured items (Since basic BART doesn't output JSON natively,
  // we do simple NLP heuristic parsing or zero-shot classification. 
  // For MVP, we will pseudo-structure it by finding sentences that sound like actions).
  
  const sentences = combinedSummary
    .match(/[^.!?]+[.!?]+/g)
    ?.map(s => s.trim()) || [combinedSummary];

  const actionItems = [];
  const decisions = [];
  const keyPoints = [];

  const actionKeywords = ["will", "need to", "must", "should", "assigned", "action item", "prepare", "schedule"];
  const decisionKeywords = ["decided", "agreed", "concluded", "approved", "voted", "resolved"];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let classified = false;

    for (const kw of actionKeywords) {
      if (lower.includes(kw)) {
        actionItems.push(sentence);
        classified = true;
        break;
      }
    }

    if (!classified) {
      for (const kw of decisionKeywords) {
        if (lower.includes(kw)) {
          decisions.push(sentence);
          classified = true;
          break;
        }
      }
    }

    if (!classified) {
      keyPoints.push(sentence);
    }
  }

  // Ensure at least some key points exist
  if (keyPoints.length === 0) keyPoints.push(...sentences.slice(0, 2));

  return {
    keyPoints: keyPoints.length ? keyPoints : ["No main points captured."],
    actionItems: actionItems.length ? actionItems : ["No explicit action items identified."],
    decisions: decisions.length ? decisions : ["No explicit decisions identified."]
  };
}

module.exports = { summarizeTranscript };
