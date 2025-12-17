// netlify/functions/tts.js

import { getStore } from "netlify:blobs";

const ELEVEN_API_KEY = "process.env.YOUR_API_KEY";
const VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2";   // Matilda (change anytime)

// Persistent Blob storage (shared with Grok caching)
const store = getStore("horoscope-cache");

export async function handler(event) {
    const body = JSON.parse(event.body || "{}");
    const text = body.text || "";
    const sign = body.sign || "aries";

    const today = new Date().toISOString().split("T")[0];

    // The FINAL audio cache key — matches Grok's text cache key
    const audioKey = `${sign}-audio-${today}`;

    // 1. Try to return cached audio
    const cachedAudio = await store.get(audioKey, { type: "base64" });

    if (cachedAudio) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                audio: cachedAudio,
                cached: true
            })
        };
    }

    // 2. No cached audio — generate new MP3 using ElevenLabs
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVEN_API_KEY
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.48,
                        similarity_boost: 0.9,
                        style: 0.4
                    }
                })
            }
        );

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        // 3. Save generated audio to Blob storage
        await store.set(audioKey, audioBase64);

        return {
            statusCode: 200,
            body: JSON.stringify({
                audio: audioBase64,
                cached: false
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
