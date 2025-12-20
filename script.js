/* ============================
   SIGN (URL → STORAGE → DEFAULT)
============================ */
const params = new URLSearchParams(window.location.search);

let sign =
  params.get("sign") ||
  localStorage.getItem("lastSign") ||
  "virgo";

sign = sign.toLowerCase();
localStorage.setItem("lastSign", sign);

const validSigns = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

if (!validSigns.includes(sign)) {
  document.getElementById("daily-horoscope").innerText =
    "Invalid zodiac sign.";
  throw new Error("Invalid sign");
}

/* ============================
   USER-LOCAL DATE (TIMEZONE SAFE)
============================ */
function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const localDateKey = getLocalDateKey();

/* ============================
   SET HEADER (SIGN + DATE)
============================ */
const zodiacEl = document.getElementById("zodiac-title");
const dateEl = document.getElementById("date");

if (zodiacEl) {
  zodiacEl.innerText =
    sign.charAt(0).toUpperCase() + sign.slice(1);
}

if (dateEl) {
  dateEl.innerText =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
}

/* ============================
   LOAD DAILY READING (AUTO)
============================ */
async function loadDailyHoroscope() {
  try {
    const res = await fetch("/.netlify/functions/grok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sign,
        date: localDateKey
      })
    });

    if (!res.ok) {
      throw new Error("Failed to fetch daily reading");
    }

    const data = await res.json();

    if (!data.text) {
      throw new Error("Missing daily reading text");
    }

    document.getElementById("daily-horoscope").innerText = data.text;

  } catch (err) {
    console.error("Daily load error:", err);
    document.getElementById("daily-horoscope").innerText =
      "Today’s vibe is still forming. Please refresh.";
  }
}

loadDailyHoroscope();

/* ============================
   ELEVENLABS AUDIO (PLAY ONLY)
============================ */
let audio = null;
let audioUrl = null;

async function playHoroscopeAudio() {
  try {
    stopAudio();

    const text =
      document.getElementById("daily-horoscope").innerText;

    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sign,
        date: localDateKey,
        text
      })
    });

    if (!res.ok) {
      throw new Error("Audio generation failed");
    }

    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "audio/mpeg" });

    audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);
    audio.playsInline = true;

    await audio.play();

  } catch (err) {
    console.error("Audio error:", err);
    alert("Tap again to play audio.");
  }
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
}
