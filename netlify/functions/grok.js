// netlify/functions/grok.js
// Daily horoscope using Grok with Upstash Redis persistence

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign || "aries";

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

    // ----- Minimal user prompt -----
    const prompt = `
What is my horoscope for today if I am ${sign}?

Please include:
Daily:
Love:
Affirmation:
`;

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
You are Grok responding naturally to a casual user question.

Answer the way you would in the Grok app.
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
