let isLoadingAudio = false;

/**
 * Play cached horoscope audio (server-side cached, browser-safe playback)
 */
async function playHoroscopeAudio(sign, button) {
  if (isLoadingAudio) return;
  isLoadingAudio = true;

  if (button) {
    button.disabled = true;
    button.textContent = "Loading audio…";
  }

  try {
    // Read the date exactly as shown in the UI
    const dateText = document.getElementById("currentDate")?.textContent;
    if (!dateText) throw new Error("Date not found in UI");

    // Convert "Saturday, December 20" → YYYY-MM-DD (UTC-safe)
    const date = new Date(dateText).toISOString().split("T")[0];

    const res = await fetch(
      `/.netlify/functions/tts?sign=${encodeURIComponent(sign)}&date=${date}`
    );

    if (!res.ok) throw new Error("Audio fetch failed");

    // IMPORTANT: read raw binary audio
    const arrayBuffer = await res.arrayBuffer();

    // Create a fresh Blob and Audio element every time
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
 * OPTIONAL: stop button support (safe no-op if no audio playing)
 */
function stopAudio() {
  // This intentionally does nothing for now
  // Audio is one-shot and cleaned up automatically
}
