const SIGNS = [
  "aries","taurus","gemini","cancer",
  "leo","virgo","libra","scorpio",
  "sagittarius","capricorn","aquarius","pisces"
];

const BATCH_SIZE = 3;

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
    const err = await res.text();
    throw new Error(err);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function handler(event) {
  const date = todayISO();
  const batch = Number(event.queryStringParameters?.batch || 0);
  const start = batch * BATCH_SIZE;
  const batchSigns = SIGNS.slice(start, start + BATCH_SIZE);

  if (batchSigns.length === 0) {
    return {
      statusCode: 200,
      body: "All audio batches complete"
    };
  }

  for (const sign of batchSigns) {
    // 🔑 THIS IS THE IMPORTANT LINE
    const textKey = `vibe:${sign}:${date}`;
    const audioKey = `audio:${sign}:${date}`;

    if (await redisGet(audioKey)) continue;

    const text = await redisGet(textKey);
    if (!text) {
      console.log(`No text found for ${sign}, skipping audio`);
      continue;
    }

    const audioBase64 = await generateAudio(text);
    await redisSet(audioKey, audioBase64);

    console.log(`Audio generated for ${sign}`);
  }

  return {
    statusCode: 200,
    body: `Batch ${batch} complete`
  };
}
