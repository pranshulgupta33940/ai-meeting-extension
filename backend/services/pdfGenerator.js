const PDFDocument = require("pdfkit");

// ── Brand colors ──────────────────────────────────────────────────────────────
const COLORS = {
  primary:        "#4F46E5",
  secondary:      "#7C3AED",
  accent:         "#06B6D4",
  dark:           "#1E1B4B",
  light:          "#F5F3FF",
  text:           "#1F2937",
  muted:          "#6B7280",
  white:          "#FFFFFF",
  divider:        "#E5E7EB",
  keyBg:          "#EFF6FF",
  actionBg:       "#F0FDF4",
  decisionBg:     "#FFF7ED",
  keyBorder:      "#3B82F6",
  actionBorder:   "#22C55E",
  decisionBorder: "#F59E0B",
};

const SECTION_META = {
  "Key Points":    { bg: COLORS.keyBg,      border: COLORS.keyBorder,      icon: "KEY POINTS"    },
  "Action Items":  { bg: COLORS.actionBg,   border: COLORS.actionBorder,   icon: "ACTION ITEMS"  },
  "Decisions":     { bg: COLORS.decisionBg, border: COLORS.decisionBorder, icon: "DECISIONS"     },
};

/**
 * Generates a professional, branded PDF buffer from the structured summary.
 * @param {Object} summaryData { keyPoints, actionItems, decisions }
 * @returns {Promise<Buffer>}
 */
function generatePDF(summaryData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));

      const W      = doc.page.width;   // 595.28
      const H      = doc.page.height;  // 841.89
      const MARGIN = 48;
      const CW     = W - MARGIN * 2;   // content width

      // ── HEADER BAND ──────────────────────────────────────────────────────────
      doc.rect(0, 0, W, 140).fill(COLORS.dark);
      doc.rect(0, 105, W, 35).fill(COLORS.primary);

      // Decorative circles
      doc.save();
      doc.opacity(0.15);
      doc.circle(W - 55, 18, 75).fill(COLORS.primary);
      doc.circle(W - 20, 110, 45).fill(COLORS.secondary);
      doc.restore();

      // Brand label
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.accent)
         .text("MEET SUMMARIZER  AI", MARGIN, 20, { characterSpacing: 1.5 });

      // Report title
      doc.font("Helvetica-Bold").fontSize(26).fillColor(COLORS.white)
         .text("Meeting Summary Report", MARGIN, 44);

      // Date subtitle
      const now     = new Date();
      const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      doc.font("Helvetica").fontSize(9).fillColor("#A5B4FC")
         .text("Generated on " + dateStr + "  at  " + timeStr, MARGIN, 112);

      // ── STATS CARDS ───────────────────────────────────────────────────────────
      let y = 158;
      const stats = [
        { label: "Key Points",   value: String(summaryData.keyPoints?.length  || 0), color: COLORS.primary       },
        { label: "Action Items", value: String(summaryData.actionItems?.length || 0), color: COLORS.actionBorder  },
        { label: "Decisions",    value: String(summaryData.decisions?.length   || 0), color: COLORS.decisionBorder },
      ];
      const cardW = (CW - 20) / 3;
      stats.forEach((s, i) => {
        const cx = MARGIN + i * (cardW + 10);
        doc.roundedRect(cx, y, cardW, 68, 8).fill(COLORS.light);
        doc.rect(cx, y, 4, 68).fill(s.color);
        doc.font("Helvetica-Bold").fontSize(30).fillColor(s.color)
           .text(s.value, cx + 8, y + 8, { width: cardW - 16, align: "center" });
        doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
           .text(s.label, cx + 8, y + 44, { width: cardW - 16, align: "center" });
      });
      y += 84;

      // ── HORIZONTAL RULE ───────────────────────────────────────────────────────
      doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).strokeColor(COLORS.divider).lineWidth(1).stroke();
      y += 18;

      // ── SECTION RENDERER ─────────────────────────────────────────────────────
      const addSection = (title, items) => {
        if (!items || items.length === 0) return y;
        const meta = SECTION_META[title] || { bg: COLORS.light, border: COLORS.primary, icon: title.toUpperCase() };

        // Section heading bar
        doc.roundedRect(MARGIN, y, CW, 30, 6).fill(COLORS.dark);
        doc.rect(MARGIN, y, 5, 30).fill(meta.border);
        doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.white)
           .text(meta.icon, MARGIN + 14, y + 9, { characterSpacing: 1 });
        y += 38;

        items.forEach((item, idx) => {
          const text    = (item || "").trim();
          const textW   = CW - 58;
          const textH   = doc.heightOfString(text, { width: textW, fontSize: 11 });
          const cardH   = Math.max(42, textH + 22);

          // Page break guard
          if (y + cardH > H - 60) {
            doc.addPage({ margin: 0, size: "A4" });
            doc.rect(0, 0, W, 6).fill(COLORS.primary);
            y = 24;
          }

          // Card
          doc.roundedRect(MARGIN, y, CW, cardH, 6).fill(meta.bg);
          doc.rect(MARGIN, y, 4, cardH).fill(meta.border);

          // Number badge
          doc.circle(MARGIN + 22, y + cardH / 2, 11).fill(meta.border);
          doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white)
             .text(String(idx + 1), MARGIN + 15, y + cardH / 2 - 6, { width: 14, align: "center" });

          // Text
          doc.font("Helvetica").fontSize(11).fillColor(COLORS.text)
             .text(text, MARGIN + 40, y + 11, { width: textW, lineGap: 3 });

          y += cardH + 7;
        });

        y += 14;
        return y;
      };

      y = addSection("Key Points",   summaryData.keyPoints);
      y = addSection("Action Items", summaryData.actionItems);
      y = addSection("Decisions",    summaryData.decisions);

      // ── FOOTER ───────────────────────────────────────────────────────────────
      const footerY = H - 40;
      doc.rect(0, footerY, W, 40).fill(COLORS.dark);
      doc.font("Helvetica").fontSize(8.5).fillColor("#818CF8")
         .text("Confidential  •  Generated by Google Meet Auto-Summarizer Extension", MARGIN, footerY + 13, { width: CW - 60 });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.accent)
         .text("Page 1", W - MARGIN - 36, footerY + 13, { width: 36, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
