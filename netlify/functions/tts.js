// netlify/functions/tts.js
// ElevenLabs TTS – Matilda – Netlify-safe

exports.handler = async (event) => {
  try {
    const { sign, text } = JSON.parse(event.body || "{}");

    if (!text) {
      return {
        statusCode: 400,
        body: "Missing text for TTS"
      };
    }

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

    const audioBuffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg"
      },
      body: Buffer.from(audioBuffer).toString("base64"),
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
