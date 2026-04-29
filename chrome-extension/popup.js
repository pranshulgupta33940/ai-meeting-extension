/**
 * popup.js — Handles the popup UI logic
 */

// UI Elements
const badge = document.getElementById("status-badge");
const badgeText = document.getElementById("badge-text");
const wordCountEl = document.getElementById("word-count");
const lineCountEl = document.getElementById("line-count");
const speakerCountEl = document.getElementById("speaker-count");
const transcriptPreview = document.getElementById("transcript-preview");
const speakerChipsContainer = document.getElementById("speaker-chips");

const emailInput = document.getElementById("email-input");
const emailTagsContainer = document.getElementById("email-tags");

const btnClear = document.getElementById("btn-clear");
const btnSummarize = document.getElementById("btn-summarize");
const btnDownload = document.getElementById("btn-download");
const messageEl = document.getElementById("message");

// State
let currentTranscript = "";
let emailTags = [];

const SPEAKER_COLORS = [
  { bg: "#e8f0fe", text: "#1967d2", avatarBg: "#1a73e8" }, // 0: blue
  { bg: "#fce8e6", text: "#c5221f", avatarBg: "#e53935" }, // 1: red
  { bg: "#e6f4ea", text: "#1b5e20", avatarBg: "#43a047" }, // 2: green
  { bg: "#fff3e0", text: "#e65100", avatarBg: "#fb8c00" }, // 3: orange
  { bg: "#f3e5f5", text: "#6a1b9a", avatarBg: "#8e24aa" }, // 4: purple
];

// ─── INITIALIZATION ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  if (emailInput.value) {
    const rawEmails = emailInput.value.split(",");
    rawEmails.forEach(e => addEmailTag(e.trim()));
    emailInput.value = "";
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url.includes("meet.google.com/")) {
    showError("Please open Google Meet to use this extension.");
    disableActions();
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_TRANSCRIPT",
    });
    
    let speakers = response?.speakers || [];

    if (response && response.transcript) {
      currentTranscript = response.transcript;
      updateStats(response.transcript, speakers);
      badgeText.textContent = "Capturing";
      badge.className = "badge badge--active";
    }
  } catch (err) {
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
  updateStats("", []);
});

btnDownload.addEventListener("click", () => {
  if (window.latestPdfBase64) {
    const link = document.createElement('a');
    link.href = "data:application/pdf;base64," + window.latestPdfBase64;
    link.download = "Meeting_Summary.pdf";
    link.click();
  } else {
    alert("Please summarize the meeting first.");
  }
});

emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = emailInput.value.trim();
    if (val) {
      addEmailTag(val);
      emailInput.value = "";
    }
  }
});

btnSummarize.addEventListener("click", async () => {
  if (!currentTranscript || currentTranscript.trim() === "") {
    showError("No captions captured yet.");
    return;
  }

  // Auto-add any pending email that was typed but where Enter wasn't pressed
  const pendingEmail = emailInput.value.trim();
  if (pendingEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(pendingEmail)) {
      if (!emailTags.includes(pendingEmail)) {
        emailTags.push(pendingEmail);
        renderEmailTags();
      }
      emailInput.value = "";
      hideMessage();
    }
  }

  if (emailTags.length === 0) {
    showError("Please enter at least one recipient email.");
    emailInput.focus();
    return;
  }

  setLoading(true);
  hideMessage();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SUMMARIZE",
      payload: { transcript: currentTranscript, emails: emailTags },
    });

    if (response && response.success) {
      const summary = response.summary;
      const keys = response.keys;

      // 1. Generate PDF
      window.latestPdfBase64 = generatePDF(summary);

      // 2. Send Emails
      await sendEmails(window.latestPdfBase64, emailTags, summary, keys);

      showSuccess("Summary generated & emailed successfully!");
    } else {
      showError(response?.error || "Unknown error occurred.");
    }
  } catch (err) {
    showError("Extension error: " + err.message);
  } finally {
    setLoading(false);
  }
});

// ─── EMAIL TAGS LOGIC ───────────────────────────────────────────────────────

function addEmailTag(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError(`Invalid email address: ${email}`);
    return;
  }
  
  if (emailTags.includes(email)) return;

  emailTags.push(email);
  renderEmailTags();
  hideMessage();
}

function removeEmailTag(email) {
  emailTags = emailTags.filter(e => e !== email);
  renderEmailTags();
}

function renderEmailTags() {
  emailTagsContainer.innerHTML = "";
  emailTags.forEach(email => {
    const tag = document.createElement("div");
    tag.className = "email-tag";
    tag.textContent = email;
    
    const removeBtn = document.createElement("span");
    removeBtn.className = "email-tag-remove";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => removeEmailTag(email);
    
    tag.appendChild(removeBtn);
    emailTagsContainer.appendChild(tag);
  });
}

// ─── UI HELPERS ─────────────────────────────────────────────────────────────

function renderSpeakerChips(speakers) {
  speakerChipsContainer.innerHTML = "";
  speakerCountEl.textContent = speakers.length;

  speakers.forEach((name) => {
    const colorObj = SPEAKER_COLORS[speakers.indexOf(name) % SPEAKER_COLORS.length];
    const initial = name.charAt(0).toUpperCase();

    const chip = document.createElement("div");
    chip.className = "speaker-chip";
    chip.id = `chip-${name.replace(/\s+/g, '-')}`;
    chip.style.backgroundColor = colorObj.bg;
    chip.style.color = colorObj.text;

    const avatar = document.createElement("div");
    avatar.className = "speaker-avatar";
    avatar.style.backgroundColor = colorObj.avatarBg;
    avatar.textContent = initial;

    const nameSpan = document.createElement("span");
    nameSpan.className = "speaker-name";
    nameSpan.textContent = name.split(" ")[0];

    chip.appendChild(avatar);
    chip.appendChild(nameSpan);
    speakerChipsContainer.appendChild(chip);
  });
}

function updateStats(text, providedSpeakers = []) {
  if (!text) {
    wordCountEl.textContent = "0";
    lineCountEl.textContent = "0";
    transcriptPreview.innerHTML = "<em>Captions will appear once you enable CC...</em>";
    renderSpeakerChips([]);
    return;
  }

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  lineCountEl.textContent = lines.length;
  wordCountEl.textContent = words.length;

  let speakers = [...providedSpeakers];
  if (speakers.length === 0) {
    const speakerSet = new Set();
    lines.forEach(line => {
      const cleanedLine = line.replace(/^\[.*?\]\s*/, '');
      const match = cleanedLine.match(/^([^:]+):/);
      if (match) {
        speakerSet.add(match[1].trim());
      }
    });
    speakers = Array.from(speakerSet);
  }

  renderSpeakerChips(speakers);

  const previewLines = lines.slice(-5).reverse().map(line => {
    let formattedLine = line.replace(/^\[.*?\]\s*/, '');
    const match = formattedLine.match(/^([^:]+):(.*)$/);
    if (match) {
      const name = match[1].trim();
      const rest = match[2];
      const colorObj = SPEAKER_COLORS[speakers.indexOf(name) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0];
      return `<span style="color: ${colorObj.text}; font-weight: bold;">${name}:</span>${rest}`;
    }
    return formattedLine;
  });

  transcriptPreview.innerHTML = previewLines.join("<br>");
}

function disableActions() {
  btnSummarize.disabled = true;
  btnClear.disabled = true;
  btnDownload.disabled = true;
}

function setLoading(isLoading) {
  btnSummarize.disabled = isLoading;
  if (isLoading) {
    btnSummarize.innerHTML = `<div class="spinner"></div><span>Processing...</span>`;
  } else {
    btnSummarize.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <span>Summarize & Email PDF</span>`;
  }
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

// ─── PDF GENERATION ─────────────────────────────────────────────────────────

function generatePDF(summary) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const marginX = 20; // in mm, jsPDF default is mm
  let cursorY = 20;

  // Header band
  doc.setFillColor(30, 41, 59); // dark slate
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Meeting Summary Report", marginX, 15);
  
  doc.setFontSize(10);
  doc.text(`${summary.meetingTitle} • ${summary.date} • Duration: ${summary.duration}`, marginX, 22);

  cursorY = 40;
  doc.setTextColor(0, 0, 0);

  // Overall Summary
  doc.setFontSize(14);
  doc.text("Overall Summary", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(summary.overallSummary, 170);
  doc.text(summaryLines, marginX, cursorY);
  cursorY += (summaryLines.length * 5) + 10;

  // Key Points
  doc.setFontSize(14);
  doc.text("Key Points", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(11);
  summary.keyPoints.forEach((point, i) => {
    const pointLines = doc.splitTextToSize(`${i + 1}. ${point}`, 170);
    doc.text(pointLines, marginX, cursorY);
    cursorY += (pointLines.length * 5) + 2;
  });
  cursorY += 8;

  // Check page wrap
  if (cursorY > 260) { doc.addPage(); cursorY = 20; }

  // Action Items
  doc.setFontSize(14);
  doc.text("Action Items", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(11);
  summary.actionItems.forEach(item => {
    const text = `• [${item.owner}] ${item.task}`;
    const itemLines = doc.splitTextToSize(text, 170);
    doc.text(itemLines, marginX, cursorY);
    cursorY += (itemLines.length * 5) + 2;
  });
  cursorY += 8;

  if (cursorY > 260) { doc.addPage(); cursorY = 20; }

  // Decisions
  doc.setFontSize(14);
  doc.text("Decisions", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(11);
  summary.decisions.forEach((dec, i) => {
    const decLines = doc.splitTextToSize(`${i + 1}. ${dec}`, 170);
    doc.text(decLines, marginX, cursorY);
    cursorY += (decLines.length * 5) + 2;
  });
  cursorY += 8;

  if (cursorY > 250) { doc.addPage(); cursorY = 20; }

  // Speaker Summaries
  doc.setFontSize(14);
  doc.text("Speaker Summaries", marginX, cursorY);
  cursorY += 8;
  doc.setFontSize(11);
  summary.speakerSummaries.forEach(sp => {
    if (cursorY > 270) { doc.addPage(); cursorY = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(sp.name, marginX, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY += 5;
    
    const cLines = doc.splitTextToSize(sp.contribution, 165);
    doc.text(cLines, marginX + 5, cursorY);
    
    // Draw colored left border
    const rgb = hexToRgb(SPEAKER_COLORS[summary.speakerSummaries.indexOf(sp) % SPEAKER_COLORS.length].avatarBg);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(1);
    doc.line(marginX, cursorY - 4, marginX, cursorY + (cLines.length * 5) - 2);

    cursorY += (cLines.length * 5) + 5;
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Generated by MeetSummarizer AI • Confidential", marginX, 290);
  }

  return btoa(doc.output());
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// ─── EMAILJS SENDING ────────────────────────────────────────────────────────

async function sendEmails(pdfBase64, emails, summary, keys) {
  if (!keys.EMAILJS_SERVICE_ID || !keys.EMAILJS_TEMPLATE_ID || !keys.EMAILJS_PUBLIC_KEY) {
    throw new Error("EmailJS keys missing. Please set them in options.");
  }

  // Create HTML body for EmailJS since free tier can't attach
  let htmlBody = `
    <h2>${summary.meetingTitle}</h2>
    <p><strong>Date:</strong> ${summary.date} | <strong>Duration:</strong> ${summary.duration}</p>
    
    <h3>Overall Summary</h3>
    <p>${summary.overallSummary}</p>
    
    <h3>Key Points</h3>
    <ul>
      ${summary.keyPoints.map(k => `<li>${k}</li>`).join("")}
    </ul>

    <h3>Action Items</h3>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <tr style="background-color: #f8fafc;">
        <th align="left">Owner</th>
        <th align="left">Task</th>
      </tr>
      ${summary.actionItems.map(a => `<tr><td><strong>${a.owner}</strong></td><td>${a.task}</td></tr>`).join("")}
    </table>

    <h3>Decisions</h3>
    <ul>
      ${summary.decisions.map(d => `<li>${d}</li>`).join("")}
    </ul>

    <h3>Speaker Contributions</h3>
    ${summary.speakerSummaries.map(s => `
      <div style="margin-bottom: 10px; border-left: 3px solid #1a73e8; padding-left: 10px;">
        <strong>${s.name}</strong><br/>
        <span style="color: #475569;">${s.contribution}</span>
      </div>
    `).join("")}
  `;

  // Send individually
  const sendPromises = emails.map(email => {
    return fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: keys.EMAILJS_SERVICE_ID,
        template_id: keys.EMAILJS_TEMPLATE_ID,
        user_id: keys.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: email,
          meeting_title: summary.meetingTitle,
          meeting_date: summary.date,
          key_points_count: summary.keyPoints.length,
          meeting_summary: htmlBody // Used in template like {{{meeting_summary}}}
        }
      })
    }).then(res => {
      if (!res.ok) throw new Error("EmailJS failed for " + email);
    });
  });

  await Promise.all(sendPromises);
}
