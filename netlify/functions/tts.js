// STEP 1: fetch-only test (no Redis, no OpenAI)

exports.handler = async () => {
  console.log("🟢 TTS fetch-only test");

  try {
    const res = await fetch("https://example.com");
    const text = await res.text();

    return {
      statusCode: 200,
      body: `Fetch OK, length=${text.length}`
    };
  } catch (err) {
    console.error("❌ FETCH FAILED:", err);
    return {
      statusCode: 500,
      body: "Fetch failed"
    };
  }
};
