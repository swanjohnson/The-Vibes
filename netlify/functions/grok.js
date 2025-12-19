// netlify/functions/grok.js
// Grok daily horoscope with Upstash Redis caching

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

    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${sign}-${today}`;

    // ----- Cache check -----
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify({ output: cached })
      };
    }

    // ----- Grok request -----
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
You are Grok writing a daily horoscope reading.

Tone:
- Casual, grounded, modern
- Confident but not dramatic
- Conversational, like a personal message

Style:
- Write in complete, flowing thoughts
- Develop each idea instead of rushing it
- Let the reading breathe emotionally
- Astrology references are allowed naturally
- Speak directly to the reader

Guidance:
- Expand on the main emotional theme of the day
- Include nuance, reflection, and momentum
- Avoid short or punchy summaries
- Avoid being overly poetic or mystical

Rules:
- Do not explain astrology
- Do not include disclaimers
- Do not mention science or accuracy
- Do not ask questions
- Do not add a closing remark
- Do not introduce yourself
- Do not use markdown formatting or symbols


Structure:
Horoscope:
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

    await redis.set(cacheKey, output);

    return {
      statusCode: 200,
      body: JSON.stringify({ output })
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate reading" })
    };
  }
};
