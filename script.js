let isLoadingAudio = false;

async function playHoroscopeAudio(sign, button) {
  if (isLoadingAudio) return;
  isLoadingAudio = true;

  if (button) {
    button.disabled = true;
    button.textContent = "Loading audio…";
  }

  try {
    const res = await fetch(`/.netlify/functions/tts?sign=${sign}`);
    if (!res.ok) throw new Error("Audio fetch failed");

    // Get raw binary audio
    const arrayBuffer = await res.arrayBuffer();

    // Create fresh blob + audio every time
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const audio = new Audio(URL.createObjectURL(blob));

    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      if (button) {
        button.disabled = false;
        button.textContent = "Read My Horoscope";
      }
      isLoadingAudio = false;
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
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
