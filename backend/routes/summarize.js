const express = require("express");
const { summarizeTranscript } = require("../services/huggingface");
const { generatePDF } = require("../services/pdfGenerator");
const { sendEmail } = require("../services/emailSender");

const router = express.Router();

/**
 * POST /summarize
 * Expects { transcript: string, emails: string[] }
 */
router.post("/", async (req, res) => {
  const { transcript, emails } = req.body;

  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid transcript" });
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ success: false, error: "Missing recipient emails" });
  }

  try {
    console.log(`[Summary Route] Received transcript of ${transcript.length} chars. Emails: ${emails.join(", ")}`);

    // 1. Summarize via Hugging Face AI
    const structuredSummary = await summarizeTranscript(transcript);
    console.log("[Summary Route] AI generation complete.");

    // 2. Generate PDF Buffer
    const pdfBuffer = await generatePDF(structuredSummary);
    console.log("[Summary Route] PDF generated.");

    // 3. Email the PDF
    await sendEmail(emails, pdfBuffer);
    console.log("[Summary Route] Emails sent successfully.");

    return res.json({ success: true, message: "Summary generated and emailed successfully." });
  } catch (error) {
    console.error("[Summary Route] Error:", error.message);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

module.exports = router;
