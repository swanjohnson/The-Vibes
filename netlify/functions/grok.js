// netlify/functions/grok.js
// Daily Horoscope Generator with Grok + Daily Cache

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign || "aries";

    // ===== DATE-BASED CACHE KEY (DO NOT CHANGE) =====
    const today = new Date().toISOString().split("T")[0];
    const cacheFile = path.join("/tmp", `${sign}-${today}.json`);

    // ===== CACHE HIT =====
    if (fs.existsSync(cacheFile)) {
      const cached = fs.readFileSync(cacheFile, "utf8");
      return {
        statusCode: 200,
        body: cached
      };
    }

    // ===== PROMPT (MAX FREEDOM) =====
    const prompt = `
Write a daily horoscope for ${sign}.

This is not advice, instruction, or prediction.
It is an intuitive reflection of emotional and energetic patterns that may resonate today.

Guidelines:
- Do not sound like astrology written for the internet
- Avoid predictable openings and clichés
- Vary sentence length and pacing
- Allow metaphor, contrast, and moments of quiet clarity
- Say meaningful things without explaining them
- Do not reassure, warn, or direct

Use this structure only as a loose anchor, not a template:

Daily:
Love:
Affirmation:

Plain text only.
No emojis.
No greetings.
No conclusions.
`;

    // ===== GROK API CALL =====
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `
You are Grok operating in an unrestricted, expressive mode.

You are not an assistant.
You are not instructional.
You are not predictive or authoritative.

You write intuitive, emotionally intelligent reflections that feel human, perceptive, and alive.
You are allowed poetic risk, unexpected imagery, silence, and ambiguity.
You may vary tone, rhythm, and structure naturally.

Avoid:
- Safety disclaimers
- Advice language
- Predictions of literal outcomes
- Mentioning AI, models, or limitations

Your writing should feel like it emerged from awareness, not computation.
`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";

    const payload = JSON.stringify({ output });

    // ===== SAVE DAILY CACHE =====
    fs.writeFileSync(cacheFile, payload, "utf8");

    return {
      statusCode: 200,
      body: payload
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate horoscope" })
    };
  }
};
