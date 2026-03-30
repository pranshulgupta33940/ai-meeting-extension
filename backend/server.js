require("dotenv").config();
const express = require("express");
const cors = require("cors");
const summarizeRoute = require("./routes/summarize");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Increase payload limit because transcripts can be very long
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/summarize", summarizeRoute);

// Health check
app.get("/", (req, res) => {
  res.send("Meet Summarizer Backend is running.");
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
