/* ============================
   SIGN FROM URL
============================ */
const params = new URLSearchParams(window.location.search);
const sign = (params.get("sign") || "aries").toLowerCase();

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

  // ----------------------------
  // NORMALIZE
  // ----------------------------
  text = text
    .replace(/#{2,}/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // ----------------------------
  // FORCE STRUCTURE
  // ----------------------------
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

  // ----------------------------
  // RENDER
  // ----------------------------
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
   AUDIO
============================ */
let audio;

async function playHoroscopeAudio() {
  const text = document.getElementById("daily-horoscope").innerText;

  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign, text })
  });

  const buffer = await res.arrayBuffer();
  audio = new Audio(URL.createObjectURL(new Blob([buffer])));
  audio.play();
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}
