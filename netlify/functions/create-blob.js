import { getStore } from "@netlify/blobs";

export const handler = async () => {
  const store = getStore("daily-horoscopes");

  await store.set("init", "ok");

  return {
    statusCode: 200,
    body: "Blob store created"
  };
};
