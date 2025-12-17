// netlify/functions/tts.js

const fs = require("fs");
const path = require("path");

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "NihRgaLj2HWAjvZ5XNxl"; // Matilda

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { sign, text } = body;

        if (!text) {
            return { statusCode: 400, body: "Missing text" };
        }

        const today = new Date().toISOString().split("T")[0];
        const fileName = `${sign}-${today}.mp3`;
        const filePath = path.join("/tmp", fileName);

        // 1️⃣ If audio already exists today → reuse it
        if (fs.existsSync(filePath)) {
            const audio = fs.readFileSync(filePath);
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "public, max-age=86400"
                },
                body: audio.toString("base64"),
                isBase64Encoded: true
            };
        }

        // 2️⃣ Generate new ElevenLabs audio
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": ELEVEN_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.55,
                        similarity_boost: 0.7
                    }
                })
            }
        );

        const buffer = Buffer.from(await response.arrayBuffer());

        // 3️⃣ Save audio for the day
        fs.writeFileSync(filePath, buffer);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "audio/mpeg"
            },
            body: buffer.toString("base64"),
            isBase64Encoded: true
        };

    } catch (err) {
        console.error("TTS error:", err);
        return {
            statusCode: 500,
            body: "Audio generation failed"
        };
    }
};
