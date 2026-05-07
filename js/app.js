// ============================================
// NOUR — App v9 — Animations Premium
// ============================================

const SUPABASE_URL = "https://xlpdvsodgrdlpwuajzyr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscGR2c29kZ3JkbHB3dWFqenlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjkyMDcsImV4cCI6MjA5MzUwNTIwN30.RjVzdzv3daq84cTvUdwguFpNpSwXKPNL2iJf7KOLT7Q";
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/eVq8wO85U5o7f2u7Ef2Ji00";
const STRIPE_LIFETIME_LINK = "https://buy.stripe.com/9B628q71QeYH3jM5w72Ji02";
const FREE_WORDS_LIMIT = 15;

// ============================================
// SONS
// ============================================

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Initialiser l'audio au premier clic
document.addEventListener(
  "click",
  () => {
    getAudioContext();
  },
  { once: true },
);

function playSound(type) {
  try {
    const ctx = getAudioContext();

    if (type === "correct") {
      // Son ding joyeux — deux notes montantes
      const notes = [523, 659, 784]; // Do, Mi, Sol
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(
          0.3,
          ctx.currentTime + i * 0.1 + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.1 + 0.25,
        );
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } else if (type === "wrong") {
      // Son grave court
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 220;
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "milestone") {
      // Fanfare courte — 4 notes
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(
          0.25,
          ctx.currentTime + i * 0.12 + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.12 + 0.3,
        );
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    }
  } catch (e) {
    // Audio non supporté — pas grave
  }
}

// ============================================
// SRS
// ============================================
const SRS_INTERVALS = [1, 3, 7, 14, 30, 90];

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWordSRS(wordId) {
  const srs = state.srsData || {};
  return srs[wordId] || { level: 0, nextReview: null, correct: 0, wrong: 0 };
}

function updateWordSRS(wordId, correct) {
  if (!state.srsData) state.srsData = {};
  const data = getWordSRS(wordId);
  const today = getTodayStr();
  if (correct) {
    data.level = Math.min(data.level + 1, SRS_INTERVALS.length - 1);
    data.correct = (data.correct || 0) + 1;
  } else {
    data.level = Math.max(data.level - 1, 0);
    data.wrong = (data.wrong || 0) + 1;
  }
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + SRS_INTERVALS[data.level]);
  data.nextReview = nextDate.toISOString().split("T")[0];
  data.lastReview = today;
  state.srsData[wordId] = data;
}

function getWordsToReviewToday() {
  const today = getTodayStr();
  return state.learnedWords.filter((wordId) => {
    const srs = getWordSRS(wordId);
    if (!srs.nextReview) return true;
    return srs.nextReview <= today;
  });
}

function getMasteryLevel(wordId) {
  return getWordSRS(wordId).level || 0;
}

// ============================================
// ANIMATIONS
// ============================================

function animateElement(el, animClass, duration = 400) {
  if (!el) return;
  el.classList.remove(animClass);
  void el.offsetWidth; // reflow
  el.classList.add(animClass);
  setTimeout(() => el.classList.remove(animClass), duration);
}

function slideOut(el, direction = "left") {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }
    const cls =
      direction === "left" ? "anim-slide-out-left" : "anim-slide-out-right";
    el.classList.add(cls);
    setTimeout(() => {
      el.classList.remove(cls);
      resolve();
    }, 220);
  });
}

function slideIn(el, direction = "right") {
  if (!el) return;
  const cls =
    direction === "right" ? "anim-slide-in-right" : "anim-slide-in-left";
  el.classList.remove("anim-slide-in-right", "anim-slide-in-left");
  void el.offsetWidth;
  el.classList.add(cls);
}

function haptic(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ============================================
// SUPABASE & STRIPE
// ============================================

async function saveEmailToSupabase(email, profileName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, profile_name: profileName }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function startStripeCheckout() {
  const email = localStorage.getItem("nour_user_email") || "";
  const url = email
    ? `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(email)}`
    : STRIPE_PAYMENT_LINK;
  window.location.href = url;
}

function startLifetimeCheckout() {
  const email = localStorage.getItem("nour_user_email") || "";
  const url = email
    ? `${STRIPE_LIFETIME_LINK}?prefilled_email=${encodeURIComponent(email)}`
    : STRIPE_LIFETIME_LINK;
  window.location.href = url;
}

function checkStripeReturn() {
  // Vérifier achat à vie
  const params = new URLSearchParams(window.location.search);
  if (params.get("lifetime") === "true") {
    localStorage.setItem("nour_premium", "true");
    localStorage.setItem("nour_lifetime", "true");
    window.history.replaceState({}, "", "/");
    setTimeout(() => showToast("🎉 Accès à vie activé !"), 1000);
    return;
  }
  // Déléguer à premium.js pour l'abonnement mensuel
  handleStripeReturn().catch(() => {
    if (params.get("premium") === "true") {
      localStorage.setItem("nour_premium", "true");
      window.history.replaceState({}, "", "/");
    }
  });
}

// ============================================
// FREEMIUM
// ============================================

function isPremium() {
  return localStorage.getItem("nour_premium") === "true";
}

function showPremiumBadge() {
  if (isPremium())
    document.getElementById("premiumBadge").classList.remove("hidden");
}

function showPaywall() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("paywallScreen").classList.remove("hidden");
  slideIn(document.getElementById("paywallScreen"), "right");
  setupPaywallEvents();
}

function setupPaywallEvents() {
  document.getElementById("paywallCTA").onclick = () => startStripeCheckout();
  document.getElementById("paywallBack").onclick = () => {
    document.getElementById("paywallScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    state.currentWordIndex = FREE_WORDS_LIMIT - 1;
    state.mode = "learn";
    renderLearnScreen();
    updateUI();
  };
}

// ============================================
// EMAIL
// ============================================

function showEmailCapture() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("emailScreen").classList.remove("hidden");
  slideIn(document.getElementById("emailScreen"), "right");
  setupEmailEvents();
}

function setupEmailEvents() {
  const submitBtn = document.getElementById("emailSubmitBtn");
  const skipBtn = document.getElementById("emailSkipBtn");
  const input = document.getElementById("emailInput");
  const errorEl = document.getElementById("emailError");

  submitBtn.onclick = async () => {
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.classList.add("error");
      errorEl.classList.remove("hidden");
      return;
    }
    input.classList.remove("error");
    errorEl.classList.add("hidden");
    submitBtn.textContent = "Sauvegarde...";
    submitBtn.disabled = true;
    const profiles = loadProfiles();
    const profileName = profiles[currentProfile]?.name || "Inconnu";
    await saveEmailToSupabase(email, profileName);
    localStorage.setItem("nour_user_email", email);
    localStorage.setItem("nour_email_captured", "true");
    submitBtn.textContent = "Sauvegarder et continuer";
    submitBtn.disabled = false;
    document.getElementById("emailScreen").classList.add("hidden");
    showToast("✅ Email sauvegardé !");
    showPaywall();
  };

  skipBtn.onclick = () => {
    localStorage.setItem("nour_email_captured", "true");
    document.getElementById("emailScreen").classList.add("hidden");
    showPaywall();
  };

  input.addEventListener("input", () => {
    input.classList.remove("error");
    errorEl.classList.add("hidden");
  });
}

// ============================================
// PROFILS
// ============================================

let currentProfile = null;

function loadProfiles() {
  return JSON.parse(localStorage.getItem("nour_profiles") || "[]");
}
function saveProfiles(profiles) {
  localStorage.setItem("nour_profiles", JSON.stringify(profiles));
}

function showProfiles() {
  document.getElementById("profiles").classList.remove("hidden");
  slideIn(document.getElementById("profilesGrid"), "right");
  renderProfilesGrid();
  setupProfileEvents();
}

function renderProfilesGrid() {
  const profiles = loadProfiles();
  const grid = document.getElementById("profilesGrid");
  if (profiles.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👨‍👩‍👧‍👦</div><p>Crée ton premier profil pour commencer</p></div>`;
    return;
  }
  grid.innerHTML = profiles
    .map(
      (p, i) => `
    <div class="profile-card" onclick="selectProfile(${i})">
      <button class="profile-delete" onclick="deleteProfile(event,${i})">✕</button>
      <div class="profile-avatar">${p.avatar}</div>
      <div class="profile-name">${p.name}</div>
      <div class="profile-stats">🔥 ${p.state?.streak || 0} · ⭐ ${p.state?.xp || 0} XP</div>
    </div>`,
    )
    .join("");
}

function selectProfile(index) {
  const profiles = loadProfiles();
  currentProfile = index;
  const defaultState = {
    currentWordIndex: 0,
    learnedWords: [],
    streak: 0,
    xp: 0,
    lastVisit: null,
    totalQuizzes: 0,
    correctQuizzes: 0,
    quizActive: false,
    mode: "learn",
    srsData: {},
  };
  state = profiles[index].state
    ? { ...defaultState, ...profiles[index].state }
    : defaultState;
  if (!state.srsData) state.srsData = {};
  if (!state.mode) state.mode = "learn";
  document.getElementById("profiles").classList.add("hidden");
  applyKidTheme();
  showApp();
}

function deleteProfile(e, index) {
  e.stopPropagation();
  const profiles = loadProfiles();
  if (confirm(`Supprimer "${profiles[index].name}" ?`)) {
    profiles.splice(index, 1);
    saveProfiles(profiles);
    renderProfilesGrid();
  }
}

function confirmDeleteProfile(index) {
  const profiles = loadProfiles();
  if (!profiles[index]) return;
  if (confirm(`Supprimer le profil "${profiles[index].name}" ?`)) {
    profiles.splice(index, 1);
    saveProfiles(profiles);
    renderProfilesGrid();
  }
}

function setupProfileEvents() {
  const addBtn = document.getElementById("addProfileBtn");
  const modal = document.getElementById("addProfileModal");
  let selectedAvatar = "🧑";

  addBtn.onclick = () => {
    if (loadProfiles().length >= 4) {
      showToast("Maximum 4 profils");
      return;
    }
    modal.classList.remove("hidden");
    animateElement(document.querySelector(".modal-box"), "anim-bounce-in", 500);
    document.getElementById("profileNameInput").value = "";
    document.getElementById("profileNameInput").focus();
  };

  document.getElementById("cancelProfileBtn").onclick = () =>
    modal.classList.add("hidden");

  document
    .getElementById("avatarPicker")
    .querySelectorAll(".avatar-opt")
    .forEach((opt) => {
      opt.addEventListener("click", () => {
        document
          .querySelectorAll(".avatar-opt")
          .forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        selectedAvatar = opt.dataset.avatar;
        animateElement(opt, "anim-pop-in", 400);
      });
    });

  document.getElementById("saveProfileBtn").onclick = () => {
    const name = document.getElementById("profileNameInput").value.trim();
    if (!name) {
      showToast("Entre un prénom");
      return;
    }
    const isKid = document.getElementById("isKidToggle")?.checked || false;
    const profiles = loadProfiles();
    profiles.push({ name, avatar: selectedAvatar, isKid, state: null });
    saveProfiles(profiles);
    modal.classList.add("hidden");
    renderProfilesGrid();
  };
}

// ============================================
// PROFIL ENFANT
// ============================================

function isKidProfile() {
  if (currentProfile === null) return false;
  const profiles = loadProfiles();
  return profiles[currentProfile]?.isKid === true;
}

function applyKidTheme() {
  if (isKidProfile()) {
    document.body.classList.add("kid-mode");
  } else {
    document.body.classList.remove("kid-mode");
  }
}

function getKidMessage(type) {
  const messages = {
    correct: [
      "🌟 Super !",
      "🎉 Bravo !",
      "✨ Génial !",
      "🏆 Excellent !",
      "🌈 Parfait !",
    ],
    wrong: [
      "😊 Presque !",
      "💪 Réessaie !",
      "🤔 Pas encore...",
      "😅 Continue !",
    ],
    xp: ["⭐ +5 points !", "🌟 Bien joué !", "✨ Tu gagnes !"],
    nextWord: ["C'est parti ! 🚀", "Mot suivant ! ⭐", "Encore un ! 🎯"],
  };
  const list = messages[type];
  return list[Math.floor(Math.random() * list.length)];
}

// ============================================
// DÉFI DU JOUR
// ============================================

function getDailyChallenge() {
  const today = getTodayStr();
  const level = localStorage.getItem("nour_user_level") || "beginner";

  // Plages de mots selon difficulté
  const ranges = {
    beginner: { min: 0, max: 49 }, // Mots 1-50 (très fréquents)
    intermediate: { min: 50, max: 129 }, // Mots 51-130
    advanced: { min: 130, max: 199 }, // Mots 131-200
  };
  const range = ranges[level] || ranges.beginner;

  // Mot du jour déterministe dans la plage du niveau
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000,
  );
  const rangeSize = range.max - range.min + 1;
  const wordIndex = range.min + (dayOfYear % rangeSize);
  const word = WORDS[wordIndex];

  // Difficulté lisible
  const difficultyLabels = {
    beginner: "🟢 Facile",
    intermediate: "🟡 Moyen",
    advanced: "🔴 Difficile",
  };
  const difficulty = difficultyLabels[level] || "🟢 Facile";

  // Vérifier si déjà complété aujourd'hui
  const completedKey = `nour_daily_${currentProfile}_${today}`;
  const isCompleted = localStorage.getItem(completedKey) === "true";

  return {
    word,
    wordIndex,
    isCompleted,
    completedKey,
    today,
    difficulty,
    level,
  };
}

function completeDailyChallenge() {
  const { completedKey } = getDailyChallenge();
  localStorage.setItem(completedKey, "true");
  state.xp += 20;
  saveState();
  updateUI();
  showXPAnimation("+20 XP 🎯");
  playSound("milestone");
  showToast("🎯 Défi du jour complété ! +20 XP");
  renderDailyChallenge();
}

function renderDailyChallenge() {
  const old = document.getElementById("dailyChallenge");
  if (old) old.remove();

  const { word, isCompleted, difficulty } = getDailyChallenge();
  if (!word) return;

  const card = document.createElement("div");
  card.id = "dailyChallenge";
  card.style.cssText = `
    background:linear-gradient(145deg,#1a1a35,#20203f);
    border:1px solid ${isCompleted ? "rgba(29,185,116,0.4)" : "rgba(212,168,67,0.3)"};
    border-radius:20px; padding:20px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4), ${isCompleted ? "0 0 20px rgba(29,185,116,0.1)" : "0 0 20px rgba(212,168,67,0.1)"};
    position:relative; overflow:hidden; margin-bottom:4px;
  `;

  card.innerHTML = `
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${isCompleted ? "linear-gradient(90deg,#1db974,#26d984)" : "linear-gradient(90deg,#d4a843,#f0c860)"};"></div>
    
    <!-- Header avec difficulté -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:22px;">🎯</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">Défi du jour</div>
          <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">${difficulty} · Nouveau demain</div>
        </div>
      </div>
      ${
        isCompleted
          ? '<span style="background:rgba(29,185,116,0.15);color:#1db974;border:1px solid rgba(29,185,116,0.3);padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;font-family:Outfit,sans-serif;">✅ Complété</span>'
          : '<span style="background:rgba(212,168,67,0.15);color:#d4a843;border:1px solid rgba(212,168,67,0.3);padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;font-family:Outfit,sans-serif;">+20 XP 🏆</span>'
      }
    </div>

    <!-- Mot arabe — toujours visible -->
    <div style="text-align:center;background:rgba(5,14,10,0.6);border-radius:14px;padding:20px;border:1px solid rgba(212,168,67,0.15);">
      <div style="font-family:Amiri,serif;font-size:72px;color:#d4a843;direction:rtl;filter:drop-shadow(0 0 16px rgba(212,168,67,0.3));">${word.arabic}</div>
      <div style="font-size:15px;color:rgba(29,185,116,0.8);font-style:italic;font-family:Outfit,sans-serif;margin-top:6px;">${word.transliteration}</div>
      <div style="font-size:11px;color:rgba(245,240,232,0.3);font-family:Outfit,sans-serif;margin-top:4px;">${word.verseRef}</div>
    </div>

    <!-- Si complété : afficher la réponse et le tip -->
    ${
      isCompleted
        ? `
      <div style="background:rgba(29,185,116,0.08);border:1px solid rgba(29,185,116,0.2);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">${word.meaning}</div>
        <div style="font-size:12px;color:rgba(245,240,232,0.45);font-family:Outfit,sans-serif;margin-top:6px;">💡 ${word.tip}</div>
      </div>
    `
        : `
      <!-- Pas encore complété : cacher la réponse, afficher le bouton -->
      <div style="background:rgba(212,168,67,0.05);border:1px dashed rgba(212,168,67,0.2);border-radius:12px;padding:14px;text-align:center;">
        <div style="font-size:13px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">
          🔒 Connais-tu la signification de ce mot ?
        </div>
      </div>
      <button onclick="showDailyQuiz()" style="
        width:100%;
        background:linear-gradient(135deg,#d4a843,#f0c860);
        color:#050e0a; border:none; border-radius:99px;
        padding:14px; font-size:15px; font-weight:800;
        font-family:Outfit,sans-serif; cursor:pointer;
        box-shadow:0 4px 20px rgba(212,168,67,0.4);
        transition:transform 0.15s;
      ">Relever le défi 🎯</button>
    `
    }
  `;

  // Insérer en haut de l'onglet Apprendre
  const learnPanel = document.getElementById("tab-learn");
  const sectionHeader = learnPanel?.querySelector(".section-header");
  if (sectionHeader) {
    sectionHeader.after(card);
  }
}

function showDailyQuiz() {
  const { word, difficulty } = getDailyChallenge();
  if (!word) return;

  const overlay = document.createElement("div");
  overlay.id = "dailyQuizOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:300; backdrop-filter:blur(8px);
    animation:fadeIn 0.3s ease;
  `;

  const correct = word.meaning;
  const wrongs = WRONG_ANSWERS.filter((w) => !correct.includes(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);

  overlay.innerHTML = `
    <div style="
      background:linear-gradient(180deg,#1a1a35,#111125);
      border-radius:24px 24px 0 0; padding:28px 24px 48px;
      width:100%; max-width:480px;
      border-top:3px solid #d4a843;
      box-shadow:0 -20px 60px rgba(0,0,0,0.5);
      animation:slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <h3 style="font-size:18px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">🎯 Défi du jour</h3>
          <div style="font-size:12px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">${difficulty}</div>
        </div>
        <button onclick="document.getElementById('dailyQuizOverlay').remove()" style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:22px;cursor:pointer;">✕</button>
      </div>

      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-family:Amiri,serif;font-size:72px;color:#d4a843;filter:drop-shadow(0 0 20px rgba(212,168,67,0.4));">${word.arabic}</div>
        <div style="font-size:16px;color:rgba(245,240,232,0.6);font-family:Outfit,sans-serif;margin-top:4px;">Que signifie ce mot ?</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;" id="dailyOptions">
        ${options
          .map(
            (opt) => `
          <button onclick="handleDailyAnswer(this, '${opt.replace(/'/g, "\'")}', '${correct.replace(/'/g, "\'")}')" style="
            background:rgba(245,240,232,0.05); border:1px solid rgba(245,240,232,0.1);
            border-radius:14px; padding:15px 18px; font-size:15px;
            color:#f5f0e8; font-family:Outfit,sans-serif; font-weight:500;
            cursor:pointer; text-align:left; transition:all 0.15s;
          ">${opt}</button>
        `,
          )
          .join("")}
      </div>
      <div id="dailyFeedback" style="display:none;margin-top:14px;padding:14px;border-radius:12px;text-align:center;font-weight:700;font-family:Outfit,sans-serif;font-size:15px;"></div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function handleDailyAnswer(btn, selected, correct) {
  document
    .querySelectorAll("#dailyOptions button")
    .forEach((b) => (b.style.pointerEvents = "none"));
  const feedback = document.getElementById("dailyFeedback");

  if (selected === correct) {
    btn.style.background = "rgba(34,197,94,0.15)";
    btn.style.borderColor = "#22c55e";
    btn.style.color = "#22c55e";
    feedback.textContent = "🎉 Excellent ! Tu as relevé le défi du jour !";
    feedback.style.cssText +=
      "display:block;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3);";
    haptic([50]);
    playSound("milestone");
    setTimeout(() => {
      document.getElementById("dailyQuizOverlay")?.remove();
      completeDailyChallenge();
    }, 1500);
  } else {
    btn.style.background = "rgba(239,68,68,0.1)";
    btn.style.borderColor = "#ef4444";
    btn.style.color = "#ef4444";
    document.querySelectorAll("#dailyOptions button").forEach((b) => {
      if (b.textContent === correct) {
        b.style.background = "rgba(34,197,94,0.1)";
        b.style.borderColor = "#22c55e";
        b.style.color = "#22c55e";
      }
    });
    feedback.textContent = `❌ C'était : ${correct}`;
    feedback.style.cssText +=
      "display:block;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);";
    haptic([100, 50, 100]);
    playSound("wrong");
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "Fermer";
    retryBtn.style.cssText =
      "margin-top:12px;width:100%;background:rgba(245,240,232,0.07);border:1px solid rgba(245,240,232,0.1);border-radius:99px;padding:12px;font-size:14px;color:rgba(245,240,232,0.6);font-family:Outfit,sans-serif;cursor:pointer;";
    retryBtn.onclick = () =>
      document.getElementById("dailyQuizOverlay")?.remove();
    document.getElementById("dailyFeedback").after(retryBtn);
  }
}

// ============================================
// RÉVISION INTENSIVE (Anki-style)
// ============================================

function getRepetitionsRequired() {
  const level = localStorage.getItem("nour_user_level") || "beginner";
  return { beginner: 3, intermediate: 2, advanced: 1 }[level] || 2;
}

function showIntensiveReview(wordId) {
  const word = WORDS.find((w) => w.id === wordId);
  if (!word) return;

  const required = getRepetitionsRequired();
  let current = 0;

  const overlay = document.createElement("div");
  overlay.id = "intensiveReview";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.9);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:400; backdrop-filter:blur(8px);
    animation:fadeIn 0.3s ease;
  `;

  function renderRound() {
    const correct = word.meaning;
    const wrongs = getCloseWrongAnswers(word, "meaning", 3);
    const options = shuffle([correct, ...wrongs]);
    const userLevel = localStorage.getItem("nour_user_level") || "beginner";
    const showPhonetic = userLevel === "beginner";

    overlay.innerHTML = `
      <div style="
        background:linear-gradient(180deg,#142b1f,#091510);
        border-radius:24px 24px 0 0; padding:24px 24px 44px;
        width:100%; max-width:480px;
        border-top:3px solid #1db974;
        box-shadow:0 -20px 60px rgba(0,0,0,0.6);
        animation:slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);
        display:flex; flex-direction:column; gap:16px;
      ">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3 style="font-size:16px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">🔁 Révision intensive</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <button onclick="changeIntensiveWord()" 
              style="background:rgba(29,185,116,0.1);border:1px solid rgba(29,185,116,0.3);color:#1db974;
              border-radius:99px;padding:6px 14px;font-size:12px;font-weight:700;
              font-family:Outfit,sans-serif;cursor:pointer;">Autre mot →</button>
            <button onclick="document.getElementById('intensiveReview').remove()" 
              style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:20px;cursor:pointer;">✕</button>
          </div>
        </div>

        <!-- Progression -->
        <div style="display:flex;gap:6px;">
          ${Array.from(
            { length: required },
            (_, i) => `
            <div style="flex:1;height:6px;border-radius:99px;
              background:${i < current ? "linear-gradient(90deg,#1db974,#26d984)" : "rgba(245,240,232,0.1)"};
              box-shadow:${i < current ? "0 0 8px rgba(29,185,116,0.4)" : "none"};
              transition:all 0.3s ease;">
            </div>
          `,
          ).join("")}
        </div>
        <div style="font-size:12px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;text-align:center;">
          ${current}/${required} répétitions
        </div>

        <!-- Mot -->
        <div style="text-align:center;background:rgba(5,14,10,0.6);border-radius:16px;padding:20px;border:1px solid rgba(212,168,67,0.15);">
          <div style="font-family:Amiri,serif;font-size:72px;color:#d4a843;filter:drop-shadow(0 0 20px rgba(212,168,67,0.3));">
            ${word.arabic}
          </div>
          ${showPhonetic ? `<div style="font-size:16px;color:#1db974;font-style:italic;font-family:Outfit,sans-serif;margin-top:4px;">${word.transliteration}</div>` : ""}
        </div>

        <!-- Question -->
        <div style="font-size:15px;color:rgba(245,240,232,0.6);font-family:Outfit,sans-serif;text-align:center;">
          Que signifie ce mot ?
        </div>

        <!-- Options -->
        <div style="display:flex;flex-direction:column;gap:10px;" id="intensiveOptions">
          ${options
            .map(
              (opt) => `
            <button onclick="handleIntensiveAnswer(this, '${opt.replace(/'/g, "\'")}', '${correct.replace(/'/g, "\'")}')" 
              style="background:rgba(245,240,232,0.05);border:1px solid rgba(245,240,232,0.1);
              border-radius:14px;padding:15px 18px;font-size:15px;color:#f5f0e8;
              font-family:Outfit,sans-serif;font-weight:500;cursor:pointer;text-align:left;
              transition:all 0.15s;">${opt}</button>
          `,
            )
            .join("")}
        </div>

        <div id="intensiveFeedback" style="display:none;padding:12px;border-radius:12px;text-align:center;font-weight:700;font-family:Outfit,sans-serif;font-size:14px;"></div>
      </div>
    `;
  }

  window._intensiveState = {
    word,
    current,
    required,
    renderRound,
    overlay,
    wordId,
  };

  renderRound();
  document.body.appendChild(overlay);
}

function handleIntensiveAnswer(btn, selected, correct) {
  const s = window._intensiveState;
  if (!s) return;

  document
    .querySelectorAll("#intensiveOptions button")
    .forEach((b) => (b.style.pointerEvents = "none"));
  const feedback = document.getElementById("intensiveFeedback");

  if (selected === correct) {
    btn.style.background = "rgba(34,197,94,0.15)";
    btn.style.borderColor = "#22c55e";
    btn.style.color = "#22c55e";
    s.current++;
    window._intensiveState.current = s.current;
    playSound("correct");
    haptic([50]);

    if (s.current >= s.required) {
      // Terminé !
      feedback.textContent = `🎉 Parfait ! Tu as répété ${s.required}x — mot bien mémorisé !`;
      feedback.style.cssText =
        "display:block;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:12px;";
      state.xp += s.required * 3;
      showXPAnimation(`+${s.required * 3} XP`);
      updateWordSRS(s.wordId, true);
      saveState();
      updateUI();
      playSound("milestone");
      setTimeout(() => {
        document.getElementById("intensiveReview")?.remove();
        showToast("✅ Mot bien mémorisé !");
      }, 1500);
    } else {
      feedback.textContent = `✅ ${s.current}/${s.required} — Continue !`;
      feedback.style.cssText =
        "display:block;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:12px;";
      setTimeout(() => {
        s.renderRound();
      }, 800);
    }
  } else {
    btn.style.background = "rgba(239,68,68,0.1)";
    btn.style.borderColor = "#ef4444";
    btn.style.color = "#ef4444";
    document.querySelectorAll("#intensiveOptions button").forEach((b) => {
      if (b.textContent === correct) {
        b.style.background = "rgba(34,197,94,0.1)";
        b.style.borderColor = "#22c55e";
        b.style.color = "#22c55e";
      }
    });
    // Réinitialiser le compteur
    s.current = 0;
    window._intensiveState.current = 0;
    feedback.textContent = `❌ Recommence depuis le début !`;
    feedback.style.cssText =
      "display:block;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:12px;";
    playSound("wrong");
    haptic([100, 50, 100]);
    setTimeout(() => {
      s.renderRound();
    }, 1200);
  }
}

// ============================================
// STATE
// ============================================

let state = {
  currentWordIndex: 0,
  learnedWords: [],
  streak: 0,
  xp: 0,
  lastVisit: null,
  totalQuizzes: 0,
  correctQuizzes: 0,
  quizActive: false,
  mode: "learn",
  srsData: {},
};

// ============================================
// INIT
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  checkStripeReturn();
  loadState();
  showSplash();
});

function showSplash() {
  setTimeout(() => {
    document.getElementById("splash").classList.add("fade-out");
    setTimeout(() => {
      document.getElementById("splash").style.display = "none";
      checkFirstVisit();
    }, 500);
  }, 2200);
}

async function checkFirstVisit() {
  if (!localStorage.getItem("nour_visited")) {
    showOnboarding();
    return;
  }

  // Vérifier si skip auth ou déjà connecté
  const skipAuth = localStorage.getItem("nour_skip_auth");
  const isConnected = await initAuth();

  if (isConnected || skipAuth) {
    showProfiles();
  } else {
    showAuthScreen();
  }
}

// ============================================
// ONBOARDING
// ============================================

let currentSlide = 0;

function showOnboarding() {
  document.getElementById("onboarding").classList.remove("hidden");
  document
    .getElementById("onboardingNext")
    .addEventListener("click", nextSlide);
}

function nextSlide() {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  // Slides de personnalisation (après les slides normaux)
  if (currentSlide === slides.length - 1) {
    // Dernier slide normal → montrer personnalisation niveau
    document.getElementById("onboarding").classList.add("hidden");
    showLevelSelection();
    return;
  }

  slides[currentSlide].classList.add("exit");
  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");
  setTimeout(() => slides[currentSlide].classList.remove("exit"), 400);
  currentSlide++;
  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
  if (currentSlide === slides.length - 1)
    document.getElementById("onboardingNext").textContent = "Continuer →";
}

function showLevelSelection() {
  const screen = document.createElement("div");
  screen.id = "levelScreen";
  screen.style.cssText = `
    position:fixed; inset:0; background:#050e0a;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    z-index:150; padding:32px 28px; gap:32px;
    animation:fadeIn 0.3s ease;
  `;

  screen.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;animation:float 3s ease infinite;">📖</div>
      <h2 style="font-size:26px;font-weight:800;color:#f5f0e8;margin-bottom:10px;">Quel est ton niveau ?</h2>
      <p style="font-size:15px;color:rgba(245,240,232,0.55);line-height:1.6;">On adapte l'app à ton niveau pour un apprentissage optimal</p>
    </div>

    <div style="width:100%;display:flex;flex-direction:column;gap:12px;">
      <button class="level-choice-btn" onclick="selectLevel('beginner', 0)" data-level="beginner">
        <span class="level-icon-btn">🌱</span>
        <div class="level-text">
          <div class="level-title">Débutant</div>
          <div class="level-desc">Je ne connais pas l'arabe</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
      <button class="level-choice-btn" onclick="selectLevel('intermediate', 19)" data-level="intermediate">
        <span class="level-icon-btn">📚</span>
        <div class="level-text">
          <div class="level-title">Intermédiaire</div>
          <div class="level-desc">Je connais quelques mots coraniques</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
      <button class="level-choice-btn" onclick="selectLevel('advanced', 49)" data-level="advanced">
        <span class="level-icon-btn">🎓</span>
        <div class="level-text">
          <div class="level-title">Avancé</div>
          <div class="level-desc">Je lis déjà le Coran régulièrement</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
    </div>
  `;

  document.body.appendChild(screen);
}

function selectLevel(level, startIndex) {
  localStorage.setItem("nour_user_level", level);
  const screen = document.getElementById("levelScreen");
  if (screen) screen.remove();
  showObjectiveSelection(startIndex);
}

function showObjectiveSelection(startIndex) {
  const screen = document.createElement("div");
  screen.id = "objectiveScreen";
  screen.style.cssText = `
    position:fixed; inset:0; background:#050e0a;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    z-index:150; padding:32px 28px; gap:32px;
    animation:fadeIn 0.3s ease;
  `;

  screen.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;animation:float 3s ease infinite;">🎯</div>
      <h2 style="font-size:26px;font-weight:800;color:#f5f0e8;margin-bottom:10px;">Quel est ton objectif ?</h2>
      <p style="font-size:15px;color:rgba(245,240,232,0.55);line-height:1.6;">On personnalise ton parcours d'apprentissage</p>
    </div>

    <div style="width:100%;display:flex;flex-direction:column;gap:12px;">
      <button class="level-choice-btn" onclick="selectObjective('prayers', ${startIndex})">
        <span class="level-icon-btn">🤲</span>
        <div class="level-text">
          <div class="level-title">Comprendre mes prières</div>
          <div class="level-desc">Fatiha, Tashahhud, Douas...</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
      <button class="level-choice-btn" onclick="selectObjective('quran', ${startIndex})">
        <span class="level-icon-btn">📖</span>
        <div class="level-text">
          <div class="level-title">Lire le Coran</div>
          <div class="level-desc">Comprendre les versets que je récite</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
      <button class="level-choice-btn" onclick="selectObjective('family', ${startIndex})">
        <span class="level-icon-btn">👨‍👩‍👧</span>
        <div class="level-text">
          <div class="level-title">Apprendre en famille</div>
          <div class="level-desc">Partager avec mes enfants</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
      <button class="level-choice-btn" onclick="selectObjective('all', ${startIndex})">
        <span class="level-icon-btn">🌟</span>
        <div class="level-text">
          <div class="level-title">Tout apprendre</div>
          <div class="level-desc">Maîtriser les 200 mots coraniques</div>
        </div>
        <span class="level-arrow">→</span>
      </button>
    </div>
  `;

  document.body.appendChild(screen);
}

function selectObjective(objective, startIndex) {
  localStorage.setItem("nour_user_objective", objective);
  localStorage.setItem("nour_visited", "true");

  const screen = document.getElementById("objectiveScreen");
  if (screen) screen.remove();

  // Appliquer le niveau de départ
  state.currentWordIndex = startIndex;
  saveState();

  showProfiles();
}

// ============================================
// APP
// ============================================

function showApp() {
  document.getElementById("app").classList.remove("hidden");
  updateStreak();
  renderLearnScreen("right");
  updateUI();
  updateReviewBadge();
  showPremiumBadge();
  setupTabs();
  setTimeout(() => showNotificationBanner(), 20000);
  // Vérifier statut premium côté serveur
  startPremiumWatcher().catch(() => {});
  // Appliquer thème enfant si nécessaire
  applyKidTheme();
  // Afficher défi du jour
  setTimeout(() => renderDailyChallenge(), 200);
  document.querySelector(".header-logo").addEventListener("click", () => {
    document.getElementById("app").classList.add("hidden");
    showProfiles();
  });

  // Afficher info connexion
  updateAuthBadge();
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".tab-panel")
        .forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      const panel = document.getElementById("tab-" + tab);
      panel.classList.remove("hidden");
      // Animation entrée onglet
      panel.classList.remove("anim-tab-slide");
      void panel.offsetWidth;
      panel.classList.add("anim-tab-slide");
      if (tab === "review") renderReviewTab();
      if (tab === "progress") renderProgress();
    });
  });
  document.getElementById("nextWord").addEventListener("click", goNextWord);
  document.getElementById("prevWord").addEventListener("click", goPrevWord);
}

// ============================================
// LEARN FLOW
// ============================================

function renderLearnScreen(direction = "right") {
  state.mode = "learn";
  const word = WORDS[state.currentWordIndex];
  if (!word) return;

  // Contenu
  document.getElementById("cardArabic").textContent = word.arabic;
  document.getElementById("cardTranslit").textContent = word.transliteration;
  document.getElementById("cardMeaning").textContent = word.meaning;
  document.getElementById("verseArabic").textContent = word.verseArabic;
  document.getElementById("verseFr").textContent = word.verseFr;
  document.getElementById("verseRef").textContent = word.verseRef;
  document.getElementById("lessonBadge").textContent =
    `Mot ${state.currentWordIndex + 1} / ${WORDS.length}`;

  // Afficher card, cacher quiz
  const card = document.getElementById("mainWordCard");
  const quiz = document.getElementById("quizSection");
  quiz.classList.add("hidden");
  card.classList.remove("hidden");

  // Animation entrée
  slideIn(card, direction);

  // Boutons
  document.getElementById("prevWord").disabled = state.currentWordIndex === 0;
  const nextIndex = state.currentWordIndex + 1;
  document.getElementById("nextWord").textContent =
    !isPremium() && nextIndex >= FREE_WORDS_LIMIT
      ? "🔒 Débloquer"
      : "J'ai compris →";

  // Reset audio
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio = null;
  }
  document.getElementById("audioBtn").innerHTML = "🔊 Écouter le verset";
  document.getElementById("audioBtn").style.opacity = "1";
}

// Partager le mot courant
function shareCurrentWord() {
  const word = WORDS[state.currentWordIndex];
  showShareModal("word", {
    word,
    wordIndex: state.learnedWords.length,
    total: state.learnedWords.length,
  });
}

// ============================================
// QUIZ VARIÉS AVEC PIÈGES
// ============================================

function getQuizType(wordIndex) {
  const learnedCount = state.learnedWords.length;
  const level = localStorage.getItem("nour_user_level") || "beginner";

  // Seuils d'activation selon le niveau
  const thresholds = {
    beginner: { C: 5, B: 10, E: 15, D: 20 },
    intermediate: { C: 2, B: 5, E: 8, D: 12 },
    advanced: { C: 1, B: 2, E: 3, D: 5 },
  };
  const t = thresholds[level] || thresholds.beginner;

  // Probabilités selon le niveau
  const weights = {
    beginner: { A: 0.6, C: 0.2, B: 0.1, E: 0.05, D: 0.05 },
    intermediate: { A: 0.35, C: 0.25, B: 0.15, E: 0.15, D: 0.1 },
    advanced: { A: 0.2, C: 0.25, B: 0.15, E: 0.2, D: 0.2 },
  };
  const w = weights[level] || weights.beginner;

  // Types disponibles selon mots appris
  let available = ["A"];
  if (learnedCount >= t.C) available.push("C");
  if (learnedCount >= t.B) available.push("B");
  if (learnedCount >= t.E) available.push("E");
  if (learnedCount >= t.D) available.push("D");

  if (available.length === 1) return "A";

  // Tirage pondéré parmi les disponibles
  const filtered = available.filter((t) => w[t]);
  const total = filtered.reduce((sum, t) => sum + w[t], 0);
  let rand = Math.random() * total;
  for (const type of filtered) {
    rand -= w[type];
    if (rand <= 0) return type;
  }
  return "A";
}

function buildQuizData(word, type) {
  const learnedWords = WORDS.filter(
    (w) => state.learnedWords.includes(w.id) && w.id !== word.id,
  );

  switch (type) {
    case "A": {
      // Mot arabe → Sens (standard)
      const correct = word.meaning;
      const wrongs = getCloseWrongAnswers(word, "meaning", 3);
      return {
        title: "🎯 As-tu retenu ?",
        question: "Quel est le sens de ce mot ?",
        display: word.arabic,
        displayType: "arabic",
        correct,
        options: shuffle([correct, ...wrongs]),
      };
    }
    case "B": {
      // Mot arabe → Translittération
      const correct = word.transliteration;
      const wrongs = WORDS.filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.transliteration);
      return {
        title: "🔤 Prononciation",
        question: "Comment se prononce ce mot ?",
        display: word.arabic,
        displayType: "arabic",
        correct,
        options: shuffle([correct, ...wrongs]),
      };
    }
    case "C": {
      // Sens → Mot arabe (inversé)
      const correct = word.arabic;
      const wrongs = WORDS.filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.arabic);
      return {
        title: "📖 Retrouve le mot",
        question: `Quel est le mot arabe pour "${word.meaning}" ?`,
        display: word.meaning,
        displayType: "text",
        correct,
        options: shuffle([correct, ...wrongs]),
        arabicOptions: true,
      };
    }
    case "D": {
      // Verset à trous
      const verseWithBlank = word.verseArabic.replace(word.arabic, "___");
      const correct = word.arabic;
      const wrongs = WORDS.filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.arabic);
      return {
        title: "📜 Complète le verset",
        question: "Quel mot manque dans ce verset ?",
        display: verseWithBlank,
        displayType: "verse",
        correct,
        options: shuffle([correct, ...wrongs]),
        arabicOptions: true,
      };
    }
    case "E": {
      // Rappel surprise — ancien mot
      if (learnedWords.length === 0) {
        return buildQuizData(word, "A"); // Fallback
      }
      const oldWord =
        learnedWords[
          Math.floor(Math.random() * Math.min(learnedWords.length, 10))
        ];
      const correct = oldWord.meaning;
      const wrongs = getCloseWrongAnswers(oldWord, "meaning", 3);
      return {
        title: "🔄 Rappel surprise !",
        question: "Tu te souviens de ce mot ?",
        display: oldWord.arabic,
        displayType: "arabic",
        correct,
        options: shuffle([correct, ...wrongs]),
        isSurprise: true,
        surpriseWord: oldWord,
      };
    }
    default:
      return buildQuizData(word, "A");
  }
}

function getCloseWrongAnswers(word, field, count) {
  // Trouver des mots de même catégorie pour des pièges plus subtils
  const sameFreqRange = WORDS.filter(
    (w) => w.id !== word.id && Math.abs(w.frequency - word.frequency) < 200,
  );

  const pool =
    sameFreqRange.length >= count
      ? sameFreqRange
      : WORDS.filter((w) => w.id !== word.id);

  return pool
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((w) => w[field]);
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function renderQuizScreen() {
  state.mode = "quiz";
  const word = WORDS[state.currentWordIndex];
  if (!word) return;

  const card = document.getElementById("mainWordCard");
  const quiz = document.getElementById("quizSection");

  // Choisir le type de quiz
  const quizType = getQuizType(state.currentWordIndex);
  const quizData = buildQuizData(word, quizType);

  // Stocker pour handleLearnQuizAnswer
  state.currentQuizData = quizData;
  state.currentQuizType = quizType;

  slideOut(card, "left").then(() => {
    card.classList.add("hidden");

    document.getElementById("quizTitle").textContent = quizData.title;
    document.getElementById("quizQuestion").textContent = quizData.question;
    document.getElementById("quizFeedback").className = "quiz-feedback hidden";

    // Afficher le contenu selon le type
    const quizArabic = document.getElementById("quizArabic");
    if (quizData.displayType === "arabic") {
      quizArabic.style.fontFamily = "var(--font-ar)";
      quizArabic.style.fontSize = "56px";
      quizArabic.style.direction = "rtl";
      quizArabic.textContent = quizData.display;
    } else if (quizData.displayType === "text") {
      quizArabic.style.fontFamily = "var(--font-fr)";
      quizArabic.style.fontSize = "24px";
      quizArabic.style.direction = "ltr";
      quizArabic.textContent = quizData.display;
    } else if (quizData.displayType === "verse") {
      quizArabic.style.fontFamily = "var(--font-ar)";
      quizArabic.style.fontSize = "22px";
      quizArabic.style.direction = "rtl";
      quizArabic.textContent = quizData.display;
    }

    // Construire les options
    const container = document.getElementById("quizOptions");
    container.innerHTML = "";
    quizData.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      if (quizData.arabicOptions) {
        btn.style.fontFamily = "var(--font-ar)";
        btn.style.fontSize = "24px";
        btn.style.direction = "rtl";
        btn.style.textAlign = "right";
      }
      btn.textContent = opt;
      btn.style.animation = `bounceIn 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms both`;
      btn.addEventListener("click", () =>
        handleLearnQuizAnswer(btn, opt, quizData.correct, word.id),
      );
      container.appendChild(btn);
    });

    quiz.classList.remove("hidden");
    slideIn(quiz, "right");

    document.getElementById("nextWord").textContent = "Passer →";
    document.getElementById("prevWord").disabled = true;
  });
}

function goNextWord() {
  const nextIndex = state.currentWordIndex + 1;

  if (!isPremium() && nextIndex >= FREE_WORDS_LIMIT) {
    if (!localStorage.getItem("nour_email_captured")) showEmailCapture();
    else showPaywall();
    return;
  }

  if (state.mode === "learn") {
    renderQuizScreen();
    return;
  }

  if (state.mode === "quiz") {
    const wordId = WORDS[state.currentWordIndex].id;
    if (!state.learnedWords.includes(wordId)) {
      state.learnedWords.push(wordId);
      state.xp += 10;
      showXPAnimation("+10 XP");
      checkBadges();
      updateReviewBadge();

      // Partage social aux milestones
      const count = state.learnedWords.length;
      const milestones = [5, 10, 25, 50, 100, 150, 200];
      if (milestones.includes(count)) {
        const level =
          LEVELS.find((l) => count >= l.min && count <= l.max) ||
          LEVELS[LEVELS.length - 1];
        playSound("milestone");
        setTimeout(
          () =>
            showShareTrigger("milestone", {
              count,
              levelName: level.name,
              levelIcon: level.icon,
            }),
          1500,
        );
      }
    }

    if (state.currentWordIndex < WORDS.length - 1) {
      const quiz = document.getElementById("quizSection");
      slideOut(quiz, "left").then(() => {
        quiz.classList.add("hidden");
        state.currentWordIndex++;
        saveState();
        renderLearnScreen("right");
        updateUI();
        document
          .querySelector(".tab-content")
          .scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }
}

function goPrevWord() {
  if (state.mode === "quiz") {
    renderLearnScreen("left");
    return;
  }
  if (state.currentWordIndex > 0) {
    state.currentWordIndex--;
    saveState();
    renderLearnScreen("left");
    updateUI();
  }
}

function handleLearnQuizAnswer(btn, selected, correct, wordId) {
  state.totalQuizzes++;
  document
    .querySelectorAll("#quizSection .quiz-option")
    .forEach((b) => (b.style.pointerEvents = "none"));
  const feedback = document.getElementById("quizFeedback");
  const isCorrect = selected === correct;

  updateWordSRS(wordId, isCorrect);

  if (isCorrect) {
    btn.classList.add("correct");
    state.correctQuizzes++;
    state.xp += 5;
    const msg = isKidProfile() ? getKidMessage("correct") : "✅ Bravo ! +5 XP";
    feedback.textContent = msg;
    feedback.className = "quiz-feedback success";
    showXPAnimation(isKidProfile() ? getKidMessage("xp") : "+5 XP");
    haptic([50]);
    playSound("correct");
    setTimeout(
      () => {
        if (state.mode === "quiz") goNextWord();
      },
      isKidProfile() ? 1800 : 1400,
    );
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll("#quizSection .quiz-option").forEach((b) => {
      if (b.textContent === correct) b.classList.add("correct");
    });
    const errMsg = isKidProfile()
      ? `${getKidMessage("wrong")} C'était : ${correct}`
      : `❌ C'était : ${correct}`;
    feedback.textContent = errMsg;
    feedback.className = "quiz-feedback error";
    haptic([100, 50, 100]);
    playSound("wrong");
  }

  document.getElementById("nextWord").textContent = "Mot suivant →";
  saveState();
  updateUI();
}

// ============================================
// RÉVISION SRS
// ============================================

let srsQueue = [];
let srsCurrentIndex = 0;

function renderReviewTab() {
  const toReview = getWordsToReviewToday();
  if (toReview.length === 0) {
    renderReviewGrid();
    return;
  }
  const container = document.getElementById("reviewGrid");
  container.innerHTML = `
    <div class="srs-start" style="grid-column:1/-1">
      <div class="srs-icon">🔄</div>
      <h3 class="srs-title">${toReview.length} mot${toReview.length > 1 ? "s" : ""} à réviser aujourd'hui</h3>
      <p class="srs-sub">Révise maintenant pour consolider ta mémoire</p>
      <button class="btn-primary" onclick="startSRSSession()" style="max-width:100%;margin-top:8px">Commencer la révision</button>
      <button class="srs-skip-btn" onclick="renderReviewGrid()">Voir tous mes mots →</button>
    </div>
  `;
}

function startSRSSession() {
  const toReview = getWordsToReviewToday();
  srsQueue = toReview
    .map((id) => WORDS.find((w) => w.id === id))
    .filter(Boolean)
    .sort(() => Math.random() - 0.5);
  srsCurrentIndex = 0;
  renderSRSCard();
}

function renderSRSCard() {
  if (srsCurrentIndex >= srsQueue.length) {
    renderSRSComplete();
    return;
  }
  const word = srsQueue[srsCurrentIndex];
  const container = document.getElementById("reviewGrid");
  const progress = `${srsCurrentIndex + 1} / ${srsQueue.length}`;
  const srsLevel = getMasteryLevel(word.id);
  const stars = "⭐".repeat(srsLevel) + "☆".repeat(Math.max(0, 5 - srsLevel));
  const correct = word.meaning;
  const wrongs = WRONG_ANSWERS.filter((w) => !correct.includes(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);

  const userLevel = localStorage.getItem("nour_user_level") || "beginner";
  const showTranslit = userLevel === "beginner";
  const showHint = userLevel === "beginner";

  container.innerHTML = `
    <div class="srs-card" style="grid-column:1/-1">
      <div class="srs-header">
        <span class="srs-progress">${progress}</span>
        <span class="srs-stars">${stars}</span>
      </div>
      <div class="srs-arabic">${word.arabic}</div>
      ${showTranslit ? `<div class="srs-translit">${word.transliteration}</div>` : ""}
      ${showHint ? `<div class="srs-hint">💡 Racine : ${word.root}</div>` : ""}
      <div class="srs-question">Que signifie ce mot ?</div>
      <div class="srs-options" id="srsOptions">
        ${options.map((opt) => `<button class="quiz-option" onclick="handleSRSAnswer(this, '${opt.replace(/'/g, "\\'")}', '${correct.replace(/'/g, "\\'")}', ${word.id})">${opt}</button>`).join("")}
      </div>
      <div class="quiz-feedback hidden" id="srsFeedback"></div>
    </div>
  `;
}

function handleSRSAnswer(btn, selected, correct, wordId) {
  document
    .querySelectorAll(".srs-options .quiz-option")
    .forEach((b) => (b.style.pointerEvents = "none"));
  const feedback = document.getElementById("srsFeedback");
  const isCorrect = selected === correct;
  updateWordSRS(wordId, isCorrect);
  state.totalQuizzes++;

  if (isCorrect) {
    btn.classList.add("correct");
    state.correctQuizzes++;
    state.xp += 3;
    feedback.textContent = `✅ Correct ! Prochain rappel dans ${SRS_INTERVALS[getWordSRS(wordId).level]} jour(s)`;
    feedback.className = "quiz-feedback success";
    showXPAnimation("+3 XP");
    haptic([50]);
    playSound("correct");
    setTimeout(() => {
      srsCurrentIndex++;
      saveState();
      updateUI();
      updateReviewBadge();
      renderSRSCard();
    }, 1200);
  } else {
    btn.classList.add("wrong");
    document.querySelectorAll(".srs-options .quiz-option").forEach((b) => {
      if (b.textContent === correct) b.classList.add("correct");
    });
    feedback.textContent = `❌ C'était : ${correct} — À revoir demain`;
    feedback.className = "quiz-feedback error";
    haptic([100, 50, 100]);
    const cont = document.createElement("button");
    cont.className = "btn-secondary";
    cont.textContent = "Continuer →";
    cont.style.cssText = "margin-top:12px;width:100%;";
    cont.onclick = () => {
      srsCurrentIndex++;
      saveState();
      updateUI();
      updateReviewBadge();
      renderSRSCard();
    };
    document.getElementById("srsFeedback").after(cont);
  }
  saveState();
}

function renderSRSComplete() {
  const container = document.getElementById("reviewGrid");
  container.innerHTML = `
    <div class="srs-complete" style="grid-column:1/-1">
      <div class="srs-complete-icon">🎉</div>
      <h3 class="srs-title">Révision terminée !</h3>
      <p class="srs-sub">Tu as révisé ${srsQueue.length} mot${srsQueue.length > 1 ? "s" : ""} aujourd'hui.</p>
      <div class="srs-xp-earned">+${srsQueue.length * 3} XP gagnés</div>
      <button class="btn-primary" onclick="renderReviewGrid()" style="max-width:100%;margin-top:16px">Voir tous mes mots</button>
    </div>
  `;
  updateReviewBadge();
}

function renderReviewGrid() {
  const container = document.getElementById("reviewGrid");
  if (!state.learnedWords.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>Apprends tes premiers mots pour les retrouver ici !</p></div>`;
    return;
  }
  const toReview = getWordsToReviewToday();
  let html = "";
  if (toReview.length > 0) {
    html += `<div class="review-alert" style="grid-column:1/-1">
      <span>🔄 ${toReview.length} mot${toReview.length > 1 ? "s" : ""} à réviser</span>
      <button onclick="startSRSSession()">Réviser →</button>
    </div>`;
  }

  // Bouton révision intensive
  if (state.learnedWords.length > 0) {
    html += `<div style="grid-column:1/-1;margin-bottom:4px;">
      <button onclick="startIntensiveSession()" style="
        width:100%;background:linear-gradient(145deg,#1a1a35,#20203f);
        border:1px solid rgba(129,140,248,0.3);border-radius:var(--radius);
        padding:14px 20px;display:flex;align-items:center;gap:12px;cursor:pointer;
        transition:all 0.2s;box-shadow:0 4px 16px rgba(0,0,0,0.3);
      ">
        <span style="font-size:24px;">🔁</span>
        <div style="text-align:left;flex:1;">
          <div style="font-size:14px;font-weight:700;color:#f5f0e8;font-family:Outfit,sans-serif;">Révision intensive</div>
          <div style="font-size:12px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">Répéter ${getRepetitionsRequired()}x de suite pour mémoriser</div>
        </div>
        <span style="color:#818cf8;font-size:18px;">→</span>
      </button>
    </div>`;
  }
  const userLevel = localStorage.getItem("nour_user_level") || "beginner";
  const showPhonetic = userLevel === "beginner";
  const showMeaning = userLevel !== "advanced";

  html += state.learnedWords
    .map((id) => {
      const w = WORDS.find((w) => w.id === id);
      if (!w) return "";
      const level = getMasteryLevel(id);
      const stars = "⭐".repeat(level);
      const needsReview = toReview.includes(id);
      return `
      <div class="review-card ${needsReview ? "needs-review" : ""} ${userLevel === "beginner" ? "review-card-beginner" : ""}" onclick="showWordDetail(${w.id})" oncontextmenu="startIntensiveForWord(${w.id}, event); return false;">
        <div class="review-arabic">${w.arabic}</div>
        ${showPhonetic ? `<div class="review-phonetic">${w.transliteration}</div>` : ""}
        ${showMeaning ? `<div class="review-meaning">${w.meaning}</div>` : ""}
        ${stars ? `<div class="review-stars">${stars}</div>` : ""}
        ${needsReview ? '<div class="review-due">À réviser</div>' : ""}
      </div>`;
    })
    .join("");
  container.innerHTML = html;
}

function startIntensiveSession() {
  if (!state.learnedWords.length) {
    showToast("Apprends d'abord quelques mots !");
    return;
  }
  const randomId =
    state.learnedWords[Math.floor(Math.random() * state.learnedWords.length)];
  showIntensiveReview(randomId);
}

function changeIntensiveWord() {
  // Choisir un autre mot aléatoire
  if (!state.learnedWords.length) return;
  const currentId = window._intensiveState?.wordId;
  const others = state.learnedWords.filter((id) => id !== currentId);
  const pool = others.length > 0 ? others : state.learnedWords;
  const randomId = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById("intensiveReview")?.remove();
  showIntensiveReview(randomId);
}

// Depuis la review card — clic long
function startIntensiveForWord(wordId, event) {
  event.stopPropagation();
  showIntensiveReview(wordId);
}

function updateReviewBadge() {
  const toReview = getWordsToReviewToday();
  const badge = document.getElementById("reviewTabBadge");
  if (badge) {
    if (toReview.length > 0) {
      badge.textContent = toReview.length;
      badge.classList.remove("hidden");
    } else badge.classList.add("hidden");
  }
}

function showWordDetail(id) {
  const w = WORDS.find((w) => w.id === id);
  if (!w) return;
  const srs = getWordSRS(id);
  alert(
    `${w.arabic}\n${w.transliteration}\n\n${w.meaning}\n\n💡 ${w.tip}\n\n📅 Prochain rappel : ${srs.nextReview || "Aujourd'hui"}`,
  );
}

// ============================================
// PROGRESS
// ============================================

function renderProgress() {
  document.getElementById("statWords").textContent = state.learnedWords.length;
  document.getElementById("statStreak").textContent = state.streak;
  document.getElementById("statXP").textContent = state.xp;
  document.getElementById("statQuiz").textContent =
    state.totalQuizzes > 0
      ? Math.round((state.correctQuizzes / state.totalQuizzes) * 100) + "%"
      : "0%";
  const level =
    LEVELS.find(
      (l) =>
        state.learnedWords.length >= l.min &&
        state.learnedWords.length <= l.max,
    ) || LEVELS[LEVELS.length - 1];
  document.querySelector(".level-icon").textContent = level.icon;
  document.getElementById("levelName").textContent = level.name;
  document.getElementById("levelDesc").textContent = level.desc;
  updateBadges();
  renderProgressChart();

  // Classement famille
  renderFamilyLeaderboard();

  // Bouton changer de profil
  let changeBtn = document.getElementById("changeProfileBtn");
  if (!changeBtn) {
    changeBtn = document.createElement("button");
    changeBtn.id = "changeProfileBtn";
    changeBtn.innerHTML = "👤 Changer de profil";
    changeBtn.className = "change-profile-btn";
    changeBtn.onclick = () => {
      document.getElementById("app").classList.add("hidden");
      showProfiles();
    };
    document.getElementById("tab-progress").appendChild(changeBtn);
  }

  // Bouton déconnexion si connecté
  let logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn && currentUser) {
    logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.innerHTML = "🚪 Se déconnecter";
    logoutBtn.className = "logout-profile-btn";
    logoutBtn.onclick = () => logoutUser();
    document.getElementById("tab-progress").appendChild(logoutBtn);
  }
}

function renderFamilyLeaderboard() {
  const oldBoard = document.getElementById("familyLeaderboard");
  if (oldBoard) oldBoard.remove();

  const profiles = loadProfiles();
  if (profiles.length < 2) return; // Besoin d'au moins 2 profils

  // Trier par XP décroissant
  const ranked = profiles
    .map((p, i) => ({
      ...p,
      index: i,
      xp: p.state?.xp || 0,
      streak: p.state?.streak || 0,
      words: p.state?.learnedWords?.length || 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  const medals = ["🥇", "🥈", "🥉", "🏅"];
  const isCurrentTop = ranked[0].index === currentProfile;

  const board = document.createElement("div");
  board.id = "familyLeaderboard";
  board.style.cssText = `
    background:linear-gradient(145deg,#142b1f,#1a3628);
    border:1px solid rgba(212,168,67,0.2);
    border-radius:20px; padding:20px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    position:relative; overflow:hidden;
  `;

  board.innerHTML = `
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#d4a843,#f0c860,#1db974);"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="font-size:15px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">🏆 Classement Famille</h3>
      <span style="font-size:12px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">${profiles.length} profils</span>
    </div>
    ${ranked
      .map((p, i) => {
        const isMe = p.index === currentProfile;
        return `
        <div style="
          display:flex; align-items:center; gap:12px;
          padding:12px 14px; border-radius:12px; margin-bottom:8px;
          background:${isMe ? "rgba(212,168,67,0.1)" : "rgba(245,240,232,0.03)"};
          border:1px solid ${isMe ? "rgba(212,168,67,0.3)" : "rgba(245,240,232,0.06)"};
          transition:all 0.2s;
        ">
          <span style="font-size:24px;width:32px;text-align:center;">${medals[i] || "🏅"}</span>
          <span style="font-size:28px;">${p.avatar}</span>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:${isMe ? "#f0c860" : "#f5f0e8"};font-family:Outfit,sans-serif;">
              ${p.name} ${isMe ? "(toi)" : ""}
            </div>
            <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">
              ${p.words} mots · 🔥 ${p.streak} jours
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;color:#d4a843;font-family:Outfit,sans-serif;">
              ${p.xp}
            </div>
            <div style="font-size:10px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">XP</div>
          </div>
        </div>
      `;
      })
      .join("")}
    ${
      isCurrentTop
        ? `
      <div style="text-align:center;padding:8px;font-size:13px;color:#1db974;font-family:Outfit,sans-serif;font-weight:600;">
        🎉 Tu es en tête de la famille !
      </div>
    `
        : `
      <div style="text-align:center;padding:8px;font-size:13px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">
        Continue pour grimper dans le classement !
      </div>
    `
    }
  `;

  const badgesSection = document.querySelector(".badges-section");
  if (badgesSection) badgesSection.after(board);
  else document.getElementById("tab-progress").appendChild(board);
}

function renderProgressChart() {
  // Supprimer l'ancien graphique si existe
  const oldChart = document.getElementById("progressChart");
  if (oldChart) oldChart.remove();

  const history = getDailyHistory();
  if (history.length < 2) return;

  const container = document.createElement("div");
  container.id = "progressChart";
  container.style.cssText = `
    background:linear-gradient(145deg,#142b1f,#1a3628);
    border:1px solid rgba(29,185,116,0.2);
    border-radius:20px; padding:20px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    margin-top:4px;
  `;

  // Derniers 14 jours
  const days = history.slice(-14);
  const maxWords = Math.max(...days.map((d) => d.words), 1);
  const maxXP = Math.max(...days.map((d) => d.xp), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="font-size:15px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">📈 Progression — 14 jours</h3>
      <span style="font-size:12px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">${days.length} sessions</span>
    </div>
    
    <div style="display:flex;align-items:flex-end;gap:4px;height:80px;margin-bottom:8px;">
      ${days
        .map((d) => {
          const heightWords = Math.round((d.words / maxWords) * 100);
          const date = new Date(d.date);
          const dayName = date.toLocaleDateString("fr-FR", {
            weekday: "short",
          });
          const isToday = d.date === getTodayStr();
          return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="width:100%;background:${isToday ? "linear-gradient(180deg,#f0c860,#d4a843)" : "linear-gradient(180deg,#1db974,#0d8a50)"};
              height:${Math.max(heightWords, 4)}%;border-radius:4px 4px 0 0;
              box-shadow:${isToday ? "0 0 8px rgba(212,168,67,0.4)" : "0 0 8px rgba(29,185,116,0.2)"};
              transition:height 0.5s ease;min-height:4px;">
            </div>
          </div>
        `;
        })
        .join("")}
    </div>

    <div style="display:flex;gap:4px;">
      ${days
        .map((d) => {
          const date = new Date(d.date);
          const dayName = date
            .toLocaleDateString("fr-FR", { weekday: "short" })
            .substring(0, 2);
          const isToday = d.date === getTodayStr();
          return `<div style="flex:1;text-align:center;font-size:9px;color:${isToday ? "#d4a843" : "rgba(245,240,232,0.3)"};font-family:Outfit,sans-serif;font-weight:${isToday ? "700" : "400"};">${dayName}</div>`;
        })
        .join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(245,240,232,0.07);">
      <div style="text-align:center;">
        <div style="font-size:20px;font-weight:800;color:#d4a843;font-family:Outfit,sans-serif;">${state.learnedWords.length}</div>
        <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">Mots total</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:20px;font-weight:800;color:#1db974;font-family:Outfit,sans-serif;">${history.length}</div>
        <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">Jours actifs</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:20px;font-weight:800;color:#818cf8;font-family:Outfit,sans-serif;">${state.xp}</div>
        <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">XP total</div>
      </div>
    </div>
  `;

  // Insérer après les badges
  const badgesSection = document.querySelector(".badges-section");
  if (badgesSection) {
    badgesSection.after(container);
  } else {
    document.getElementById("tab-progress").appendChild(container);
  }
}

function updateBadges() {
  const badges = document.querySelectorAll(".badge-item");
  const count = state.learnedWords.length;
  if (count >= 1) badges[0]?.classList.replace("locked", "unlocked");
  if (state.streak >= 7) badges[1]?.classList.replace("locked", "unlocked");
  if (count >= 10) badges[2]?.classList.replace("locked", "unlocked");
  if (count >= 50) badges[3]?.classList.replace("locked", "unlocked");
}

function checkBadges() {
  updateBadges();
}

// ============================================
// STREAK & UI
// ============================================

function updateStreak() {
  const today = new Date().toDateString();
  if (!state.lastVisit) {
    state.streak = 1;
  } else if (state.lastVisit !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.streak =
      state.lastVisit === yesterday.toDateString() ? state.streak + 1 : 1;
    // Animer le feu streak
    setTimeout(() => {
      const fire = document.querySelector(".streak-fire");
      if (fire) animateElement(fire, "anim-streak-bump", 600);
    }, 500);
  }
  state.lastVisit = today;
  saveState();
}

function updateUI() {
  document.getElementById("streakCount").textContent = state.streak;
  document.getElementById("xpCount").textContent = state.xp;
  const pct = Math.round((state.learnedWords.length / 200) * 100);
  document.getElementById("globalProgress").style.width = pct + "%";
  document.getElementById("progressLabel").textContent =
    `${state.learnedWords.length} / 200 mots`;
}

function showXPAnimation(text) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position:fixed; top:80px; right:20px;
    background:linear-gradient(135deg,#d4a843,#f0c860);
    color:#050e0a; padding:10px 20px; border-radius:99px;
    font-weight:800; font-size:15px; z-index:9999;
    pointer-events:none;
    box-shadow:0 4px 20px rgba(212,168,67,0.5);
    animation:xpFloat 1.6s ease forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function showToast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
    background:#142b1f; color:#f5f0e8; padding:12px 22px; border-radius:99px;
    font-size:13px; border:1px solid rgba(245,240,232,0.07); z-index:9999;
    white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,0.4);
    animation:bounceIn 0.4s cubic-bezier(0.34,1.2,0.64,1) forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ============================================
// AUDIO
// ============================================

function playAudio() {
  const word = WORDS[state.currentWordIndex];
  const btn = document.getElementById("audioBtn");
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio = null;
    btn.innerHTML = "🔊 Écouter le verset";
    btn.style.opacity = "1";
    return;
  }
  btn.innerHTML = "⏳ Chargement...";
  btn.style.opacity = "0.7";
  const audio = new Audio(
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${word.verseNumber || 1}.mp3`,
  );
  window.currentAudio = audio;
  audio.oncanplay = () => {
    btn.innerHTML = "⏸ Pause";
    btn.style.opacity = "1";
    audio.play();
  };
  audio.onended = () => {
    btn.innerHTML = "🔊 Écouter le verset";
    btn.style.opacity = "1";
    window.currentAudio = null;
  };
  audio.onerror = () => {
    btn.innerHTML = "🔊 Écouter le verset";
    btn.style.opacity = "1";
    window.currentAudio = null;
    showToast("Audio non disponible");
  };
}

// ============================================
// AUTH BADGE
// ============================================

function updateAuthBadge() {
  const badge = document.getElementById("premiumBadge");
  if (currentUser && badge) {
    // Afficher email court si connecté
    const email = currentUser.email || "";
    const short = email.split("@")[0].substring(0, 8);
    if (!isPremium()) {
      badge.textContent = "☁️ " + short;
      badge.classList.remove("hidden");
      badge.style.background = "rgba(29,185,116,0.2)";
      badge.style.color = "#26d984";
      badge.style.boxShadow = "none";
    }
  }
}

// Prononcer le mot seul
function pronounceWord() {
  const word = WORDS[state.currentWordIndex];
  const btn = document.getElementById("pronounceBtn");
  if (!btn) return;

  if (window.pronounceAudio) {
    window.pronounceAudio.pause();
    window.pronounceAudio = null;
    if (window.pronounceTimer) {
      clearTimeout(window.pronounceTimer);
      window.pronounceTimer = null;
    }
    btn.textContent = "🔈 Mot seul";
    btn.style.opacity = "1";
    return;
  }

  btn.textContent = "⏳ ...";
  btn.style.opacity = "0.7";

  const audio = new Audio(
    `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${word.verseNumber || 1}.mp3`,
  );
  window.pronounceAudio = audio;

  audio.oncanplay = () => {
    btn.textContent = "⏸ Stop";
    btn.style.opacity = "1";
    audio.play();
    window.pronounceTimer = setTimeout(() => {
      audio.pause();
      window.pronounceAudio = null;
      window.pronounceTimer = null;
      btn.textContent = "🔈 Mot seul";
      btn.style.opacity = "1";
    }, 2500);
  };

  audio.onended = () => {
    window.pronounceAudio = null;
    if (window.pronounceTimer) {
      clearTimeout(window.pronounceTimer);
    }
    btn.textContent = "🔈 Mot seul";
    btn.style.opacity = "1";
  };

  audio.onerror = () => {
    window.pronounceAudio = null;
    btn.textContent = "🔈 Mot seul";
    btn.style.opacity = "1";
    showToast("Audio non disponible");
  };
}

// ============================================
// SAVE / LOAD
// ============================================

function saveState() {
  if (currentProfile === null) return;
  const profiles = loadProfiles();
  if (profiles[currentProfile]) {
    // Tracker la progression journalière
    trackDailyProgress();
    profiles[currentProfile].state = state;
    saveProfiles(profiles);
    syncToCloud().catch(() => {});
  }
}

function trackDailyProgress() {
  const today = getTodayStr();
  const key = `nour_progress_${currentProfile}`;
  let history = JSON.parse(localStorage.getItem(key) || "[]");

  // Mettre à jour ou ajouter entrée du jour
  const existing = history.find((h) => h.date === today);
  if (existing) {
    existing.words = state.learnedWords.length;
    existing.xp = state.xp;
    existing.streak = state.streak;
  } else {
    history.push({
      date: today,
      words: state.learnedWords.length,
      xp: state.xp,
      streak: state.streak,
    });
  }

  // Garder 30 jours max
  if (history.length > 30) history = history.slice(-30);
  localStorage.setItem(key, JSON.stringify(history));
}

function getDailyHistory() {
  if (currentProfile === null) return [];
  const key = `nour_progress_${currentProfile}`;
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function loadState() {
  const saved = localStorage.getItem("nour_state");
  if (saved) {
    try {
      state = { ...state, ...JSON.parse(saved) };
    } catch (e) {}
  }
}
