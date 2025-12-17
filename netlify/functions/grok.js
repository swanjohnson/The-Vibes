// netlify/functions/grok.js

const fs = require("fs");
const path = require("path");

const API_KEY = process.env.XAI_API_KEY;

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const sign = body.sign || "aries";

        const today = new Date().toISOString().split("T")[0];
        const cacheFile = path.join("/tmp", `${sign}-${today}.json`);

        // 1️⃣ Check cache
        if (fs.existsSync(cacheFile)) {
            const cached = fs.readFileSync(cacheFile, "utf8");
            return {
                statusCode: 200,
                body: cached
            };
        }

        // 2️⃣ Build free-form Grok prompt
        const prompt = `
Write a daily horoscope for ${sign} with complete creative freedom, exactly like you would in the Grok app.

STYLE RULES:
- Be expressive, intuitive, and human
- Avoid predictable openings
- Do NOT repeat previous patterns
- Tone can be poetic, insightful, grounded, or surprising
- No emojis, no markdown

FORMAT (plain text only):
Daily:
Love:
Affirmation:
`;

        const response = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-3-mini",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        const output = data?.choices?.[0]?.message?.content || "";

        const payload = JSON.stringify({ output });

        // 3️⃣ Save cache for the day
        fs.writeFileSync(cacheFile, payload, "utf8");

        return {
            statusCode: 200,
            body: payload
        };

    } catch (err) {
        console.error("Grok error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate horoscope" })
        };
    }
};
