const nodemailer = require("nodemailer");

/**
 * Sends the generated PDF via email using Nodemailer and Gmail.
 * @param {string[]} emails List of recipient emails
 * @param {Buffer} pdfBuffer The PDF data
 */
async function sendEmail(emails, pdfBuffer) {
  const { EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "Missing EMAIL_USER or EMAIL_PASS in environment variables."
    );
  }

  // Configure transporter (Assuming Gmail)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS, // This MUST be an App Password, not regular password
    },
  });

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
