// ============================================
// NOUR — Authentification Supabase v2
// ============================================

const SUPABASE_AUTH_URL = 'https://xlpdvsodgrdlpwuajzyr.supabase.co';
const SUPABASE_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscGR2c29kZ3JkbHB3dWFqenlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjkyMDcsImV4cCI6MjA5MzUwNTIwN30.RjVzdzv3daq84cTvUdwguFpNpSwXKPNL2iJf7KOLT7Q';

let currentUser = null;
let authToken = null;
let currentAuthMode = 'signin';

// ============================================
// API SUPABASE AUTH
// ============================================

async function supabaseSignUp(email, password) {
  const res = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_AUTH_KEY
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'Erreur inscription');
  return data;
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_AUTH_KEY
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Email ou mot de passe incorrect');
  return data;
}

async function supabaseSignOut() {
  if (!authToken) return;
  try {
    await fetch(`${SUPABASE_AUTH_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_AUTH_KEY
      }
    });
  } catch(e) {}
  currentUser = null;
  authToken = null;
  localStorage.removeItem('nour_auth_token');
  localStorage.removeItem('nour_auth_user');
  localStorage.removeItem('nour_refresh_token');
}

async function supabaseRefresh() {
  const refreshToken = localStorage.getItem('nour_refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_AUTH_KEY },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await res.json();
    if (data.access_token) {
      authToken = data.access_token;
      currentUser = data.user;
      localStorage.setItem('nour_auth_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('nour_refresh_token', data.refresh_token);
      localStorage.setItem('nour_auth_user', JSON.stringify(data.user));
      return true;
    }
  } catch(e) {}
  return false;
}

// ============================================
// CLOUD SYNC
// ============================================

async function saveProfileToCloud(profileData) {
  if (!authToken || !currentUser) return;
  try {
    const payload = {
      user_id: currentUser.id,
      profile_name: profileData.name,
      avatar: profileData.avatar || '🧑',
      learned_words: JSON.stringify(profileData.state?.learnedWords || []),
      srs_data: JSON.stringify(profileData.state?.srsData || {}),
      streak: profileData.state?.streak || 0,
      xp: profileData.state?.xp || 0,
      last_visit: profileData.state?.lastVisit || null,
      total_quizzes: profileData.state?.totalQuizzes || 0,
      correct_quizzes: profileData.state?.correctQuizzes || 0,
      is_premium: localStorage.getItem('nour_premium') === 'true'
    };

    // Upsert (insert ou update)
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_AUTH_KEY,
        'Authorization': `Bearer ${authToken}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'on_conflict': 'user_id,profile_name'
      },
      body: JSON.stringify(payload)
    });
  } catch(e) {
    console.log('Sync cloud erreur:', e);
  }
}

async function loadProfilesFromCloud() {
  if (!authToken || !currentUser) return null;
  try {
    const res = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/profiles?user_id=eq.${currentUser.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_AUTH_KEY,
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.length) return null;

    return data.map(p => ({
      name: p.profile_name,
      avatar: p.avatar || '🧑',
      state: {
        learnedWords: safeJsonParse(p.learned_words, []),
        srsData: safeJsonParse(p.srs_data, {}),
        streak: p.streak || 0,
        xp: p.xp || 0,
        lastVisit: p.last_visit || null,
        totalQuizzes: p.total_quizzes || 0,
        correctQuizzes: p.correct_quizzes || 0,
        currentWordIndex: 0,
        quizActive: false,
        mode: 'learn'
      }
    }));
  } catch(e) {
    console.log('Chargement cloud erreur:', e);
    return null;
  }
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch(e) { return fallback; }
}

async function syncToCloud() {
  if (!authToken || typeof currentProfile === 'undefined' || currentProfile === null) return;
  try {
    const profiles = loadProfiles();
    if (profiles[currentProfile]) {
      await saveProfileToCloud(profiles[currentProfile]);
    }
  } catch(e) {}
}

// ============================================
// INIT AUTH
// ============================================

async function initAuth() {
  const savedToken = localStorage.getItem('nour_auth_token');
  const savedUser = localStorage.getItem('nour_auth_user');

  if (!savedToken || !savedUser) return false;

  authToken = savedToken;
  try { currentUser = JSON.parse(savedUser); } catch(e) { return false; }

  // Tenter refresh
  const ok = await supabaseRefresh();
  if (!ok) {
    authToken = savedToken; // garder l'ancien en fallback
    currentUser = JSON.parse(savedUser);
  }
  return true;
}

// ============================================
// ÉCRAN AUTH
// ============================================

function showAuthScreen() {
  // Ne pas afficher si déjà affiché
  if (document.getElementById('authScreen')) return;

  const screen = document.createElement('div');
  screen.id = 'authScreen';
  screen.style.cssText = `
    position:fixed; inset:0;
    background:linear-gradient(180deg,#050e0a 0%,#091510 100%);
    display:flex; align-items:center; justify-content:center;
    z-index:200; padding:24px;
    animation:fadeIn 0.3s ease;
    overflow-y:auto;
  `;

  screen.innerHTML = `
    <div style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:24px;padding:20px 0;">

      <div style="text-align:center;">
        <div style="font-size:52px;margin-bottom:12px;animation:float 3s ease infinite;">🕌</div>
        <h2 style="font-size:26px;font-weight:800;color:#f5f0e8;margin-bottom:8px;">Bienvenue sur Nour</h2>
        <p style="font-size:15px;color:rgba(245,240,232,0.55);line-height:1.6;">Connecte-toi pour sauvegarder ta progression sur tous tes appareils</p>
      </div>

      <div style="background:#142b1f;border:1px solid rgba(29,185,116,0.2);border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

        <div style="display:flex;border-bottom:1px solid rgba(245,240,232,0.07);">
          <button id="tabSignin" onclick="switchAuthTab('signin')" style="flex:1;padding:14px;background:rgba(29,185,116,0.1);border:none;color:#26d984;font-weight:700;font-size:14px;font-family:Outfit,sans-serif;cursor:pointer;border-bottom:2px solid #1db974;transition:all 0.2s;">Connexion</button>
          <button id="tabSignup" onclick="switchAuthTab('signup')" style="flex:1;padding:14px;background:none;border:none;color:rgba(245,240,232,0.4);font-weight:600;font-size:14px;font-family:Outfit,sans-serif;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;">Inscription</button>
        </div>

        <div style="padding:24px;display:flex;flex-direction:column;gap:14px;">
          <input id="authEmail" type="email" placeholder="Ton email" autocomplete="email"
            style="background:#0f2018;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:15px 18px;font-size:16px;color:#f5f0e8;font-family:Outfit,sans-serif;width:100%;outline:none;box-sizing:border-box;" />
          <input id="authPassword" type="password" placeholder="Mot de passe (min. 6 caractères)" autocomplete="current-password"
            style="background:#0f2018;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:15px 18px;font-size:16px;color:#f5f0e8;font-family:Outfit,sans-serif;width:100%;outline:none;box-sizing:border-box;" />
          <div id="authError" style="font-size:13px;color:#ef4444;display:none;padding:4px 4px;background:rgba(239,68,68,0.1);border-radius:8px;border:1px solid rgba(239,68,68,0.3);text-align:center;"></div>
          <button id="authSubmit" onclick="handleAuthSubmit()"
            style="background:linear-gradient(135deg,#1db974,#26d984);color:#fff;border:none;border-radius:99px;padding:16px;font-size:16px;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer;box-shadow:0 6px 28px rgba(29,185,116,0.45);transition:transform 0.15s;">
            Se connecter
          </button>
        </div>
      </div>

      <div style="text-align:center;display:flex;flex-direction:column;gap:10px;">
        <button onclick="skipAuth()"
          style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:14px;font-family:Outfit,sans-serif;cursor:pointer;text-decoration:underline;padding:8px;">
          Continuer sans compte
        </button>
        <p style="font-size:12px;color:rgba(245,240,232,0.25);">Tes données resteront uniquement sur cet appareil</p>
      </div>

    </div>
  `;

  document.body.appendChild(screen);

  // Enter key submit
  screen.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });
  });
}

function switchAuthTab(tab) {
  currentAuthMode = tab;
  const signinTab = document.getElementById('tabSignin');
  const signupTab = document.getElementById('tabSignup');
  const submitBtn = document.getElementById('authSubmit');
  const errorEl = document.getElementById('authError');
  if (!signinTab) return;

  errorEl.style.display = 'none';

  if (tab === 'signin') {
    signinTab.style.cssText += 'background:rgba(29,185,116,0.1);color:#26d984;border-bottom:2px solid #1db974;';
    signupTab.style.cssText += 'background:none;color:rgba(245,240,232,0.4);border-bottom:2px solid transparent;';
    submitBtn.textContent = 'Se connecter';
  } else {
    signupTab.style.cssText += 'background:rgba(29,185,116,0.1);color:#26d984;border-bottom:2px solid #1db974;';
    signinTab.style.cssText += 'background:none;color:rgba(245,240,232,0.4);border-bottom:2px solid transparent;';
    submitBtn.textContent = "S'inscrire";
  }
}

async function handleAuthSubmit() {
  const emailEl = document.getElementById('authEmail');
  const passwordEl = document.getElementById('authPassword');
  const submitBtn = document.getElementById('authSubmit');
  const errorEl = document.getElementById('authError');

  if (!emailEl || !passwordEl) return;

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  // Validation
  if (!email) { showAuthError('Entre ton email'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('Email invalide'); return; }
  if (!password) { showAuthError('Entre ton mot de passe'); return; }
  if (password.length < 6) { showAuthError('Mot de passe trop court (min. 6 caractères)'); return; }

  submitBtn.textContent = 'Chargement...';
  submitBtn.disabled = true;
  errorEl.style.display = 'none';

  try {
    let data;

    if (currentAuthMode === 'signup') {
      data = await supabaseSignUp(email, password);
      if (data.access_token) {
        // Inscription réussie avec session
        await onAuthSuccess(data);
      } else {
        // Email de confirmation envoyé (si activé)
        showAuthError('Vérifie ton email pour confirmer ton compte, puis connecte-toi.');
        submitBtn.textContent = "S'inscrire";
        submitBtn.disabled = false;
      }
    } else {
      data = await supabaseSignIn(email, password);
      await onAuthSuccess(data);
    }

  } catch(e) {
    showAuthError(e.message || 'Une erreur est survenue');
    submitBtn.textContent = currentAuthMode === 'signup' ? "S'inscrire" : 'Se connecter';
    submitBtn.disabled = false;
  }
}

async function onAuthSuccess(data) {
  authToken = data.access_token;
  currentUser = data.user;
  localStorage.setItem('nour_auth_token', data.access_token);
  if (data.refresh_token) localStorage.setItem('nour_refresh_token', data.refresh_token);
  localStorage.setItem('nour_auth_user', JSON.stringify(data.user));

  // Charger profils depuis le cloud
  try {
    const cloudProfiles = await loadProfilesFromCloud();
    if (cloudProfiles && cloudProfiles.length > 0) {
      saveProfiles(cloudProfiles);
      showToast('☁️ Progression restaurée !');
    }
  } catch(e) {}

  // Fermer l'écran auth
  const screen = document.getElementById('authScreen');
  if (screen) screen.remove();

  showToast('✅ Connecté !');
  showProfiles();
}

function showAuthError(msg) {
  const errorEl = document.getElementById('authError');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

function skipAuth() {
  localStorage.setItem('nour_skip_auth', 'true');
  const screen = document.getElementById('authScreen');
  if (screen) screen.remove();
  showProfiles();
}

// Déconnexion (accessible depuis les profils)
async function logoutUser() {
  if (confirm('Se déconnecter ? Ta progression restera sauvegardée.')) {
    await supabaseSignOut();
    localStorage.removeItem('nour_skip_auth');
    location.reload();
  }
}
