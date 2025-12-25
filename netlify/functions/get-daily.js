const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

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

exports.handler = async (event) => {
  const sign = event.queryStringParameters?.sign?.toLowerCase();
  if (!sign) {
    return { statusCode: 400, body: "Missing sign" };
  }

  const date = todayCST();
  const key = `horoscope:${sign}:${date}`;

  const cached = await redis.get(key);
  if (cached) {
    return {
      statusCode: 200,
      body: JSON.stringify(cached)
    };
  }

  const reading = await generate(sign);
  if (!reading) {
    return { statusCode: 500, body: "Generation failed" };
  }

  const result = { sign, date, reading };
  await redis.set(key, result);

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
