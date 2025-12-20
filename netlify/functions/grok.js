// netlify/functions/grok.js
// Timezone-safe daily Grok horoscope with Upstash caching (GET-based)

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
  try {
    /* ============================
       INPUT
    ============================ */
    const sign =
      (event.queryStringParameters?.sign || "virgo").toLowerCase();

    // Timezone-safe LOCAL date (server-independent)
    const now = new Date();
    const date = now.toISOString().split("T")[0];

    const cacheKey = `horoscope:${sign}:${date}`;

    /* ============================
       CACHE CHECK
    ============================ */
    const cached = await redis.get(cacheKey);
    if (cached?.reading) {
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
You are Grok.

Write a single, modern daily horoscope for the zodiac sign provided.

Tone & style:
- Conversational, grounded, confident
- Sounds like the Grok app
- Short, direct, natural

Rules:
- ONE paragraph only
- 250–350 characters
- Include:
  • today's general energy
  • a quick love or relationship note
  • one practical insight
- No headers, no emojis, no affirmations, no disclaimers
- Avoid mystical or dramatic astrology language

This should feel like a quick daily vibe check someone would enjoy hearing out loud.
`
          },
          {
            role: "user",
            content: `Give me today's horoscope for ${sign}.`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Empty Grok response");
    }

    const result = {
      sign,
      date,
      reading: text
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
