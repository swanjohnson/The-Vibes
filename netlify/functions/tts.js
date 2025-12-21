exports.handler = async () => {
  console.log("🟢 TTS direct-return test");

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
        input: "This is a direct audio return test from OpenAI text to speech.",
        format: "mp3"
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ OpenAI error:", err);
      return { statusCode: 500, body: "OpenAI failed" };
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    console.log("🎧 Audio bytes:", buffer.byteLength);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg"
      },
      body: base64,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("🔥 TTS crash:", err);
    return {
      statusCode: 500,
      body: "TTS exception"
    };
  }
};
