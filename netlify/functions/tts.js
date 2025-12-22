const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

exports.handler = async (event) => {
  try {
    const sign = event.queryStringParameters?.sign?.toLowerCase();
    const date = event.queryStringParameters?.date;

    if (!sign || !date) {
      return {
        statusCode: 400,
        body: "Missing sign or date"
      };
    }

    const textKey = `horoscope:${sign}:${date}`;
    const audioKey = `audio:${sign}:${date}`;

    // 1️⃣ Return cached audio if exists
    const cachedAudio = await redis.get(audioKey);
    if (typeof cachedAudio === "string" && cachedAudio.length > 1000) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cachedAudio,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Get cached text
    const textObj = await redis.get(textKey);
    if (!textObj?.reading) {
      return {
        statusCode: 404,
        body: "Horoscope text not found"
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
        voice: "alloy",
        input: textObj.reading,
        format: "mp3"
      })
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("TTS error:", err);
      throw new Error("TTS failed");
    }

    const buffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // 4️⃣ Cache audio
    await redis.set(audioKey, base64);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: base64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 Audio error:", err.message);
    return {
      statusCode: 500,
      body: "Audio unavailable"
    };
  }
};
