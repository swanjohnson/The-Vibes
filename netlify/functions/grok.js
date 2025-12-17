// netlify/functions/grok.js

import { getStore } from "netlify:blobs";

const store = getStore("horoscope-cache");
const apiKey = "process.env.XAI_API_KEY";

export async function handler(event) {
    const body = JSON.parse(event.body || "{}");
    const sign = body.sign || "aries";

    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${sign}-${today}`;

    // 1. Check Blob cache
    const cached = await store.get(cacheKey, { type: "text" });
    if (cached) {
        return {
            statusCode: 200,
            body: JSON.stringify({ output: cached, cached: true })
        };
    }

    // 2. Build improved free-flowing prompt
    const prompt =
`Write a daily horoscope for ${sign} in the same expressive, surprising, witty, free-flowing style you use in the Grok app.

STYLE:
- Use full creative freedom.
- Vary tone, avoid repeating previous patterns.
- You may be poetic, humorous, philosophical, bold, cosmic, dramatic, or blunt.
- Avoid predictable openings like “As a Virgo…”
- No clichés unless intentional.

STRICT FORMAT (very important):
Daily:
Love:
Affirmation:

RULES:
- NO markdown.
- NO ### headings.
- NO **bold**.
- NO emojis.
- Plain text only.
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
        const output = data?.choices?.[0]?.message?.content || "Error generating horoscope.";

        // 3. Save to Netlify Blobs (persistent cache)
        await store.set(cacheKey, output);

        return {
            statusCode: 200,
            body: JSON.stringify({ output, cached: false })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
