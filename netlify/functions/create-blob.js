const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  const store = getStore("daily-horoscopes");
  await store.set("init", "ok");

  return {
    statusCode: 200,
    body: "Blob store created"
  };
};
