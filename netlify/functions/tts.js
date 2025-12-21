function todayUTC() {
  return new Date().toISOString().split("T")[0];
}

async function redisGet(key) {
  const res = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    }
  );

  if (!res.ok) return null;

  const json = await res.json();
  if (!json?.result) return null;

  if (typeof json.result === "string") {
    try {
      return JSON.parse(json.result);
    } catch {
      return null;
    }
  }

  return json.result;
}

async function redisSet(key, value) {
  await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/set/${key}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(value)
    }
  );
}

exports.handler = async (event) => {
  try {
    const sign = event.queryStringParameters?.sign?.toLowerCase();
    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    const date = todayUTC();
    const textKey = `horoscope:${sign}:${date}`;
    const audioKey = `audio:${sign}:${date}`;

    // 1️⃣ Serve cached audio
    const cachedAudio = await redisGet(audioKey);
    if (cachedAudio) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cachedAudio,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Read cached text
    const cachedText = await redisGet(textKey);
    if (!cachedText?.reading) {
      return {
        statusCode: 500,
        body: "Daily horoscope text not found"
      };
    }

    // 3️⃣ Generate audio
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1-hd-1106",
        voice: "shimmer",
        input: cachedText.reading,
        format: "mp3"
      })
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("OpenAI TTS error:", err);
      return { statusCode: 500, body: "TTS failed" };
    }

    const buffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    await redisSet(audioKey, base64);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: base64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("TTS fatal error:", err);
    return { statusCode: 500, body: "TTS failure" };
  }
};
