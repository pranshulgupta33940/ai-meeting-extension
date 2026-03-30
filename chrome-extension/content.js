/**
 * content.js — Injected into every Google Meet tab
 *
 * Responsibilities:
 *  1. Watch for Google Meet's live caption DOM elements using MutationObserver
 *  2. Deduplicate consecutive identical lines
 *  3. Accumulate transcript in chrome.storage.local
 *  4. Respond to messages from popup.js (get / clear transcript)
 */

(function () {
  "use strict";

  // ─── CONFIG ─────────────────────────────────────────────────────────────────
  // Google Meet renders caption text inside elements with this attribute.
  // Selector targets the caption text spans inside the captions container.
  // Note: Google may change class names; update these if captions stop capturing.
  const CAPTION_SELECTORS = [
    '[jsname="tgaKEf"]',   // speaker text node (primary)
    ".a4cQT",              // fallback caption wrapper
    '[data-message-text]', // used in some Meet versions
  ];

  // Storage key for the accumulated transcript
  const STORAGE_KEY = "meetTranscript";

  // ─── STATE ──────────────────────────────────────────────────────────────────
  let lastCapturedLine = ""; // track last line to avoid duplicates
  let observer = null;       // MutationObserver reference

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  /**
   * Reads the current live caption text from the DOM.
   * Tries each known selector until one returns text.
   * @returns {string|null}
   */
  function getCurrentCaptionText() {
    for (const selector of CAPTION_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Collect all visible text from matched elements
        const text = Array.from(elements)
          .map((el) => el.innerText?.trim())
          .filter(Boolean)
          .join(" ");
        if (text) return text;
      }
    }
    return null;
  }

  /**
   * Appends a new line to the stored transcript (only if changed from last line).
   * @param {string} text
   */
  function appendToTranscript(text) {
    // Replace multiple whitespace with a single space
    const cleanedText = text.replace(/\s+/g, " ").trim();

    // Skip empty strings or duplicate of last captured line
    if (!cleanedText || cleanedText === lastCapturedLine) return;

    lastCapturedLine = cleanedText;

    // Read existing transcript, then append
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const existing = result[STORAGE_KEY] || "";
      const timestamp = new Date().toLocaleTimeString();
      const newEntry = `[${timestamp}] ${cleanedText}`;
      const updated = existing ? `${existing}\n${newEntry}` : newEntry;
      chrome.storage.local.set({ [STORAGE_KEY]: updated });
    });
  }

  // ─── OBSERVER ────────────────────────────────────────────────────────────────

  /**
   * Starts watching the document body for DOM mutations.
   * Whenever a mutation fires, we check all caption selectors.
   */
  function startObserver() {
    if (observer) return; // Already running

    observer = new MutationObserver(() => {
      const captionText = getCurrentCaptionText();
      if (captionText) {
        appendToTranscript(captionText);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log("[MeetSummarizer] Caption observer started.");
  }

  // ─── MESSAGE LISTENER ────────────────────────────────────────────────────────

  /**
   * Listens for messages sent from popup.js via chrome.runtime.sendMessage.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_TRANSCRIPT") {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        sendResponse({ transcript: result[STORAGE_KEY] || "" });
      });
      return true; // async response
    }

    if (message.type === "CLEAR_TRANSCRIPT") {
      chrome.storage.local.set({ [STORAGE_KEY]: "" }, () => {
        lastCapturedLine = "";
        sendResponse({ success: true });
      });
      return true;
    }
  });

  // ─── INIT ────────────────────────────────────────────────────────────────────

  // Start observing on page load
  startObserver();

  // Also restart observer after SPA navigations (Meet uses a single-page app)
  let currentUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      if (location.href.includes("meet.google.com/")) {
        lastCapturedLine = "";
        startObserver();
      }
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
})();
