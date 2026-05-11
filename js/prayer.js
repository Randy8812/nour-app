// ============================================
// NOUR — Rappel de Prière Intelligent
// ============================================

// Mots coraniques liés à chaque prière
const PRAYER_WORDS = {
  fajr: [6, 143, 19, 46, 8], // Nour, Fajr, Salah, Dhikr, Huda
  dhuhr: [1, 2, 36, 19, 62], // Allah, Rabb, Ibada, Salah, Alim
  asr: [144, 7, 51, 189, 10], // Asr, Sabr, Yaqin, Sabara, Shukr
  maghrib: [3, 29, 30, 18, 65], // Rahma, Rahim, Rahman, Salam, Wadud
  isha: [6, 141, 46, 35, 122], // Nour, Layl, Dhikr, Tawakkul, Ghayb
};

// Noms des prières
const PRAYER_NAMES = {
  fajr: { name: "Fajr", arabic: "الفجر", time: "🌅", color: "#818cf8" },
  dhuhr: { name: "Dhuhr", arabic: "الظهر", time: "☀️", color: "#d4a843" },
  asr: { name: "Asr", arabic: "العصر", time: "🌤️", color: "#f97316" },
  maghrib: { name: "Maghrib", arabic: "المغرب", time: "🌆", color: "#1db974" },
  isha: { name: "Isha", arabic: "العشاء", time: "🌙", color: "#a78bfa" },
};

let userLocation = null;
let prayerTimes = null;

// Obtenir la localisation
async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

// Calculer les horaires de prière (algorithme simplifié)
function calculatePrayerTimes(lat, lng, date = new Date()) {
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  const jd = julianDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const tz = -date.getTimezoneOffset() / 60;

  function julianDate(y, m, d) {
    if (m <= 2) {
      y--;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return (
      Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      d +
      B -
      1524.5
    );
  }

  function sunPosition(jd) {
    const D = jd - 2451545;
    const g = 357.529 + 0.98560028 * D;
    const q = 280.459 + 0.98564736 * D;
    const L = q + 1.915 * Math.sin(g * D2R) + 0.02 * Math.sin(2 * g * D2R);
    const e = 23.439 - 0.00000036 * D;
    const RA =
      (R2D *
        Math.atan2(Math.cos(e * D2R) * Math.sin(L * D2R), Math.cos(L * D2R))) /
      15;
    const d = R2D * Math.asin(Math.sin(e * D2R) * Math.sin(L * D2R));
    const EqT = q / 15 - RA;
    return { d, EqT };
  }

  function prayerTime(angle, { d, EqT }, lat, direction = 1) {
    const cosH =
      (Math.sin(angle * D2R) - Math.sin(lat * D2R) * Math.sin(d * D2R)) /
      (Math.cos(lat * D2R) * Math.cos(d * D2R));
    if (Math.abs(cosH) > 1) return null;
    const H = (R2D * Math.acos(cosH)) / 15;
    return 12 - EqT + direction * H + (lng / 15 - tz);
  }

  const sp = sunPosition(jd);
  const noon = 12 - sp.EqT + (lng / 15 - tz);

  function toTime(h) {
    if (!h) return null;
    const hrs = Math.floor(h) % 24;
    const mins = Math.floor((h - Math.floor(h)) * 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  // Angle d'ombre pour Asr (méthode standard = 1)
  const asrAngle = R2D * Math.atan(1 + Math.tan(Math.abs(lat - sp.d) * D2R));

  return {
    fajr: toTime(prayerTime(-18, sp, lat, -1)),
    sunrise: toTime(prayerTime(-0.833, sp, lat, -1)),
    dhuhr: toTime(noon),
    asr: toTime(
      noon +
        (R2D * Math.atan(1 / (1 + Math.tan(Math.abs(lat - sp.d) * D2R)))) / 15,
    ),
    maghrib: toTime(prayerTime(-0.833, sp, lat, 1)),
    isha: toTime(prayerTime(-17, sp, lat, 1)),
  };
}

// Déterminer la prière actuelle ou prochaine
function getCurrentPrayer(times) {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  for (let i = prayers.length - 1; i >= 0; i--) {
    const prayer = prayers[i];
    if (times[prayer] && currentTime >= times[prayer]) {
      return { current: prayer, next: prayers[(i + 1) % prayers.length] };
    }
  }
  return { current: "isha", next: "fajr" };
}

// Obtenir un mot lié à la prière
function getPrayerWord(prayer) {
  const wordIds = PRAYER_WORDS[prayer] || PRAYER_WORDS.dhuhr;
  const wordId = wordIds[Math.floor(Math.random() * wordIds.length)];
  return WORDS.find((w) => w.id === wordId) || WORDS[0];
}

// Afficher le widget prière
async function showPrayerWidget() {
  // Vérifier si déjà affiché aujourd'hui
  const todayKey = `nour_prayer_${new Date().toDateString()}`;
  if (localStorage.getItem(todayKey)) return;

  let times = null;
  let prayerInfo = null;

  // Essayer de récupérer la localisation
  const loc = await getUserLocation();
  if (loc) {
    times = calculatePrayerTimes(loc.lat, loc.lng);
    const { current } = getCurrentPrayer(times);
    prayerInfo = PRAYER_NAMES[current];
  } else {
    // Fallback — utiliser l'heure actuelle pour deviner
    const hour = new Date().getHours();
    let prayer = "dhuhr";
    if (hour < 7) prayer = "fajr";
    else if (hour < 13) prayer = "dhuhr";
    else if (hour < 17) prayer = "asr";
    else if (hour < 20) prayer = "maghrib";
    else prayer = "isha";
    prayerInfo = PRAYER_NAMES[prayer];
    times = null;
  }

  const prayer =
    Object.keys(PRAYER_NAMES).find((k) => PRAYER_NAMES[k] === prayerInfo) ||
    "dhuhr";
  const word = getPrayerWord(prayer);

  const widget = document.createElement("div");
  widget.id = "prayerWidget";
  widget.style.cssText = `
    position:fixed; bottom:90px; left:16px; right:16px;
    background:linear-gradient(145deg,#0f2018,#142b1f);
    border:1px solid rgba(29,185,116,0.25);
    border-radius:20px; padding:16px 18px;
    z-index:600; box-shadow:0 8px 32px rgba(0,0,0,0.5);
    animation:slideUp 0.4s cubic-bezier(0.34,1.2,0.64,1);
    display:flex; flex-direction:column; gap:12px;
    max-width:460px; margin:0 auto;
  `;

  widget.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">${prayerInfo.time}</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">
            Prière de ${prayerInfo.name}
          </div>
          <div style="font-size:12px;color:rgba(245,240,232,0.45);font-family:Outfit,sans-serif;">
            ${times ? `${times[prayer] || ""} · ` : ""}Mot du moment
          </div>
        </div>
      </div>
      <button onclick="document.getElementById('prayerWidget').remove()" 
        style="background:none;border:none;color:rgba(245,240,232,0.3);font-size:18px;cursor:pointer;padding:4px;">✕</button>
    </div>

    <div style="
      background:rgba(5,14,10,0.6); border-radius:14px; padding:14px;
      display:flex; align-items:center; gap:14px;
      border:1px solid rgba(212,168,67,0.12);
    ">
      <div style="font-family:Amiri,serif;font-size:48px;color:#d4a843;direction:rtl;filter:drop-shadow(0 0 12px rgba(212,168,67,0.3));flex-shrink:0;">${word.arabic}</div>
      <div style="flex:1;">
        <div style="font-size:13px;color:rgba(29,185,116,0.8);font-style:italic;font-family:Outfit,sans-serif;">${word.transliteration}</div>
        <div style="font-size:15px;font-weight:700;color:#f5f0e8;font-family:Outfit,sans-serif;margin-top:2px;">${word.meaning}</div>
        <div style="font-size:11px;color:rgba(245,240,232,0.3);font-family:Outfit,sans-serif;margin-top:3px;">${word.verseRef}</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;">
      <button onclick="learnPrayerWord(${word.id})" style="
        flex:1; background:linear-gradient(135deg,#1db974,#26d984);
        color:#050e0a; border:none; border-radius:99px; padding:10px;
        font-size:13px; font-weight:800; font-family:Outfit,sans-serif; cursor:pointer;
      ">Apprendre ce mot</button>
      <button onclick="dismissPrayerWidget()" style="
        background:rgba(245,240,232,0.07); border:1px solid rgba(245,240,232,0.08);
        color:rgba(245,240,232,0.5); border-radius:99px; padding:10px 16px;
        font-size:13px; font-weight:600; font-family:Outfit,sans-serif; cursor:pointer;
      ">Plus tard</button>
    </div>
  `;

  document.body.appendChild(widget);
  localStorage.setItem(todayKey, "true");

  // Fermer après 15 secondes
  setTimeout(() => {
    if (document.getElementById("prayerWidget")) widget.remove();
  }, 15000);
}

function learnPrayerWord(wordId) {
  document.getElementById("prayerWidget")?.remove();
  // Naviguer vers ce mot
  const idx = WORDS.findIndex((w) => w.id === wordId);
  if (idx !== -1) {
    state.currentWordIndex = idx;
    // Switcher vers l'onglet apprendre
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.add("hidden"));
    document.querySelector('[data-tab="learn"]')?.classList.add("active");
    document.getElementById("tab-learn")?.classList.remove("hidden");
    renderLearnScreen("right");
    updateUI();
  }
}

function dismissPrayerWidget() {
  document.getElementById("prayerWidget")?.remove();
}

// Initialiser — afficher après 10 secondes dans l'app
function initPrayerReminder() {
  setTimeout(() => showPrayerWidget(), 10000);
}
