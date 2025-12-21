import fetch from "node-fetch";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const json = await res.json();
  return json?.result || null;
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { sign, date } = JSON.parse(event.body || "{}");

    if (!sign || !date) {
      return { statusCode: 400, body: "Missing sign or date" };
    }

    const cacheKey = `audio:${sign}:${date}`;
    const audioBase64 = await redisGet(cacheKey);

    if (!audioBase64) {
      return { statusCode: 404, body: "Audio not ready yet" };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000"
      },
      body: audioBase64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("TTS serve error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
