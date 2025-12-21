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

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const sign = body.sign?.toLowerCase();
    const date = todayISO(); // 🔑 FORCE CANONICAL DATE

    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    const audioKey = `audio:${sign}:${date}`;

    // 1️⃣ Try cache first
    const cachedAudio = await redisGet(audioKey);
    if (cachedAudio) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000"
        },
        body: cachedAudio,
        isBase64Encoded: true
      };
    }

    // 2️⃣ Fallback: fetch text from Grok
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const textRes = await fetch(`${baseUrl}/.netlify/functions/grok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign })
    });

    const textData = await textRes.json();
    const reading = textData?.reading;

    if (!reading) {
      return { statusCode: 404, body: "No reading available" };
    }

    // 3️⃣ Generate audio live
    const audioBase64 = await generateAudio(reading);

    // 4️⃣ Cache it for future users
    await redisSet(audioKey, audioBase64);

    // 5️⃣ Return it immediately
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
    console.error("TTS error:", err);
    return { statusCode: 500, body: "Audio error" };
  }
}
