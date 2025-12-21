function todayUTC() {
  return new Date().toISOString().split("T")[0];
}

async function redisGet(key) {
  const res = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      }
    }
  );

  if (!res.ok) return null;

  const json = await res.json();
  if (!json?.result) return null;

  // 🔑 CRITICAL FIX: normalize Redis value
  if (typeof json.result === "string") {
    try {
      return JSON.parse(json.result);
    } catch {
      return null;
    }
  }

  return json.result;
}

exports.handler = async (event) => {
  try {
    const sign =
      event.queryStringParameters?.sign?.toLowerCase() || "virgo";

    const key = `horoscope:${sign}:${todayUTC()}`;
    const cached = await redisGet(key);

    if (!cached?.reading) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          reading: "Today's vibe is still forming. Check back shortly."
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(cached)
    };

  } catch (err) {
    console.error("get-daily error:", err);
    return { statusCode: 500 };
  }
};
