// netlify/functions/grok.js
// Daily horoscope using Grok with Upstash Redis persistence
// Tuned to match Grok app tone (casual, modern, vibe-based)

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = (body.sign || "aries").toLowerCase();

    // ----- Daily cache key -----
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${sign}-${today}`;

    // ----- Check cache -----
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify({ output: cached })
      };
    }

    // ----- Grok API call -----
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
You are Grok writing a casual daily horoscope.

Tone:
- Natural
- Modern
- Confident
- Conversational, like a vibe check

Style:
- Speak directly to the reader
- Use present-day language
- Astrology references are allowed naturally
- Express insight without sounding mystical or formal

Rules:
- Do not explain what astrology is
- Do not include disclaimers
- Do not mention science or accuracy
- Do not ask questions
- Do not add a closing remark
- Do not introduce yourself

Output format:
Daily:
Love:
Affirmation:
`
          },
          {
            role: "user",
            content: `Zodiac sign: ${sign}`
          }
        ]
      })
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";

    // ----- Save for the day -----
    await redis.set(cacheKey, output);

    return {
      statusCode: 200,
      body: JSON.stringify({ output })
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate horoscope" })
    };
  }
};
