// netlify/functions/grok.js
// Guaranteed daily auto-generation with Upstash caching

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = (body.sign || "virgo").toLowerCase();

    // Use UTC date for now (timezone-safe can be added next)
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `horoscope:${sign}:${today}`;

    /* ============================
       CACHE CHECK
    ============================ */
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify(cached)
      };
    }

    /* ============================
       GROK GENERATION
    ============================ */
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `
You are Grok writing a daily horoscope reading.

Tone:
- Casual, grounded, modern
- Natural and conversational
- Confident without being dramatic

Style:
- Longer, developed paragraphs
- Smooth emotional flow
- No repetition
- No headers inside text

Rules:
- Do not introduce yourself
- Do not add disclaimers
- Do not explain astrology
- Do not repeat section titles
- Do not use markdown or symbols
- Do not add closings or summaries

Output EXACTLY three sections, separated by ||| like this:

HOROSCOPE_TEXT ||| LOVE_TEXT ||| AFFIRMATION_TEXT
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
    const raw = data?.choices?.[0]?.message?.content || "";

    const [horoscope, love, affirmation] = raw
      .split("|||")
      .map(s => s?.trim())
      .filter(Boolean);

    if (!horoscope || !love || !affirmation) {
      throw new Error("Malformed Grok response");
    }

    const result = {
      sign,
      date: today,
      horoscope,
      love,
      affirmation
    };

    /* ============================
       SAVE TO CACHE
    ============================ */
    await redis.set(cacheKey, result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate daily reading" })
    };
  }
};
