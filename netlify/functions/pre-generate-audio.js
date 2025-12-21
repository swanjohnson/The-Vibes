const ZODIAC_BATCHES = [
  ["aries", "taurus", "gemini"],
  ["cancer", "leo", "virgo"],
  ["libra", "scorpio", "sagittarius"],
  ["capricorn", "aquarius", "pisces"]
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
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

export const handler = async (event) => {
  const today = todayISO();
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  const batchIndex = Number(event.queryStringParameters?.batch || 0);
  const batch = ZODIAC_BATCHES[batchIndex];

  if (!batch) {
    return {
      statusCode: 200,
      body: "All audio batches complete"
    };
  }

  console.log(`🔊 Generating audio batch ${batchIndex + 1}/4`);

  for (const sign of batch) {
    try {
      const res = await fetch(`${baseUrl}/.netlify/functions/grok`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign, date: today })
      });

      const data = await res.json();
      const reading = data?.reading;

      if (!reading) {
        console.error(`❌ No reading for ${sign}`);
        continue;
      }

      const audioKey = `audio:${sign}:${today}`;
      const audioBase64 = await generateAudio(reading);

      await redisSet(audioKey, audioBase64);
      console.log(`🔊 Audio generated for ${sign}`);

    } catch (err) {
      console.error(`🔥 Audio error for ${sign}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: `Batch ${batchIndex} complete`
  };
};
