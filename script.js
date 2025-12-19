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
   PARSE GROK RESPONSE (OPTION B)
============================ */
function parseSections(text) {
  const sections = {
    daily: "",
    love: "",
    affirmation: ""
  };

  const parts = text.split(/\n(?=Daily:|Love:|Affirmation:)/i);

  parts.forEach(part => {
    const lower = part.toLowerCase();

    if (lower.startsWith("daily:")) {
      sections.daily = part.replace(/daily:/i, "").trim();
    }

    if (lower.startsWith("love:")) {
      sections.love = part.replace(/love:/i, "").trim();
    }

    if (lower.startsWith("affirmation:")) {
      sections.affirmation = part.replace(/affirmation:/i, "").trim();
    }
  });

  return sections;
}

/* ============================
   LOAD HOROSCOPE
============================ */
async function loadHoroscope() {
  const res = await fetch("/.netlify/functions/grok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign })
  });

  const data = await res.json();
  const text = data.output || "";

  const sections = parseSections(text);

  // ---- DAILY (always show something)
  document.getElementById("daily-horoscope").innerText =
    sections.daily || text;

  // ---- LOVE (only if present)
  if (sections.love) {
    document.getElementById("love-info").innerText = sections.love;
    document.getElementById("love-info").style.display = "block";
  } else {
    document.getElementById("love-info").style.display = "none";
  }

  // ---- AFFIRMATION (only if present)
  if (sections.affirmation) {
    document.getElementById("affirmation").innerText = sections.affirmation;
    document.getElementById("affirmation").style.display = "block";
  } else {
    document.getElementById("affirmation").style.display = "none";
  }
}

loadHoroscope();

/* ============================
   ELEVENLABS AUDIO
============================ */
let audio = null;

async function playHoroscopeAudio() {
  const daily = document.getElementById("daily-horoscope").innerText;
  const loveEl = document.getElementById("love-info");
  const affEl = document.getElementById("affirmation");

  let fullText = `Daily Horoscope. ${daily}. `;

  if (loveEl && loveEl.style.display !== "none") {
    fullText += `Love. ${loveEl.innerText}. `;
  }

  if (affEl && affEl.style.display !== "none") {
    fullText += `Affirmation. ${affEl.innerText}.`;
  }

  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sign,
      text: fullText
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
