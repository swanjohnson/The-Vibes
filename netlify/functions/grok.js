// netlify/functions/grok.js
// Daily Horoscope Generator using Grok + Persistent Netlify Blobs cache

import { getStore } from "@netlify/blobs";

const API_KEY = process.env.XAI_API_KEY;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign || "aries";

    // ===== DAILY PERSISTENT CACHE KEY =====
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${sign}-${today}`;

    const store = getStore("daily-horoscopes");

    // ===== CACHE HIT (PERSISTENT ACROSS ALL INSTANCES) =====
    const cached = await store.get(cacheKey, { type: "json" });
    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify(cached)
      };
    }

    // ===== USER PROMPT (OPEN BUT GROUNDED) =====
    const prompt = `
Write a daily horoscope for ${sign}.

This should feel like how Grok responds in the Grok app when someone casually asks,
"what is my horoscope?"

Guidelines:
- Natural and conversational
- Confident and human
- Intuitive but grounded
- Clear and readable

Avoid:
- Overly poetic language
- Mystical symbolism
- Horoscope clichés
- Advice or instructions
- Predictions of outcomes

Use this structure as a guide (not rigid):

Daily:
Love:
Affirmation:

Plain text only.
No emojis.
No greetings.
No conclusions.
`;

    // ===== GROK API CALL =====
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `
You respond the way Grok does in the Grok app when answering a casual question.

Tone:
- Natural
- Conversational
- Confident
- Human

Style:
- Expressive but not poetic
- Intuitive without mysticism
- Clear without sounding formal
- Varied sentence rhythm

You may use light imagery if it feels natural,
but avoid flowery language or symbolism.

Avoid:
- Overly poetic or abstract writing
- Horoscope clichés
- Advice or directives
- Predictions of concrete outcomes

Do not mention AI, policies, or limitations.
`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content || "";

    const payload = { output };

    // ===== SAVE TO NETLIFY BLOBS (TRUE DAILY LOCK) =====
    await store.set(cacheKey, payload);

    return {
      statusCode: 200,
      body: JSON.stringify(payload)
    };

  } catch (err) {
    console.error("Grok error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate horoscope" })
    };
  }
};
