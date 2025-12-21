const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

function todayUTC() {
  return new Date().toISOString().split("T")[0];
}

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    const sign = (
      body.sign ||
      event.queryStringParameters?.sign ||
      "virgo"
    ).toLowerCase();

    const date = todayUTC();
    const cacheKey = `horoscope:${sign}:${date}`;

    // 1️⃣ Return cached reading if it exists
    const cached = await redis.get(cacheKey);
    if (cached?.reading) {
      return {
        statusCode: 200,
        body: JSON.stringify(cached)
      };
    }

    // 2️⃣ Call Grok
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

Write a short, casual, one-paragraph daily horoscope in the same voice you use in the Grok app.

Style:
- Aim for roughly 80–90 words (no need to count exactly)
- Super conversational, like texting a friend
- Use contractions
- A tiny bit of sass is okay
- Everyday language only
- No mystic or cosmic jargon
- No fluff

Content:
- Briefly touch on work or money
- Briefly touch on love or relationships
- Briefly touch on health, energy, or the body
- Keep everything practical and grounded

Ending:
- End with a very short, two-second affirmation
- It should sound like a quick pep talk someone would actually repeat to themselves
- Keep it simple, believable, and not cheesy

Tone:
- Encouraging but real
- Confident, not preachy
- Observant, not inspirational-poster energy

Do not:
- Use emojis
- Use headings
- Explain astrology
- Sound like a traditional horoscope column
`
          },
          {
            role: "user",
            content: `What's today like for ${sign}?`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Empty Grok response");
    }

    const result = { sign, date, reading: text };

    // 3️⃣ Cache once per day
    await redis.set(cacheKey, result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate daily reading"
      })
    };
  }
};
