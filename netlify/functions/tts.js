const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

exports.handler = async (event) => {
  const sign = event.queryStringParameters?.sign;
  const date = event.queryStringParameters?.date;

  if (!sign || !date) {
    return { statusCode: 400, body: "Missing sign or date" };
  }

  const audioKey = `audio:${sign}:${date}`;
  const textKey = `horoscope:${sign}:${date}`;

  const cachedAudio = await redis.get(audioKey);
  if (cachedAudio) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: cachedAudio,
      isBase64Encoded: true
    };
  }

  const textObj = await redis.get(textKey);
  if (!textObj?.reading) {
    return { statusCode: 404, body: "Text not found" };
  }

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

  const buffer = await ttsRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  await redis.set(audioKey, base64);

  return {
    statusCode: 200,
    headers: { "Content-Type": "audio/mpeg" },
    body: base64,
    isBase64Encoded: true
  };
};
