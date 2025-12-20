import { Redis } from "@upstash/redis";
import fetch from "node-fetch";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function handler(event) {
  try {
    const { sign, date, text } = JSON.parse(event.body || "{}");

    if (!sign || !date || !text) {
      return {
        statusCode: 400,
        body: "Missing sign, date, or text",
      };
    }

    const audioKey = `audio:${sign}:${date}`;

    // ✅ Check audio cache
    const cachedAudio = await redis.get(audioKey);
    if (cachedAudio) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
        },
        body: cachedAudio,
        isBase64Encoded: true,
      };
    }

    // 🔊 Generate audio (ElevenLabs)
    const elevenRes = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/a0Xwc8p0UGT1y2FQIO9p",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      throw new Error("ElevenLabs audio generation failed");
    }

    const buffer = Buffer.from(await elevenRes.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    // ✅ Store audio for the entire day
    await redis.set(audioKey, base64Audio, {
      ex: 60 * 60 * 24, // 24 hours
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
      body: base64Audio,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("TTS error:", err);
    return {
      statusCode: 500,
      body: "Audio generation failed",
    };
  }
}
