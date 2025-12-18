// netlify/functions/tts.js
// ElevenLabs TTS with DAILY CACHE (Grok-style)

const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  try {
    const { sign, text } = JSON.parse(event.body || "{}");

    if (!text || !sign) {
      return { statusCode: 400, body: "Missing sign or text" };
    }

    const today = new Date().toISOString().split("T")[0];
    const cacheFile = path.join("/tmp", `tts-${sign}-${today}.mp3`);

    // 1️⃣ CHECK AUDIO CACHE
    if (fs.existsSync(cacheFile)) {
      const cachedAudio = fs.readFileSync(cacheFile);
      return {
        statusCode: 200,
        headers: { "Content-Type": "audio/mpeg" },
        body: cachedAudio.toString("base64"),
        isBase64Encoded: true
      };
    }

    // 2️⃣ CALL ELEVENLABS (ONLY ON CACHE MISS)
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/XrExE9yKIg1WjnnlVkGX",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 3️⃣ SAVE AUDIO CACHE
    fs.writeFileSync(cacheFile, audioBuffer);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: audioBuffer.toString("base64"),
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("TTS error:", err);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
