/* ============================
   GET SIGN FROM URL
============================ */
const params = new URLSearchParams(window.location.search);
const sign = (params.get("sign") || "aries").toLowerCase();

const validSigns = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

if (!validSigns.includes(sign)) {
  document.getElementById("zodiac-title").innerText = "Invalid Sign";
  document.getElementById("daily-horoscope").innerText =
    "Please scan your bracelet again.";
  throw new Error("Invalid zodiac sign");
}

document.getElementById("zodiac-title").innerText =
  sign.charAt(0).toUpperCase() + sign.slice(1);

document.getElementById("date").innerText =
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

/* ============================
   LOAD HOROSCOPE (SINGLE READING)
============================ */
async function loadHoroscope() {
  const res = await fetch("/.netlify/functions/grok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign })
  });

  const data = await res.json();
  let text = data.output || "";

  // ---- Clean section labels (remove colons, keep words)
  text = text
    .replace(/\bDaily:\s*/gi, "Daily\n")
    .replace(/\bLove:\s*/gi, "\nLove\n")
    .replace(/\bAffirmation:\s*/gi, "\nAffirmation\n");

  document.getElementById("daily-horoscope").innerText = text;
}

loadHoroscope();

/* ============================
   ELEVENLABS AUDIO
============================ */
let audio = null;

async function playHoroscopeAudio() {
  const text = document.getElementById("daily-horoscope").innerText;

  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sign,
      text
    })
  });

  if (!res.ok) {
    throw new Error("Failed to load audio");
  }

  const arrayBuffer = await res.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);

  audio = new Audio(url);
  audio.play();
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}
