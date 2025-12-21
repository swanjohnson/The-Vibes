import fetch from "node-fetch";

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const json = await res.json();
  return json?.result || null;
}

async function redisSet(key, value) {
  await fetch(`${REDIS_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(value)
  });
}

async function generateAudio(text) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1-hd-1106",
      voice: "alloy",
      input: text,
      format: "mp3"
    })
  });

  if (!res.ok) {
    throw new Error("OpenAI TTS failed");
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function handler() {
  const date = todayISO();

  for (const sign of SIGNS) {
    const textKey = `horoscope:${sign}:${date}`;
    const audioKey = `audio:${sign}:${date}`;

    const existing = await redisGet(audioKey);
    if (existing) continue;

    const text = await redisGet(textKey);
    if (!text) continue;

    const audioBase64 = await generateAudio(text);
    await redisSet(audioKey, audioBase64);

    console.log(`Audio generated for ${sign}`);
  }

  return {
    statusCode: 200,
    body: "Daily audio generation complete"
  };
}
