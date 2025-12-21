let audioPlayer = null;
let isLoadingAudio = false;

document.addEventListener("DOMContentLoaded", () => {
  loadDailyHoroscope();
});

async function loadDailyHoroscope() {
  const signEl = document.getElementById("signName");
  const dateEl = document.getElementById("currentDate");
  const readingEl = document.getElementById("dailyReading");

  const params = new URLSearchParams(window.location.search);
  const sign = params.get("sign") || "virgo";

  signEl.innerText = capitalize(sign);
  dateEl.innerText = getUTCDateString();

  const res = await fetch(
    `/.netlify/functions/get-daily?sign=${sign}`
  );
  const data = await res.json();

  readingEl.innerText = data.reading;
}

async function playHoroscopeAudio() {
  if (isLoadingAudio) return;
  isLoadingAudio = true;

  try {
    stopAudio();

    const sign = document
      .getElementById("signName")
      .innerText.toLowerCase();

    const res = await fetch(
      `/.netlify/functions/tts?sign=${sign}`
    );

    if (!res.ok) throw new Error("Audio fetch failed");

    const base64 = (await res.text()).trim();

    // 🔑 BULLETPROOF FIX: base64 → Blob
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(blob);

    audioPlayer = new Audio(audioUrl);
    await audioPlayer.play();

  } catch (err) {
    console.error("Audio error:", err);
  } finally {
    isLoadingAudio = false;
  }
}

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer = null;
  }
}

function getUTCDateString() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
