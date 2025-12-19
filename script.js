/* ============================
   SIGN FROM URL (BULLETPROOF)
============================ */
const params = new URLSearchParams(window.location.search);

let sign =
  params.get("sign") ||
  localStorage.getItem("lastSign") ||
  "virgo"; // safe default

sign = sign.toLowerCase();

// persist sign so refreshes work
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
   SET ZODIAC + DATE (FIXED)
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
   LOAD GROK
============================ */
async function loadHoroscope() {
  const res = await fetch("/.netlify/functions/grok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign })
  });

  const data = await res.json();
  let text = data.output || "";

  /* ----------------------------
     NORMALIZE RAW OUTPUT
  ---------------------------- */
  text = text
    .replace(/#{2,}/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  /* ----------------------------
     FORCE STRUCTURE
  ---------------------------- */
  const sections = {
    Horoscope: "",
    Love: "",
    Affirmation: ""
  };

  let current = null;

  text.split("\n").forEach(line => {
    const clean = line.trim();

    if (/^horoscope$/i.test(clean)) {
      current = "Horoscope";
      return;
    }
    if (/^love$/i.test(clean)) {
      current = "Love";
      return;
    }
    if (/^affirmation$/i.test(clean)) {
      current = "Affirmation";
      return;
    }

    if (current) {
      sections[current] += clean + " ";
    }
  });

  /* ----------------------------
     RENDER CLEAN OUTPUT
  ---------------------------- */
  const output = `
    <span class="section-header">HOROSCOPE</span>
    <p>${sections.Horoscope.trim()}</p>

    <span class="section-header">LOVE</span>
    <p>${sections.Love.trim()}</p>

    <span class="section-header">AFFIRMATION</span>
    <p>${sections.Affirmation.trim()}</p>
  `;

  document.getElementById("daily-horoscope").innerHTML = output;
}

loadHoroscope();

/* ============================
   ELEVENLABS AUDIO (FIXED)
============================ */
let audio = null;
let audioUrl = null;

async function playHoroscopeAudio() {
  try {
    const text = document.getElementById("daily-horoscope").innerText;

    // Stop any existing audio first
    stopAudio();

    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign, text })
    });

    if (!res.ok) {
      throw new Error("Audio request failed");
    }

    const buffer = await res.arrayBuffer();

    // Create audio blob
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    audioUrl = URL.createObjectURL(blob);

    // Create audio element
    audio = new Audio();
    audio.src = audioUrl;
    audio.preload = "auto";
    audio.playsInline = true; // IMPORTANT for iOS

    // Force play (must be user-triggered)
    await audio.play();
  } catch (err) {
    console.error("Audio playback failed:", err);
    alert("Audio playback failed. Please tap again.");
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

