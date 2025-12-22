let isLoadingAudio = false;
let currentHoroscopeDate = null;

/**
 * Fetch and display today's horoscope text
 */
async function loadDailyHoroscope() {
  try {
    const sign = document
      .getElementById("signName")
      .textContent
      .toLowerCase();

    const res = await fetch(
      `/.netlify/functions/get-daily?sign=${encodeURIComponent(sign)}`
    );

    if (!res.ok) throw new Error("Failed to fetch horoscope");

    const data = await res.json();

    // Store the authoritative date from backend
    currentHoroscopeDate = data.date;

    const readingEl = document.getElementById("dailyReading");
    if (readingEl && data.reading) {
      readingEl.textContent = data.reading;
    }

  } catch (err) {
    console.error("Horoscope load error:", err);
    const readingEl = document.getElementById("dailyReading");
    if (readingEl) {
      readingEl.textContent =
        "Today's vibe is still forming. Check back shortly.";
    }
  }
}

/**
 * Play cached horoscope audio
 */
async function playHoroscopeAudio(sign, button) {
  if (isLoadingAudio) return;
  isLoadingAudio = true;

  if (button) {
    button.disabled = true;
    button.textContent = "Loading audio…";
  }

  try {
    if (!currentHoroscopeDate) {
      throw new Error("Horoscope date not loaded");
    }

    const res = await fetch(
      `/.netlify/functions/tts?sign=${encodeURIComponent(
        sign
      )}&date=${currentHoroscopeDate}`
    );

    if (!res.ok) throw new Error("Audio fetch failed");

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (button) {
        button.disabled = false;
        button.textContent = "Read My Horoscope";
      }
      isLoadingAudio = false;
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      throw new Error("Audio playback failed");
    };

    await audio.play();

  } catch (err) {
    console.error("Audio error:", err);
    if (button) {
      button.disabled = false;
      button.textContent = "Read My Horoscope";
    }
    isLoadingAudio = false;
  }
}

/**
 * Optional stop button (safe no-op)
 */
function stopAudio() {}

/**
 * Load horoscope on page load
 */
document.addEventListener("DOMContentLoaded", loadDailyHoroscope);
