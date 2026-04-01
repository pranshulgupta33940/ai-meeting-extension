<div align="center">
  <img src="https://img.icons8.com/color/96/000000/google-meet.png" alt="Google Meet Logo">
  <h1>🎙️ Google Meet Auto-Summarizer</h1>
  <p>
    An intelligent Chrome Extension &amp; Node.js Backend that captures live Google Meet captions,<br>
    summarizes them using Hugging Face AI, generates a professional PDF report, and emails it to participants.
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Made with Node.js](https://img.shields.io/badge/Made_with-Node.js-339933.svg?logo=nodedotjs)](https://nodejs.org/)
  [![Chrome Extension V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](https://developer.chrome.com/docs/extensions/mv3/)
  [![Hugging Face](https://img.shields.io/badge/AI-Hugging_Face-FFD21E.svg)](https://huggingface.co/)
</div>

---

##  Features

| Feature | Description |
|---|---|
|  **Live Caption Capture** | Silently reads captions directly from the Google Meet DOM — no audio recording |
|  **Smart Deduplication** | Filters out repeated words and partial phrases in real-time |
|  **AI Summarization** | Uses Hugging Face `facebook/bart-large-cnn` to extract Key Points, Action Items & Decisions |
|  **Auto-Chunking** | Handles long meetings by splitting transcripts so token limits are never exceeded |
|  **Professional PDF** | Generates a branded, color-coded PDF report with stats, sections & numbered items |
|  **Email Automation** | Sends the PDF directly to all participant emails (Gmail or Brevo SMTP) |

---

##  System Architecture

```mermaid
flowchart TD
    subgraph EXT[" Chrome Extension (MV3)"]
        A["content.js\n────────────\nDOM MutationObserver\nScrapes CC captions\nDeduplicates text\nBuffers transcript"]
        B["background.js\n────────────\nService Worker\nMessage relay"]
        C["popup.html / popup.js\n────────────\nWord count display\nEmail input field\nGenerate button"]
    end

    subgraph BACKEND["⚙️ Node.js Backend (Express)"]
        D["POST /summarize\n────────────\nValidates payload\nOrchestrates pipeline"]
        E["huggingface.js\n────────────\nChunks transcript\n3500 chars/chunk\nRetry on 503"]
        F["pdfGenerator.js\n────────────\nBranded header\nStats cards\nColor-coded sections\nNumbered items"]
        G["emailSender.js\n────────────\nGmail App Password\nOR Brevo SMTP\nAttaches PDF"]
    end

    subgraph EXTERNAL["☁️ External Services"]
        H[" Hugging Face\nfacebook/bart-large-cnn\nInference API"]
        I[" Gmail SMTP\n/ Brevo SMTP"]
    end

    USER([" User\n(in Google Meet)"]) -->|Speaks, CC enabled| A
    A -->|Full transcript string| B
    B -->|Passes to popup| C
    C -->|POST transcript + emails| D
    D --> E
    E -->|text chunks| H
    H -->|summary_text per chunk| E
    E -->|structured summary| D
    D --> F
    F -->|PDF Buffer| D
    D --> G
    G -->|PDF attachment| I
    I -->|Email delivered| INBOX([" Recipient Inbox"])

    style EXT fill:#1E1B4B,color:#fff,stroke:#4F46E5
    style BACKEND fill:#1E3A2F,color:#fff,stroke:#22C55E
    style EXTERNAL fill:#3B1F00,color:#fff,stroke:#F59E0B
```

### Flow

```
Google Meet (CC Captions)
        │
        ▼
┌─────────────────────────────┐
│    Chrome Extension         │  ← Reads DOM mutations from .caption element
│  content.js + background.js │  ← Buffers full transcript
│  popup.html + popup.js      │  ← UI: word count, email input, send button
└────────────┬────────────────┘
             │  POST /summarize  {transcript, emails[]}
             ▼
┌─────────────────────────────────────────┐
│         Node.js Backend (Express)        │
│                                         │
│  1. Chunk transcript (3500 chars/chunk) │
│  2. Call HF BART-large-cnn per chunk   │──► Hugging Face Inference API
│  3. Combine + parse Key/Action/Decision │
│  4. Generate PDF (pdfkit)               │
│  5. Send Email (nodemailer)             │──► Gmail / Brevo SMTP
└─────────────────────────────────────────┘
             │
             ▼
      PDF email in inbox
```

---

## 📸 Output Proof

### Chrome Extension Popup
> Live word count, transcript preview, email entry, and one-click summarization.

<div align="center">
  <img src="assets/pdf_output.png" alt="PDF Output Preview" width="480">
</div>

### Generated PDF Report
The PDF is professionally designed with:
- **Branded header** — dark navy with report title and timestamp
- **Stats row** — count cards for Key Points / Action Items / Decisions
- **Color-coded sections** — blue (Key Points), green (Action Items), amber (Decisions)
- **Numbered item cards** with accent borders
- **Professional footer** with confidentiality note

---

##  Getting Started

### Prerequisites

- **Node.js** v16+ — [nodejs.org](https://nodejs.org/)
- **Hugging Face token** (Fine-grained, with `Make calls to Inference Providers` permission) — [Get it here](https://huggingface.co/settings/tokens)
- **Gmail App Password** (requires 2FA enabled) — [Generate one here](https://myaccount.google.com/apppasswords)  
  _Or use a free [Brevo](https://brevo.com) SMTP account instead_

---

### 1️ Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file:

```env
PORT=3000

# Hugging Face — Fine-grained token with "Make calls to Inference Providers" checked
HF_API_KEY=hf_your_token_here

# Email — Gmail with App Password
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_SERVICE=gmail

# OR — Brevo SMTP (no 2FA needed)
# EMAIL_USER=your_brevo_login
# EMAIL_PASS=your_brevo_master_password
# SMTP_HOST=smtp-relay.brevo.com
# SMTP_PORT=587
```

Start the server:

```bash
npm start
# → [Server] Listening on http://localhost:3000
```

---

### 2️ Chrome Extension Setup

1. Open Chrome → navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Pin the extension to your toolbar

---

##  How to Use

1. Start a **Google Meet** call at `meet.google.com`
2. 🚨 **Enable live captions** — click the **CC** button at the bottom of Meet
3. Click the extension icon in your toolbar — watch word count rise in real time
4. When the meeting ends, enter recipient emails (comma-separated)
5. Click **Generate Summary & Email PDF**
6. In seconds, a professional PDF summary arrives in the inbox ✅

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | HTML, CSS, Vanilla JS (Manifest V3) |
| Backend | Node.js, Express.js |
| AI Model | Hugging Face `facebook/bart-large-cnn` via Inference API |
| PDF Generation | `pdfkit` |
| Email | `nodemailer` (Gmail App Password or Brevo SMTP) |
| HTTP Client | `axios` |

---

##  Project Structure

```
extension/
├── chrome-extension/
│   ├── manifest.json       # MV3 config
│   ├── content.js          # Caption scraper (DOM observer)
│   ├── background.js       # Service worker
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic + API call
│   └── styles.css          # Popup styling
│
├── backend/
│   ├── server.js           # Express app entry point
│   ├── routes/
│   │   └── summarize.js    # POST /summarize route
│   └── services/
│       ├── huggingface.js  # AI summarization + chunking
│       ├── pdfGenerator.js # Professional PDF builder
│       └── emailSender.js  # Nodemailer (Gmail / SMTP)
│
├── assets/
│   ├── architecture.png    # Architecture diagram
│   └── pdf_output.png      # PDF output sample
│
└── .env                    # (gitignored) your secrets
```

---

##  Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <i>Built with ❤️ using Node.js, Chrome Extensions, and Hugging Face AI.</i>
</div>
