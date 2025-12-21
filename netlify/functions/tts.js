exports.handler = async (event) => {
  console.log("🟢 TTS function invoked");

  try {
    console.log("ENV CHECK:", {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasRedisURL: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
    });

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const sign = body.sign?.toLowerCase();

    console.log("SIGN RECEIVED:", sign);

    if (!sign) {
      return { statusCode: 400, body: "Missing sign" };
    }

    throw new Error("FORCED STOP — ENV LOGGED");

  } catch (err) {
    console.error("🔥 TTS DEBUG ERROR:", err.message);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
