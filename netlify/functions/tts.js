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

exports.handler = async (event) => {
  console.log("🟢 TTS production invoked");

  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign?.toLowerCase();

    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    const date = todayISO();
    const audioKey = `audio:${sign}:${date}`;

    // 1️⃣ Cache first
    const cached = await redisGet(audioKey);
    if (cached) {
      console.log("🎧 Serving cached audio");
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cached,
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

    const textData = await textRes.json();
    const reading = textData?.reading;

    if (!reading) {
      return { statusCode: 500, body: "No reading" };
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
        input: reading,
        format: "mp3"
      })
    });

    const buffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // 4️⃣ Cache EXACT base64
    await redisSet(audioKey, base64);
    console.log("💾 Cached audio:", audioKey);

    // 5️⃣ Return audio
    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: base64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 TTS error:", err);
    return { statusCode: 500, body: "TTS failure" };
  }
};
