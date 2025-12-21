const ZODIAC_BATCHES = [
  ["aries", "taurus", "gemini"],
  ["cancer", "leo", "virgo"],
  ["libra", "scorpio", "sagittarius"],
  ["capricorn", "aquarius", "pisces"]
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

exports.handler = async (event) => {
  const today = todayISO();
  const batchIndex = Number(event.queryStringParameters?.batch || 0);
  const batch = ZODIAC_BATCHES[batchIndex];

  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!baseUrl) {
    console.error("❌ Missing site URL");
    return { statusCode: 500 };
  }

  if (!batch) {
    console.log("🎉 All horoscope batches complete");
    return {
      statusCode: 200,
      body: "All batches complete"
    };
  }

  console.log(`🔮 Generating batch ${batchIndex + 1}/4`);

  for (const sign of batch) {
    try {
      const res = await fetch(`${baseUrl}/.netlify/functions/grok`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign,
          date: today,
          source: "pre-generate"
        })
      });

      if (!res.ok) {
        console.error(`❌ Failed: ${sign} (${res.status})`);
      } else {
        console.log(`✅ Generated: ${sign}`);
      }

    } catch (err) {
      console.error(`🔥 Error generating ${sign}:`, err.message);
    }
  }

  // 🔁 Trigger next batch
  const nextBatch = batchIndex + 1;
  if (ZODIAC_BATCHES[nextBatch]) {
    console.log(`➡️ Triggering batch ${nextBatch + 1}`);

    await fetch(
      `${baseUrl}/.netlify/functions/pre-generate?batch=${nextBatch}`
    );
  }

  return {
    statusCode: 200,
    body: `Batch ${batchIndex} complete`
  };
};
