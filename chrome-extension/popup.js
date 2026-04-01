/**
 * popup.js — Handles the popup UI logic
 *
 * Responsibilities:
 *  1. On load, asks the content script for the current transcript to show stats.
 *  2. Handles 'Clear Transcript' button.
 *  3. Handles 'Generate Summary' button by sending to background.js.
 */

// UI Elements
const badge = document.getElementById("status-badge");
const wordCountEl = document.getElementById("word-count");
const lineCountEl = document.getElementById("line-count");
const transcriptPreview = document.getElementById("transcript-preview");

const emailInput = document.getElementById("email-input");
const btnClear = document.getElementById("btn-clear");
const btnSummarize = document.getElementById("btn-summarize");
const messageEl = document.getElementById("message");

// State
let currentTranscript = "";

// ─── INITIALIZATION ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url.includes("meet.google.com/")) {
    showError("Please open Google Meet to use this extension.");
    disableActions();
    return;
  }

  // 2. Fetch transcript from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_TRANSCRIPT",
    });
    
    if (response && response.transcript) {
      currentTranscript = response.transcript;
      updateStats(response.transcript);
      badge.textContent = "Capturing";
      badge.className = "badge badge--active";
    }
  } catch (err) {
    // Content script might not be injected yet
    showError("Please refresh the Meet and turn on Captions (CC).");
    disableActions();
  }
});

// ─── EVENT LISTENERS ────────────────────────────────────────────────────────

btnClear.addEventListener("click", async () => {
  if (!confirm("Clear all captured captions?")) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await chrome.tabs.sendMessage(tab.id, { type: "CLEAR_TRANSCRIPT" });
  currentTranscript = "";
  updateStats("");
});

btnSummarize.addEventListener("click", async () => {
  // Validate transcript
  if (!currentTranscript || currentTranscript.trim() === "") {
    showError("No captions captured yet.");
    return;
  }

  // Validate emails
  const rawEmails = emailInput.value.trim();
  if (!rawEmails) {
    showError("Please enter at least one recipient email.");
    emailInput.focus();
    return;
  }

  // Split and simple regex validation
  const emails = rawEmails.split(",").map((e) => e.trim());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = emails.find((e) => !emailRegex.test(e));
  if (invalid) {
    showError(`Invalid email address: ${invalid}`);
    return;
  }

  // Send request to background script (which proxies to Node.js backend)
  setLoading(true);
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SUMMARIZE",
      payload: { transcript: currentTranscript, emails },
    });

    if (response && response.success) {
      showSuccess("Summary generated & PDF emailed successfully!");
    } else {
      showError(response?.error || "Unknown error occurred.");
    }
  } catch (err) {
    showError("Extension error: " + err.message);
  } finally {
    setLoading(false);
  }
});

// ─── UI HELPERS ─────────────────────────────────────────────────────────────

function updateStats(text) {
  if (!text) {
    wordCountEl.textContent = "0";
    lineCountEl.textContent = "0";
    transcriptPreview.innerHTML = "<em>Captions will appear here…</em>";
    return;
  }

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  lineCountEl.textContent = lines.length;
  wordCountEl.textContent = words.length;

  // Show only the last 5 lines reversed in the preview
  const previewText = lines
    .slice(-5)
    .reverse()
    .join("<br>");
  transcriptPreview.innerHTML = previewText;
}

function disableActions() {
  btnSummarize.disabled = true;
  btnClear.disabled = true;
}

function setLoading(isLoading) {
  btnSummarize.disabled = isLoading;
  btnSummarize.innerHTML = isLoading
    ? `<span class="spinner"></span> Processing...`
    : `Generate Summary &amp; Email PDF`;
}

function showError(msg) {
  messageEl.textContent = msg;
  messageEl.className = "message message--error";
  messageEl.hidden = false;
}

function showSuccess(msg) {
  messageEl.textContent = msg;
  messageEl.className = "message message--success";
  messageEl.hidden = false;
}

function hideMessage() {
  messageEl.hidden = true;
  messageEl.textContent = "";
}
