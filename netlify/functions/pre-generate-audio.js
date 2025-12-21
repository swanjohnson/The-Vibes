const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
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
      voice: "shimmer",
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

export async function handler() {
  const date = todayISO();

  for (const sign of SIGNS) {
    const textKey = `horoscope:${sign}:${date}`;
    const audioKey = `audio:${sign}:${date}`;

    if (await redisGet(audioKey)) continue;

    const text = await redisGet(textKey);
    if (!text) continue;

    const audioBase64 = await generateAudio(text);
    await redisSet(audioKey, audioBase64);

    console.log(`Generated audio for ${sign}`);
  }

  return {
    statusCode: 200,
    body: "Daily audio generation complete"
  };
}
