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
    const err = await res.text();
    console.error("❌ OpenAI TTS error:", err);
    return null;
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

exports.handler = async (event) => {
  console.log("🟢 TTS production invoked");

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

    // 1️⃣ Serve cached audio if present
    const cached = await redisGet(audioKey);
    if (cached) {
      console.log("🎧 Serving cached audio:", audioKey);
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cached,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Fetch text from Grok
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const textRes = await fetch(`${baseUrl}/.netlify/functions/grok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign })
    });

    if (!textRes.ok) {
      console.error("❌ Failed to fetch Grok text");
      return { statusCode: 500, body: "Text fetch failed" };
    }

    const textData = await textRes.json();
    const reading = textData?.reading;

    if (!reading) {
      console.error("❌ No reading returned");
      return { statusCode: 500, body: "No reading" };
    }

    // 3️⃣ Generate audio
    const audioBase64 = await generateAudio(reading);
    if (!audioBase64) {
      return { statusCode: 500, body: "Audio generation failed" };
    }

    // 4️⃣ Cache audio
    await redisSet(audioKey, audioBase64);
    console.log("💾 Cached audio:", audioKey);

    // 5️⃣ Return audio
    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: audioBase64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 TTS fatal error:", err);
    return { statusCode: 500, body: "TTS failure" };
  }
};
