// netlify/functions/tts.js
// ElevenLabs TTS with DAILY SERVER-SIDE CACHING (no blobs)

const crypto = require("crypto");

// Simple in-memory cache (persists while function instance is warm)
const audioCache = global.audioCache || (global.audioCache = {});

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const sign = body.sign || "aries";

        const today = new Date().toISOString().split("T")[0];
        const cacheKey = `${sign}-${today}`;

        // ✅ 1. Return cached audio if available
        if (audioCache[cacheKey]) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "public, max-age=86400"
                },
                body: audioCache[cacheKey],
                isBase64Encoded: true
            };
        }

        // ✅ 2. Build text to speak
        const textToSpeak =
            `Here is your daily horoscope for ${sign}. ` +
            body.text ||
            `Your daily horoscope for ${sign}.`;

        // ✅ 3. Call ElevenLabs
        const response = await fetch(
            "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
            {
                method: "POST",
                headers: {
                    "xi-api-key": process.env.ELEVEN_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg"
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.45,
                        similarity_boost: 0.85
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error("ElevenLabs TTS failed");
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");

        // ✅ 4. Cache audio for the day
        audioCache[cacheKey] = base64Audio;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400"
            },
            body: base64Audio,
            isBase64Encoded: true
        };

    } catch (err) {
        console.error("TTS Error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
