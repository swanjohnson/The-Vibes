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

  if (!res.ok) {
    throw new Error("Redis GET failed");
  }

  const json = await res.json();
  return json?.result || null;
}

async function redisSet(key, value) {
  const res = await fetch(
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

  if (!res.ok) {
    throw new Error("Redis SET failed");
  }
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
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const sign = body.sign?.toLowerCase();

    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    const date = todayISO();
    const audioKey = `audio:${sign}:${date}`;

    // 1️⃣ Try cache
    const cachedAudio = await redisGet(audioKey);
    if (cachedAudio) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cachedAudio,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Fetch text
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const textRes = await fetch(`${baseUrl}/.netlify/functions/grok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign })
    });

    if (!textRes.ok) {
      throw new Error("Failed to fetch text");
    }

    const textData = await textRes.json();
    const reading = textData?.reading;

    if (!reading) {
      throw new Error("No reading returned");
    }

    // 3️⃣ Generate audio
    const audioBase64 = await generateAudio(reading);

    // 4️⃣ Cache it
    await redisSet(audioKey, audioBase64);

    // 5️⃣ Return it
    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: audioBase64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("TTS FUNCTION ERROR:", err);
    return {
      statusCode: 500,
      body: err.message || "TTS failure"
    };
  }
};
