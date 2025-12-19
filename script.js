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

/* ============================
   PAGE TITLES
============================ */
document.getElementById("zodiac-title").innerText =
  sign.charAt(0).toUpperCase() + sign.slice(1);

document.getElementById("date").innerText =
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

/* ============================
   LOAD GROK READING
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
  // CLEANUP + NORMALIZATION
  // ----------------------------

  text = text
    // remove markdown junk
    .replace(/#{2,}/g, "")

    // normalize headers
    .replace(/\bHoroscope:?\s*/gi, "<span class='section-header'>Horoscope</span>\n")
    .replace(/\bDaily:?\s*/gi, "<span class='section-header'>Horoscope</span>\n")
    .replace(/\bLove:?\s*/gi, "\n<span class='section-header'>Love</span>\n")
    .replace(/\bAffirmation:?\s*/gi, "\n<span class='section-header'>Affirmation</span>\n")

    // REMOVE duplicated "Love" immediately after Love header
    .replace(
      /(<span class='section-header'>Love<\/span>\s*)(Love[, ]+)/gi,
      "$1"
    )

    // REMOVE duplicated "Affirmation" immediately after header
    .replace(
      /(<span class='section-header'>Affirmation<\/span>\s*)(Affirmation[, ]+)/gi,
      "$1"
    )

    // clean excess whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  document.getElementById("daily-horoscope").innerHTML = text;
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
    body: JSON.stringify({ sign, text })
  });

  if (!res.ok) throw new Error("Failed to load audio");

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
