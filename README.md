<div align="center">
  <img src="https://img.icons8.com/color/96/000000/google-meet.png" alt="Google Meet Logo">
  <h1>🎙️ Google Meet Auto-Summarizer</h1>
  <p>
    An intelligent Chrome Extension & Node.js Backend that captures live Google Meet captions, summarizes them using Hugging Face AI, generates a PDF report, and emails it to participants.
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Made with Node.js](https://img.shields.io/badge/Made_with-Node.js-339933.svg?logo=nodedotjs)](https://nodejs.org/)
  [![Chrome Extension V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](https://developer.chrome.com/docs/extensions/mv3/)
  [![Hugging Face](https://img.shields.io/badge/AI-Hugging_Face-FFD21E.svg)](https://huggingface.co/)
</div>

---

## ✨ Features

- **Live Caption Capture:** Silently captures text directly from the Google Meet DOM (no invasive audio recording required).
- **Smart Deduplication:** Filters out repeated words and stutters in real-time.
- **AI Summarization:** Uses Hugging Face's `BART-large-cnn` model to extract Key Points, Action Items, and Decisions.
- **Auto-Chunking:** Safely handles long meetings by chunking transcripts so token limits are never exceeded.
- **PDF Generation:** Instantly compiles the AI summary into a clean, formatted PDF document.
- **Email Automation:** Automatically sends the generated PDF directly to the entered email addresses.

## 🏗️ Architecture

1. **Chrome Extension (`/chrome-extension`)**: Injects a script into `meet.google.com` to observe DOM mutations and scrape CC text.
2. **Node.js Backend (`/backend`)**: Exposes a REST API (`POST /summarize`) that receives the transcript, talks to Hugging Face, generates the PDF via `pdfkit`, and emails it using `nodemailer`.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following ready:
- **Node.js** (v16.x or higher) installed on your machine.
- A free **Hugging Face Inference API Token** ([Get it here](https://huggingface.co/settings/tokens)).
- A **Google App Password** for sending emails via Nodemailer ([Generate one here](https://myaccount.google.com/apppasswords)).

### 1️⃣ Setting up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Open the `.env` file and insert your actual credentials:
   ```env
   PORT=3000
   HF_API_KEY=your_huggingface_token
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ```
5. Start the server:
   ```bash
   npm start
   ```

### 2️⃣ Loading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `chrome-extension` folder from this repository.
5. The extension is now installed! You can pin it to your toolbar for easy access.

---

## 💻 How to Use

1. Launch a **Google Meet** call (`meet.google.com/new`).
2. 🚨 **CRUCIAL:** Click the **CC (Turn on captions)** button at the bottom of the Meet screen. The extension only captures words that appear visually on the screen.
3. Speak normally. You can click the extension icon in your Chrome toolbar to watch the word count increase in real-time.
4. When the meeting is finished, click the extension icon.
5. Enter the recipient emails (comma-separated).
6. Click **Generate Summary & Email PDF**.
7. Check your terminal to see the AI processing in action. In a few seconds, an email will arrive in your inbox!

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (Manifest V3)
- **Backend:** Node.js, Express.js
- **AI Integrations:** Hugging Face Inference API (`facebook/bart-large-cnn`)
- **Utilities:** `axios` (API fetching), `pdfkit` (PDF creation), `nodemailer` (Email SMTP)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/yourusername/meet-summarizer/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
<div align="center">
  <i>Built with ❤️ using Node.js and Chrome Extensions.</i>
</div>
