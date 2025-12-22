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

  // Normalize JSON vs string
  if (typeof json.result === "string") {
    return json.result;
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

    // 1️⃣ Try cached audio (must be a string)
    const cachedAudio = await redisGet(audioKey);
    if (typeof cachedAudio === "string" && cachedAudio.length > 1000) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cachedAudio,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Get cached text
    const textRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/get/${textKey}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        }
      }
    );

    if (!textRes.ok) {
      throw new Error("Text fetch failed");
    }

    const textJson = await textRes.json();
    if (!textJson?.result) {
      throw new Error("No cached text");
    }

    const textObj =
      typeof textJson.result === "string"
        ? JSON.parse(textJson.result)
        : textJson.result;

    if (!textObj?.reading) {
      throw new Error("Invalid text object");
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
        voice: "alloy",
        input: textObj.reading,
        format: "mp3"
      })
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("OpenAI TTS error:", err);
      throw new Error("TTS failed");
    }

    const buffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // 4️⃣ Cache fresh audio
    await redisSet(audioKey, base64);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: base64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 TTS fatal:", err.message);

    // Fail gracefully, never crash UI
    return {
      statusCode: 500,
      body: "Audio unavailable"
    };
  }
};
