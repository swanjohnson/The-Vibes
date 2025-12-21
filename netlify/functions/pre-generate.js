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
  const batchIndex = Number(event.queryStringParameters?.batch || 0);
  const batch = ZODIAC_BATCHES[batchIndex];

  if (!batch) {
    console.log("ℹ️ No batch for index", batchIndex);
    return { statusCode: 200 };
  }

  const today = todayISO();
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

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
        console.error(`❌ Failed: ${sign}`);
      } else {
        console.log(`✅ Generated: ${sign}`);
      }
    } catch (err) {
      console.error(`🔥 Error for ${sign}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: `Batch ${batchIndex} done`
  };
};
