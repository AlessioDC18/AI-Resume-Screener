require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/evaluate", async (req, res) => {
  try {
    const { role, criteria, candidates } = req.body;

    const blocks = candidates.map((c, i) => {
      const resumePart = c.resumeText ? `Resume:\n${c.resumeText}` : "No resume provided";
      return `CANDIDATE ${i + 1}: ${c.name} (${c.email || "no email"})\n${resumePart}`;
    }).join("\n\n---\n\n");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Evaluate these candidates. Return ONLY a JSON array, no markdown, no extra text.

ROLE: ${role || "Open Position"}
CRITERIA: ${criteria}

${blocks}

Format:
[{"name":"...","email":"...","score":7,"strengths":["a","b"],"concerns":["c"],"recommendation":"Shortlist","summary":"one sentence"}]

recommendation must be: Shortlist, Maybe, or Reject`
      }]
    });

    const text = message.content.map(b => b.text || "").join("").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON found in response");
    const results = JSON.parse(match[0]);
    res.json({ results });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.send("AI Resume Screener API is running!"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))