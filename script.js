let audioPlayer = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDailyHoroscope();
});

/* ===============================
   LOAD DAILY HOROSCOPE
================================ */
async function loadDailyHoroscope() {
  try {
    const signEl = document.getElementById("signName");
    const dateEl = document.getElementById("currentDate");
    const readingEl = document.getElementById("dailyReading");

    const params = new URLSearchParams(window.location.search);
    const sign = params.get("sign") || "virgo";

    signEl.innerText = capitalize(sign);
    dateEl.innerText = getLocalDateString();

    const res = await fetch(`/.netlify/functions/grok?sign=${sign}`);
    const data = await res.json();

    if (data?.reading) {
      readingEl.innerText = data.reading;
    } else {
      readingEl.innerText =
        "Today's vibe is still forming. Check back shortly.";
    }

  } catch (err) {
    console.error("Daily load error:", err);
  }
}

/* ===============================
   AUDIO (FIXED)
================================ */
async function playHoroscopeAudio() {
  try {
    stopAudio();

    const text = document.getElementById("dailyReading")?.innerText;
    const sign = document.getElementById("signName")?.innerText?.toLowerCase();
    const date = new Date().toISOString().split("T")[0];

    if (!text || !sign) return;

    const res = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign, date, text })
    });

    if (!res.ok) throw new Error("Audio failed");

    const blob = await res.blob();
    audioPlayer = new Audio(URL.createObjectURL(blob));
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
