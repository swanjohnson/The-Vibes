export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { sign, date } = JSON.parse(event.body || "{}");

    if (!sign || !date) {
      return { statusCode: 400, body: "Missing sign or date" };
    }

    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    const cacheKey = `audio:${sign}:${date}`;

    const redisRes = await fetch(`${REDIS_URL}/get/${cacheKey}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`
      }
    });

    const redisJson = await redisRes.json();
    const audioBase64 = redisJson?.result;

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
