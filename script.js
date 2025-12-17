/* ============================
   GET SIGN FROM URL
============================ */
const params = new URLSearchParams(window.location.search);
const sign = (params.get("sign") || "aries").toLowerCase();

const validSigns = [
    "aries","taurus","gemini","cancer","leo","virgo",
    "libra","scorpio","sagittarius","capricorn","aquarius","pisces"
];

if (!validSigns.includes(sign)) {
    document.getElementById("zodiac-title").innerText = "Invalid Sign";
    document.getElementById("daily-horoscope").innerText =
        "Please scan your bracelet again.";
    throw new Error("Invalid zodiac sign");
}

document.getElementById("zodiac-title").innerText =
    sign.charAt(0).toUpperCase() + sign.slice(1);

document.getElementById("date").innerText =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

/* ============================
   LOAD HOROSCOPE
============================ */
async function loadHoroscope() {
    const res = await fetch("/.netlify/functions/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign })
    });

    const data = await res.json();
    const text = data.output;

    function extract(label) {
        const regex = new RegExp(
            `${label}:\\s*([\\s\\S]*?)(?=\\n(?:Daily|Love|Affirmation):|$)`,
            "i"
        );
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    }

    document.getElementById("daily-horoscope").innerText = extract("Daily");
    document.getElementById("love-info").innerText = extract("Love");
    document.getElementById("affirmation").innerText = extract("Affirmation");
}

loadHoroscope();

/* ============================
   AUDIO (ELEVENLABS)
============================ */
let audio = null;

async function playHoroscopeAudio() {
    const fullText =
        "Daily Horoscope. " +
        document.getElementById("daily-horoscope").innerText + ". " +
        "Love Compatibility. " +
        document.getElementById("love-info").innerText + ". " +
        "Affirmation. " +
        document.getElementById("affirmation").innerText;

    const res = await fetch("/.netlify/functions/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign, text: fullText })
    });

    const base64 = await res.text();
    const blob = new Blob(
        [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
        { type: "audio/mpeg" }
    );

    if (audio) audio.pause();
    audio = new Audio(URL.createObjectURL(blob));
    audio.play();
}

function stopAudio() {
    if (audio) audio.pause();
}
