// netlify/functions/grok.js

exports.handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const sign = body.sign || "aries";

  const apiKey = process.env.XAI_API_KEY;

  const prompt = `
Write a daily horoscope for ${sign} with full creative freedom, in the natural style you use in the Grok app.

FORMAT (plain text only):
Daily:
Love:
Affirmation:

No markdown. No emojis.
`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        output: data.choices[0].message.content
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
