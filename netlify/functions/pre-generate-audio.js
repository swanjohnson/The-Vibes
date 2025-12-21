const ZODIAC_BATCHES = [
  ["aries", "taurus", "gemini"],
  ["cancer", "leo", "virgo"],
  ["libra", "scorpio", "sagittarius"],
  ["capricorn", "aquarius", "pisces"]
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export const handler = async () => {
  const today = todayISO();
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  console.log(`🔍 Inspecting Grok response for ${today}`);

  for (const sign of ZODIAC_BATCHES[0]) {
    const res = await fetch(`${baseUrl}/.netlify/functions/grok`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign, date: today })
    });

    const data = await res.json();

    console.log(`🧠 Grok response for ${sign}:`, JSON.stringify(data, null, 2));
  }

  return {
    statusCode: 200,
    body: "Logged Grok response shape"
  };
};
