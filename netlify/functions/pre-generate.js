export const handler = async () => {
  const ZODIAC_BATCHES = [
    ["aries", "taurus", "gemini", "cancer"],
    ["leo", "virgo", "libra", "scorpio"],
    ["sagittarius", "capricorn", "aquarius", "pisces"]
  ];

  // Always use UTC date for rollover safety
  const today = new Date().toISOString().split("T")[0];

  console.log(`🔮 Pre-generating daily horoscopes for ${today}`);

  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  if (!baseUrl) {
    console.error("❌ Missing site URL");
    return { statusCode: 500 };
  }

  for (let i = 0; i < ZODIAC_BATCHES.length; i++) {
    const batch = ZODIAC_BATCHES[i];
    console.log(`🔁 Starting batch ${i + 1}/${ZODIAC_BATCHES.length}`);

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
  }

  console.log("🎉 Daily horoscope pre-generation complete");
  return { statusCode: 200 };
};
