// netlify/functions/tts.js
// HARD ISOLATION TEST — NO FETCH, NO ENV, NO DEPENDENCIES

// This is a tiny silent MP3 (valid audio/mpeg)
const SILENT_MP3_BASE64 =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjMyLjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhAAAACAAADSAAAAETEFNRTMuOTlyAAAAAAA=";

exports.handler = async () => {
  console.log("✅ TTS ISOLATION FUNCTION EXECUTED");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store"
    },
    body: SILENT_MP3_BASE64,
    isBase64Encoded: true
  };
};
