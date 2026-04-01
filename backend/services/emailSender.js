const nodemailer = require("nodemailer");

/**
 * Sends the generated PDF via email using Nodemailer.
 * Supports Gmail (App Password) or generic SMTP (Brevo, SendGrid, etc.)
 * Set EMAIL_SERVICE=gmail in .env to use Gmail, otherwise uses raw SMTP.
 * @param {string[]} emails List of recipient emails
 * @param {Buffer} pdfBuffer The PDF data
 */
async function sendEmail(emails, pdfBuffer) {
  const { EMAIL_USER, EMAIL_PASS, EMAIL_SERVICE, SMTP_HOST, SMTP_PORT } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS in environment variables.");
  }

  let transporterConfig;

  if (EMAIL_SERVICE === "gmail") {
    // Gmail with App Password
    transporterConfig = {
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    };
  } else {
    // Generic SMTP — works with Brevo, SendGrid, Mailgun, etc.
    transporterConfig = {
      host: SMTP_HOST || "smtp-relay.brevo.com",
      port: parseInt(SMTP_PORT || "587"),
      secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  const mailOptions = {
    from: `"Meet Summarizer" <${EMAIL_USER}>`,
    to: emails.join(", "),
    subject: `Meeting Summary - ${new Date().toLocaleDateString()}`,
    text: "Attached is the summarized PDF from your recent Google Meet.",
    attachments: [
      {
        filename: `Meeting_Summary_${Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("[EmailSender] Email sent: " + info.response);
  return info;
}

module.exports = { sendEmail };
