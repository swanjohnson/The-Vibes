const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo"];
const XAI_KEY = process.env.XAI_API_KEY;

function todayCST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function generate(sign) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      temperature: 1.1,
      top_p: 0.95,
      messages: [
        {
          role: "system",
          content: process.env.GROK_PROMPT.replace("{SIGN}", sign)
        },
        {
          role: "user",
          content: `What's today like for ${sign}?`
        }
      ]
    })
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

exports.handler = async () => {
  const date = todayCST();

  for (const sign of SIGNS) {
    const key = `horoscope:${sign}:${date}`;
    if (await redis.get(key)) continue;

    const reading = await generate(sign);
    if (!reading) continue;

    await redis.set(key, { sign, date, reading });
  }

  return { statusCode: 200, body: "Pre-generate A complete" };
};
