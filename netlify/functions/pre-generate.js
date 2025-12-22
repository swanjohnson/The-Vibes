const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const API_KEY = process.env.XAI_API_KEY;

const SIGNS = [
  "aries", "taurus", "gemini", "cancer",
  "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces"
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
- Aim for roughly 80–90 words
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

Ending:
- End with a very short, two-second affirmation
- Simple, believable, not cheesy

Do not:
- Use emojis
- Use headings
- Explain astrology
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
  const results = [];

  for (const sign of SIGNS) {
    const key = `horoscope:${sign}:${date}`;

    const existing = await redis.get(key);
    if (existing?.reading) {
      results.push({ sign, status: "exists" });
      continue;
    }

    const reading = await generateHoroscope(sign);
    if (!reading) {
      results.push({ sign, status: "failed" });
      continue;
    }

    await redis.set(key, { sign, date, reading });
    results.push({ sign, status: "generated" });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      date,
      results
    })
  };
};
