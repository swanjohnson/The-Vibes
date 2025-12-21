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
   AUDIO (FINAL + WORKING)
================================ */
async function playHoroscopeAudio() {
  try {
    stopAudio();

    const sign = document
      .getElementById("signName")
      ?.innerText?.toLowerCase();

    if (!sign) return;

    // ✅ GET request with query param (matches working backend)
    const res = await fetch(
      `/.netlify/functions/tts?sign=${encodeURIComponent(sign)}`
    );

    if (!res.ok) throw new Error("Audio failed");

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);

    audioPlayer = new Audio(audioUrl);

    // iOS-safe playback
    await audioPlayer.play();

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
