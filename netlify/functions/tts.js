import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const handler = async (event) => {
  try {
    const { sign, date, text } = JSON.parse(event.body || "{}");

    if (!sign || !date || !text) {
      return {
        statusCode: 400,
        body: "Missing sign, date, or text",
      };
    }

    const audioKey = `audio:${sign}:${date}`;

    /* ============================
       CHECK AUDIO CACHE
    ============================ */
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

    /* ============================
       GENERATE AUDIO (ElevenLabs)
    ============================ */
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      throw new Error(`ElevenLabs error: ${errText}`);
    }

    const buffer = Buffer.from(await elevenRes.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    /* ============================
       SAVE AUDIO FOR THE DAY
    ============================ */
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
};
