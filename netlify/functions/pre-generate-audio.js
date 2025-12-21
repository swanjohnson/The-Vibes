const ZODIAC_BATCHES = [
  ["aries", "taurus", "gemini"],
  ["cancer", "leo", "virgo"],
  ["libra", "scorpio", "sagittarius"],
  ["capricorn", "aquarius", "pisces"]
];

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

  if (!res.ok) throw new Error(await res.text());

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export const handler = async (event) => {
  const today = todayISO();
  const batchIndex = Number(event.queryStringParameters?.batch || 0);
  const batch = ZODIAC_BATCHES[batchIndex];

  if (!batch) {
    return { statusCode: 200, body: "All audio batches complete" };
  }

  for (const sign of batch) {
    const textKey = `horoscope:${sign}:${today}`;
    const audioKey = `audio:${sign}:${today}`;

    try {
      const cachedText = await redisGet(textKey);
      if (!cachedText?.reading) continue;

      const audio = await generateAudio(cachedText.reading);
      await redisSet(audioKey, audio);

      console.log(`🔊 Audio ready for ${sign}`);
    } catch (err) {
      console.error(`Audio error for ${sign}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: `Batch ${batchIndex} complete`
  };
};
