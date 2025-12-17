// netlify/functions/grok.js

export async function handler(event) {
  const body = JSON.parse(event.body || "{}");
  const sign = body.sign || "aries";

  const apiKey = process.env.XAI_API_KEY;

  const prompt = `
Write a daily horoscope for ${sign} in the same expressive, free-flowing style you use in the Grok app.

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
        "Authorization": \`Bearer ${apiKey}\`
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ output })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
