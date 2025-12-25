let isLoadingAudio = false;
let currentSign = "virgo";
let currentHoroscopeDate = null;
let currentAudio = null;

const VALID_SIGNS = [
  "aries", "taurus", "gemini", "cancer",
  "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces"
];

const SIGN_LABELS = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces"
};

/**
 * Read sign from URL (?sign=libra), fallback to Virgo
 */
function getSignFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const sign = params.get("sign")?.toLowerCase();
  return VALID_SIGNS.includes(sign) ? sign : "virgo";
}

/**
 * Fetch and display today's horoscope
 */
async function loadDailyHoroscope() {
  try {
    currentSign = getSignFromQuery();

    // Update sign label
    const signEl = document.getElementById("signName");
    if (signEl) signEl.textContent = SIGN_LABELS[currentSign];

    const res = await fetch(
      `/.netlify/functions/get-daily?sign=${encodeURIComponent(currentSign)}`
    );

    if (!res.ok) throw new Error("Failed to fetch horoscope");

    const data = await res.json();

    // Backend date is authoritative (CST)
    currentHoroscopeDate = data.date;

    // Reading text
    const readingEl = document.getElementById("dailyReading");
    if (readingEl) readingEl.textContent = data.reading;

    // Display date — DO NOT interpret as UTC
    const dateEl = document.getElementById("currentDate");
    if (dateEl && data.date) {
      const displayDate = new Date(
        data.date + "T12:00:00" // noon prevents timezone rollover
      ).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      });

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
async function playHoroscopeAudio(_, button) {
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

    // Stop existing audio
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

document.addEventListener("DOMContentLoaded", loadDailyHoroscope);
