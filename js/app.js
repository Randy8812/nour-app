// ============================================
// NOUR — App v9 — Animations Premium
// ============================================

const SUPABASE_URL = "https://xlpdvsodgrdlpwuajzyr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscGR2c29kZ3JkbHB3dWFqenlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjkyMDcsImV4cCI6MjA5MzUwNTIwN30.RjVzdzv3daq84cTvUdwguFpNpSwXKPNL2iJf7KOLT7Q";
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/eVq8wO85U5o7f2u7Ef2Ji00";
const FREE_WORDS_LIMIT = 15;

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

function checkStripeReturn() {
  // Déléguer à premium.js
  handleStripeReturn().catch(() => {
    // Fallback
    const params = new URLSearchParams(window.location.search);
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

function renderQuizScreen() {
  state.mode = "quiz";
  const word = WORDS[state.currentWordIndex];
  if (!word) return;

  const card = document.getElementById("mainWordCard");
  const quiz = document.getElementById("quizSection");

  // Animer sortie card
  slideOut(card, "left").then(() => {
    card.classList.add("hidden");

    // Préparer quiz
    document.getElementById("quizTitle").textContent = "🎯 As-tu retenu ?";
    document.getElementById("quizQuestion").textContent =
      "Quel est le sens de ce mot ?";
    document.getElementById("quizArabic").textContent = word.arabic;
    document.getElementById("quizFeedback").className = "quiz-feedback hidden";

    const correct = word.meaning;
    const wrongs = WRONG_ANSWERS.filter((w) => !correct.includes(w))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [correct, ...wrongs].sort(() => Math.random() - 0.5);

    const container = document.getElementById("quizOptions");
    container.innerHTML = "";
    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.style.animationDelay = `${i * 60}ms`;
      btn.style.animation = `bounceIn 0.4s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms both`;
      btn.addEventListener("click", () =>
        handleLearnQuizAnswer(btn, opt, correct, word.id),
      );
      container.appendChild(btn);
    });

    // Animer entrée quiz
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

  container.innerHTML = `
    <div class="srs-card" style="grid-column:1/-1">
      <div class="srs-header">
        <span class="srs-progress">${progress}</span>
        <span class="srs-stars">${stars}</span>
      </div>
      <div class="srs-arabic">${word.arabic}</div>
      <div class="srs-translit">${word.transliteration}</div>
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
  html += state.learnedWords
    .map((id) => {
      const w = WORDS.find((w) => w.id === id);
      if (!w) return "";
      const level = getMasteryLevel(id);
      const stars = "⭐".repeat(level);
      const needsReview = toReview.includes(id);
      return `
      <div class="review-card ${needsReview ? "needs-review" : ""}" onclick="showWordDetail(${w.id})">
        <div class="review-arabic">${w.arabic}</div>
        <div class="review-meaning">${w.meaning}</div>
        ${stars ? `<div class="review-stars">${stars}</div>` : ""}
        ${needsReview ? '<div class="review-due">À réviser</div>' : ""}
      </div>`;
    })
    .join("");
  container.innerHTML = html;
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
