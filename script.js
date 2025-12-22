const audioButton = document.getElementById("play-audio");
let isLoadingAudio = false;

async function playHoroscopeAudio(sign) {
  if (isLoadingAudio) return;
  isLoadingAudio = true;

  audioButton.disabled = true;
  audioButton.textContent = "Loading audio…";

  try {
    const res = await fetch(`/.netlify/functions/tts?sign=${sign}`);
    if (!res.ok) throw new Error("Audio fetch failed");

    // IMPORTANT: get raw binary, NOT text
    const arrayBuffer = await res.arrayBuffer();

    // Create a fresh Blob every time
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });

    // Create a new audio element every time
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    audio.preload = "auto";

    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      audioButton.disabled = false;
      audioButton.textContent = "Read My Horoscope";
      isLoadingAudio = false;
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      throw new Error("Audio playback failed");
    };

    await audio.play();

  } catch (err) {
    console.error("Audio error:", err);
    audioButton.disabled = false;
    audioButton.textContent = "Read My Horoscope";
    isLoadingAudio = false;
  }
}
