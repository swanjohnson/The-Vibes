const { fetch } = require("undici");

function todayISO() {
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
  return json?.result || null;
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

async function generateAudio(text) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    throw new Error(await res.text());
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

exports.handler = async (event) => {
  console.log("🟢 TTS invoked");

  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign?.toLowerCase();

    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    const date = todayISO();
    const audioKey = `audio:${sign}:${date}`;

    // Cache first
    const cached = await redisGet(audioKey);
    if (cached) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cached,
        isBase64Encoded: true
      };
    }

    // Fetch text
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const textRes = await fetch(`${baseUrl}/.netlify/functions/grok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign })
    });

    const textData = await textRes.json();
    const reading = textData?.reading;

    if (!reading) {
      return { statusCode: 500, body: "No reading" };
    }

    // Generate audio
    const audio = await generateAudio(reading);
    await redisSet(audioKey, audio);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: audio,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 TTS error:", err);
    return { statusCode: 500, body: "TTS failure" };
  }
};
