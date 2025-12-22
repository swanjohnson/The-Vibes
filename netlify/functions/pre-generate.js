const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

const SIGNS = [
  "aries", "taurus", "gemini",
  "cancer", "leo", "virgo"
];

function todayUTC() {
  return new Date().toISOString().split("T")[0];
}

async function generateHoroscope(sign) {
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
- 80–90 words
- Conversational, like texting a friend
- Use contractions
- Light sass
- No mystic jargon

Content:
- Work or money
- Love or relationships
- Health or energy

Ending:
- Short two-second affirmation
- Encouraging, not cheesy
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
  return data?.choices?.[0]?.message?.content?.trim();
}

exports.handler = async () => {
  const date = todayUTC();

  for (const sign of SIGNS) {
    const key = `horoscope:${sign}:${date}`;

    const existing = await redis.get(key);
    if (existing?.reading) continue;

    const reading = await generateHoroscope(sign);
    if (!reading) continue;

    await redis.set(key, { sign, date, reading });
  }

  return {
    statusCode: 200,
    body: "Batch A complete"
  };
};
