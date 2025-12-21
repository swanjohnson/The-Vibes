// STEP 2: OpenAI TTS–only test (no Redis, no audio response)

exports.handler = async () => {
  console.log("🟢 TTS OpenAI-only test");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1-hd-1106",
        voice: "alloy",
        input: "This is a short test of the OpenAI text to speech system.",
        format: "mp3"
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ OpenAI response error:", err);
      return {
        statusCode: 500,
        body: "OpenAI TTS request failed"
      };
    }

    const buffer = await res.arrayBuffer();
    console.log("🎧 Audio byte length:", buffer.byteLength);

    return {
      statusCode: 200,
      body: `OpenAI TTS OK, bytes=${buffer.byteLength}`
    };

  } catch (err) {
    console.error("🔥 OpenAI TTS exception:", err);
    return {
      statusCode: 500,
      body: "OpenAI TTS exception"
    };
  }
};

