let audioPlayer = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDailyHoroscope();
});

/* ===============================
   LOAD DAILY HOROSCOPE (AUTO)
================================ */
async function loadDailyHoroscope() {
  try {
    const signEl = document.getElementById("signName");
    const dateEl = document.getElementById("currentDate");
    const readingEl = document.getElementById("dailyReading");

    if (!signEl || !dateEl || !readingEl) {
      console.error("Missing required DOM elements");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sign = params.get("sign") || "virgo";

    signEl.innerText = capitalize(sign);
    dateEl.innerText = getLocalDateString();

    const res = await fetch(`/.netlify/functions/grok?sign=${sign}`);
    const data = await res.json();

    if (!data || !data.reading) {
      throw new Error("Missing daily reading text");
    }

    readingEl.innerText = data.reading;

  } catch (err) {
    console.error("Daily load error:", err);
  }
}

/* ===============================
   AUDIO (ELEVEN LABS)
================================ */
async function playHoroscopeAudio() {
  try {
    stopAudio();

    const text = document.getElementById("dailyReading")?.innerText;
    if (!text) return;

    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      throw new Error("Audio generation failed");
    }

    const audioBlob = await res.blob();
    audioPlayer = new Audio(URL.createObjectURL(audioBlob));
    audioPlayer.play();

  } catch (err) {
    console.error("Audio error:", err);
  }
}

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer = null;
  }
}

/* ===============================
   HELPERS
================================ */
function getLocalDateString() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
