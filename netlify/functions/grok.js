// netlify/functions/grok.js
// Grok horoscope with TRUE daily persistence via Upstash Redis

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

    // ===== DAILY CACHE KEY =====
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${sign}-${today}`;

    // ===== CHECK CACHE =====
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify({ output: cached })
      };
    }

    // ===== USER PROMPT (GROK-APP-LIKE) =====
    const prompt = `
Write a daily horoscope for ${sign}.

This should feel like how Grok responds in the Grok app when someone casually asks,
"what is my horoscope?"

Guidelines:
- Natural and conversational
- Confident and human
- Intuitive but grounded
- Clear and readable

Avoid:
- Overly poetic language
- Mystical symbolism
- Horoscope clichés
- Advice or instructions
- Predictions of outcomes

Structure (flexible):
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
You respond the way Grok does in the Grok app.

Tone:
- Natural
- Conversational
- Confident
- Human

Style:
- Expressive but not poetic
- Intuitive without mysticism
- Clear without sounding formal

Avoid:
- Horoscope clichés
- Advice or directives
- Abstract symbolism
- Predictions of concrete outcomes

Do not mention AI, policies, or limitations.
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

    // ===== SAVE TO REDIS (PERSISTENT DAILY LOCK) =====
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
