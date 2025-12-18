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
  document.getElementById("daily-horoscope").innerText = "Please scan again.";
  throw new Error("Invalid sign");
}

document.getElementById("zodiac-title").innerText =
  sign.charAt(0).toUpperCase() + sign.slice(1);

document.getElementById("date").innerText =
  new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });

/* ============================
   LOAD HOROSCOPE TEXT
============================ */
async function loadHoroscope() {
  const res = await fetch("/.netlify/functions/grok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign })
  });

  const data = await res.json();
  const text = data.output;

  function extract(label) {
    const regex = new RegExp(
      `${label}\\s*:\\s*([\\s\\S]*?)(?=\\n(?:Daily|Love|Affirmation)|$)`,
      "i"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  document.getElementById("daily-horoscope").innerText = extract("Daily");
  document.getElementById("love-info").innerText = extract("Love");
  document.getElementById("affirmation").innerText = extract("Affirmation");
}

loadHoroscope();

/* ============================
   ELEVENLABS AUDIO (CACHED)
============================ */
let audio = null;

async function playHoroscopeAudio() {
    const res = await fetch("/.netlify/functions/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign })
    });

    if (!res.ok) {
        throw new Error("Audio request failed");
    }

    // IMPORTANT: Netlify already decoded base64 → this is binary
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



