(function () {
  "use strict";

  const SPEAKER_SELECTORS = ['.zs7s8d', '[jsname="bVHCE"]', '.KcIKk', '.YTbUzc'];
  const CAPTION_SELECTORS = ['.a4cQT', '[jsname="tgaKEf"]', '.CNusmb', '.jbhGbc'];

  const TRANSCRIPT_KEY = "meetTranscript";
  const SPEAKERS_KEY = "meetSpeakers";

  let lastSpeaker = "";
  let lastText = "";
  let observer = null;

  function getLatestElement(selectors) {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Return the text of the last element in the NodeList
        return elements[elements.length - 1].innerText?.trim();
      }
    }
    return null;
  }

  function appendToTranscript(speaker, text) {
    if (!text) return;

    const currentCombo = speaker + ":" + text;
    const lastCombo = lastSpeaker + ":" + lastText;
    
    if (currentCombo === lastCombo) return;

    lastSpeaker = speaker;
    lastText = text;

    const timestamp = new Date().toISOString();
    const entry = { speaker, text, timestamp };

    chrome.storage.local.get([TRANSCRIPT_KEY, SPEAKERS_KEY], (res) => {
      const transcript = res[TRANSCRIPT_KEY] || [];
      const speakers = new Set(res[SPEAKERS_KEY] || []);
      
      transcript.push(entry);
      if (speaker && speaker !== "Unknown") {
        speakers.add(speaker);
      }

      chrome.storage.local.set({
        [TRANSCRIPT_KEY]: transcript,
        [SPEAKERS_KEY]: Array.from(speakers)
      });
    });
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver(() => {
      let speaker = getLatestElement(SPEAKER_SELECTORS) || "Unknown";
      let text = getLatestElement(CAPTION_SELECTORS);

      if (text) {
        appendToTranscript(speaker, text);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    console.log("[MeetSummarizer] Caption observer started.");
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_TRANSCRIPT") {
      chrome.storage.local.get([TRANSCRIPT_KEY, SPEAKERS_KEY], (res) => {
        const transcriptArr = res[TRANSCRIPT_KEY] || [];
        const transcriptString = transcriptArr.map(t => `${t.speaker}: ${t.text}`).join("\n");
        const speakers = res[SPEAKERS_KEY] || [];
        sendResponse({ transcript: transcriptString, speakers: speakers });
      });
      return true;
    }

    if (message.type === "GET_SPEAKERS") {
      chrome.storage.local.get([SPEAKERS_KEY], (res) => {
        sendResponse({ speakers: res[SPEAKERS_KEY] || [] });
      });
      return true;
    }

    if (message.type === "CLEAR_TRANSCRIPT") {
      chrome.storage.local.set({ [TRANSCRIPT_KEY]: [], [SPEAKERS_KEY]: [] }, () => {
        lastSpeaker = "";
        lastText = "";
        sendResponse({ success: true });
      });
      return true;
    }
  });

  startObserver();

  // SPA Navigation Restart
  let currentUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      if (location.href.includes("meet.google.com/")) {
        lastSpeaker = "";
        lastText = "";
        startObserver();
      }
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
})();
