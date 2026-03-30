/**
 * background.js — Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  1. Listen for messages from popup.js
 *  2. Relay the summarize request to the backend (avoids CORS issues from content scripts)
 *  3. Return the result (success / error) back to popup.js
 */

const BACKEND_URL = "http://localhost:3000/summarize";

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SUMMARIZE") {
    // We must return true to keep the message channel open for async response
    handleSummarize(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || "Unknown error" })
      );
    return true; // keep channel open
  }
});

/**
 * Sends transcript + email list to the backend /summarize endpoint.
 * @param {{ transcript: string, emails: string[] }} payload
 * @returns {Promise<object>} Backend JSON response
 */
async function handleSummarize({ transcript, emails }) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, emails }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Backend error ${response.status}: ${errBody}`);
  }

  return response.json();
}
