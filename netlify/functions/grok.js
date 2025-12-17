// netlify/functions/grok.js

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign || "aries";

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error("XAI_API_KEY is missing");
    }

    const prompt = `
Write a daily horoscope for ${sign} with full creative freedom, in the natural style used in the Grok app.

FORMAT (plain text only):
Daily:
Love:
Affirmation:

No markdown. No emojis.
`;

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

    const rawText = await response.text();
    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("xAI returned non-JSON:", rawText);
      throw new Error("Invalid JSON from xAI");
    }

    // 🔥 THIS IS THE CRITICAL GUARD
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Unexpected xAI response:", data);
      throw new Error("Unexpected xAI response shape");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        output: data.choices[0].message.content
      })
    };

  } catch (err) {
    console.error("Grok function error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
