// netlify/functions/pre-generate.js
// Daily background pre-generation using built-in fetch (Node 20)

const SIGNS = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

function getTodayUTC() {
  return new Date().toISOString().split("T")[0];
}

exports.handler = async () => {
  const today = getTodayUTC();

  console.log(`🔮 Pre-generating daily horoscopes for ${today}`);

  for (const sign of SIGNS) {
    try {
      await fetch(`${process.env.URL}/.netlify/functions/grok`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sign,
          date: today
        })
      });

      console.log(`✅ Generated: ${sign}`);
    } catch (err) {
      console.error(`❌ Failed: ${sign}`, err);
    }
  }

  return {
    statusCode: 200,
    body: "Daily horoscopes pre-generated"
  };
};
