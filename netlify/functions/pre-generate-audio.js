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
    const err = await res.text();
    throw new Error(err);
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
        Authorization: `Bearer ${process.env.UPSTASH_REST_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(value)
    }
  );
}

export const handler = async () => {
  const today = todayISO();
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!baseUrl) {
    console.error("❌ Missing site URL");
    return { statusCode: 500 };
  }

  console.log(`🔊 Pre-generating audio for ${today}`);

  for (let i = 0; i < ZODIAC_BATCHES.length; i++) {
    console.log(`🔁 Audio batch ${i + 1}/${ZODIAC_BATCHES.length}`);

    for (const sign of ZODIAC_BATCHES[i]) {
      try {
        const res = await fetch(`${baseUrl}/.netlify/functions/grok`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sign,
            date: today,
            source: "audio-pre-generate"
          })
        });

        if (!res.ok) {
          console.error(`❌ Failed to fetch vibe for ${sign}`);
          continue;
        }

        const data = await res.json();

        // 🔑 THIS IS THE FIX
        const text = data?.vibe;

        if (!text) {
          console.error(`❌ No vibe returned for ${sign}`);
          continue;
        }

        const audioBase64 = await generateAudio(text);
        const audioKey = `audio:${sign}:${today}`;

        await redisSet(audioKey, audioBase64);
        console.log(`🔊 Audio generated for ${sign}`);

      } catch (err) {
        console.error(`🔥 Error generating audio for ${sign}:`, err.message);
      }
    }
  }

  console.log("🎉 Daily audio pre-generation complete");
  return { statusCode: 200 };
};
