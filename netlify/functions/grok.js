// netlify/functions/grok.js
// Timezone-safe daily Grok horoscope with Upstash caching

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
    const date = body.date; // USER-LOCAL DATE (timezone-safe)

    if (!date) {
      throw new Error("Missing date for timezone-safe rollover");
    }

    const cacheKey = `horoscope:${sign}:${date}`;

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
You are Grok.

Write a single, modern daily horoscope for the zodiac sign provided.

Tone & style:
- Conversational, grounded, and confident
- Casual but thoughtful
- Sounds like the Grok app, not traditional astrology
- Natural and human, not poetic or mystical

Content rules:
- ONE paragraph only
- Keep the response between 250 and 350 characters total
- Naturally include:
  • today's general energy or focus
  • a brief note on love or relationships
  • one practical or real-world insight
- Do NOT use section headers, bullet points, affirmations, emojis, or disclaimers
- Avoid astrology mechanics, spiritual language, or dramatic phrasing

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
      text
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
