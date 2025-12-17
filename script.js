/* ============================
   GET SIGN FROM URL
============================ */
const urlParams = new URLSearchParams(window.location.search);
let sign = urlParams.get("sign")?.toLowerCase() || "aries";

const validSigns = [
    "aries","taurus","gemini","cancer","leo","virgo",
    "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

/* Validate sign */
if (!validSigns.includes(sign)) {
    document.getElementById("zodiac-title").innerText = "Invalid Sign";
    document.getElementById("daily-horoscope").innerText =
        "Please scan your bracelet again.";
    document.getElementById("love-info").innerText = "";
    document.getElementById("affirmation").innerText = "";
} else {
    document.getElementById("zodiac-title").innerText =
        sign.charAt(0).toUpperCase() + sign.slice(1);

    document.getElementById("date").innerText =
        new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric"
        });
}

/* ============================
   FETCH HOROSCOPE FROM GROK
============================ */
async function loadHoroscope(sign) {
    try {
        const res = await fetch("/.netlify/functions/grok", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sign })
        });

        const data = await res.json();
        const text = data.output;

        function extract(label) {
            const regex = new RegExp(
                `${label}\\s*(?:[:\\-—]*?)\\s*(.*?)(?=\\n\\s*(Daily|Love|Affirmation)|$)`,
                "is"
            );
            const match = text.match(regex);
            if (!match) return "";
            let cleaned = match[1].trim();
            cleaned = cleaned.replace(/^[:\-—\*•\s]+/, "");
            return cleaned;
        }

        document.getElementById("daily-horoscope").innerText = extract("Daily");
        document.getElementById("love-info").innerText = extract("Love");
        document.getElementById("affirmation").innerText = extract("Affirmation");

    } catch {
        document.getElementById("daily-horoscope").innerText =
            "Unable to load guidance.";
    }
}

/* ============================
   ELEVENLABS AUDIO TTS
============================ */
let audioPlayer = null;

async function playHoroscopeAudio() {
    stopAudio(); // stop previous audio

    const daily = document.getElementById("daily-horoscope").innerText;
    const love = document.getElementById("love-info").innerText;
    const affirmation = document.getElementById("affirmation").innerText;

    const fullText =
        `Daily Horoscope: ${daily}. Love Insight: ${love}. Affirmation: ${affirmation}.`;

    try {
        const res = await fetch("/.netlify/functions/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: fullText, sign })
        });

        const data = await res.json();

        if (!data.audio) {
            console.error("TTS error:", data);
            return;
        }

        const audioSrc = "data:audio/mp3;base64," + data.audio;
        audioPlayer = new Audio(audioSrc);
        audioPlayer.play();

    } catch (err) {
        console.error("Audio play error:", err);
    }
}

function stopAudio() {
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
}

/* INIT */
if (validSigns.includes(sign)) loadHoroscope(sign);
