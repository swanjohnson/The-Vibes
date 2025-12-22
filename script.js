let isLoadingAudio = false;
let currentSign = null;
let currentHoroscopeDate = null;
let currentAudio = null;

/**
 * Fetch and display today's horoscope
 */
async function loadDailyHoroscope() {
  try {
    // Read sign from UI once (authoritative)
    const signEl = document.getElementById("signName");
    if (!signEl) throw new Error("Sign element not found");

    currentSign = signEl.textContent.toLowerCase();

    const res = await fetch(
      `/.netlify/functions/get-daily?sign=${encodeURIComponent(currentSign)}`
    );

    if (!res.ok) throw new Error("Failed to fetch horoscope");

    const data = await res.json();

    // Store authoritative values from backend
    currentHoroscopeDate = data.date;

    // Update reading
    const readingEl = document.getElementById("dailyReading");
    if (readingEl) {
      readingEl.textContent = data.reading;
    }

    // Update displayed date from backend date
    const dateEl = document.getElementById("currentDate");
    if (dateEl && data.date) {
      const displayDate = new Date(data.date + "T00:00:00Z").toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric" }
      );
      dateEl.textContent = displayDate;
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
    if (!currentSign || !currentHoroscopeDate) {
      throw new Error("Horoscope not loaded yet");
    }

    const res = await fetch(
      `/.netlify/functions/tts?sign=${encodeURIComponent(
        currentSign
      )}&date=${currentHoroscopeDate}`
    );

    if (!res.ok) throw new Error("Audio fetch failed");

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(blob);

    // Stop any existing audio
    if (currentAudio) {
      currentAudio.pause();
      URL.revokeObjectURL(currentAudio.src);
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      if (button) {
        button.disabled = false;
        button.textContent = "Read My Horoscope";
      }
      isLoadingAudio = false;
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
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
 * Stop audio playback
 */
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
    currentAudio = null;
  }

  const btn = document.querySelector(".primary-btn");
  if (btn) {
    btn.disabled = false;
    btn.textContent = "Read My Horoscope";
  }

  isLoadingAudio = false;
}

/**
 * Init on load
 */
document.addEventListener("DOMContentLoaded", loadDailyHoroscope);
