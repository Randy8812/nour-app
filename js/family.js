// ============================================
// NOUR — Système Famille Connecté
// ============================================

const FAMILY_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ============================================
// CODE FAMILLE
// ============================================

function generateFamilyCode() {
  const existing = localStorage.getItem("nour_family_code");
  if (existing) return existing;
  const code = "FAM" + Math.random().toString(36).substring(2, 8).toUpperCase();
  localStorage.setItem("nour_family_code", code);
  localStorage.setItem("nour_family_owner", "true");
  return code;
}

function getFamilyCode() {
  return localStorage.getItem("nour_family_code");
}

function isFamilyOwner() {
  return localStorage.getItem("nour_family_owner") === "true";
}

// ============================================
// SYNC SUPABASE
// ============================================

async function syncFamilyScore() {
  if (!authToken || !currentUser) return;
  const familyCode = getFamilyCode();
  if (!familyCode) return;

  const profiles = loadProfiles();
  if (currentProfile === null || !profiles[currentProfile]) return;

  const profile = profiles[currentProfile];
  const payload = {
    family_code: familyCode,
    user_id: currentUser.id,
    profile_name: profile.name,
    avatar: profile.avatar || "🧑",
    xp: profile.state?.xp || 0,
    streak: profile.state?.streak || 0,
    words_count: profile.state?.learnedWords?.length || 0,
    updated_at: new Date().toISOString(),
  };

  try {
    // Upsert — insert ou update
    await fetch(`${SUPABASE_AUTH_URL}/rest/v1/families`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_AUTH_KEY,
        Authorization: `Bearer ${authToken}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
        on_conflict: "family_code,user_id,profile_name",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.log("Family sync error:", e);
  }
}

async function loadFamilyLeaderboard(familyCode) {
  if (!authToken) return null;
  try {
    const res = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/families?family_code=eq.${familyCode}&order=xp.desc&select=*`,
      {
        headers: {
          apikey: SUPABASE_AUTH_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ============================================
// MODAL PARTAGE FAMILLE
// ============================================

function showFamilyShareModal(code) {
  const shareUrl = `https://nour-app-indol.vercel.app/?family=${code}`;

  const modal = document.createElement("div");
  modal.id = "familyShareModal";
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:1000; backdrop-filter:blur(8px);
    animation:fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,#1a1a35,#111125);
      border-radius:24px 24px 0 0; padding:28px 24px 48px;
      width:100%; max-width:480px;
      border-top:3px solid #818cf8;
      box-shadow:0 -20px 60px rgba(0,0,0,0.6);
      animation:slideUp 0.4s cubic-bezier(0.34,1.2,0.64,1);
      display:flex; flex-direction:column; gap:16px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <h3 style="font-size:18px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">👨‍👩‍👧 Partage avec ta famille</h3>
        <button onclick="document.getElementById('familyShareModal').remove()"
          style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:22px;cursor:pointer;">✕</button>
      </div>

      <p style="font-size:14px;color:rgba(245,240,232,0.6);font-family:Outfit,sans-serif;line-height:1.6;">
        Partage ce lien avec ta famille. Chacun aura le Premium <strong style="color:#f5f0e8;">et</strong> apparaîtra dans le classement famille !
      </p>

      <div style="background:rgba(129,140,248,0.1);border:1px solid rgba(129,140,248,0.3);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:11px;color:rgba(129,140,248,0.7);font-family:Outfit,sans-serif;font-weight:700;letter-spacing:1px;">LIEN D'ACTIVATION FAMILLE</div>
        <div style="font-size:13px;color:#f5f0e8;font-family:Outfit,sans-serif;word-break:break-all;background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;">${shareUrl}</div>
        <div style="font-size:11px;color:rgba(129,140,248,0.5);font-family:Outfit,sans-serif;">Code : <strong style="color:#818cf8;">${code}</strong></div>
      </div>

      <button onclick="copyFamilyLink('${shareUrl}')" style="
        background:linear-gradient(135deg,#818cf8,#a78bfa);
        color:#fff; border:none; border-radius:99px; padding:16px;
        font-size:15px; font-weight:800; font-family:Outfit,sans-serif; cursor:pointer;
        box-shadow:0 6px 24px rgba(129,140,248,0.4);
      ">📋 Copier le lien</button>

      <button onclick="shareFamilyLink('${shareUrl}')" style="
        background:linear-gradient(135deg,#1db974,#26d984);
        color:#050e0a; border:none; border-radius:99px; padding:14px;
        font-size:15px; font-weight:700; font-family:Outfit,sans-serif; cursor:pointer;
      ">📤 Partager sur WhatsApp</button>

      <button onclick="document.getElementById('familyShareModal').remove()" style="
        background:none; border:none; color:rgba(245,240,232,0.4);
        font-size:14px; font-family:Outfit,sans-serif; cursor:pointer; padding:4px;
      ">Fermer</button>
    </div>
  `;

  document.body.appendChild(modal);
}

function copyFamilyLink(url) {
  navigator.clipboard
    ?.writeText(url)
    .then(() => {
      showToast("✅ Lien copié !");
    })
    .catch(() => {
      showToast("Lien : " + url);
    });
}

function shareFamilyLink(url) {
  const text = `Rejoins ma famille sur Nour et apprends l'arabe coranique ! 🕌\n\nClique ici pour activer ton accès Premium gratuit :\n${url}`;
  if (navigator.share) {
    navigator.share({ title: "Nour — Famille", text });
  } else {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  }
}

// ============================================
// REJOINDRE UNE FAMILLE
// ============================================

function checkFamilyJoin() {
  const params = new URLSearchParams(window.location.search);
  const familyCode = params.get("family");
  if (!familyCode) return false;

  // Valider le format
  if (!familyCode.startsWith("FAM") || familyCode.length !== 9) return false;

  // Activer Premium + sauvegarder code famille
  localStorage.setItem("nour_premium", "true");
  localStorage.setItem("nour_family_code", familyCode);
  localStorage.setItem("nour_family_owner", "false");
  window.history.replaceState({}, "", "/");

  setTimeout(() => {
    showFamilyWelcome(familyCode);
  }, 1500);

  return true;
}

function showFamilyWelcome(code) {
  const modal = document.createElement("div");
  modal.id = "familyWelcomeModal";
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center;
    z-index:1000; backdrop-filter:blur(8px);
    padding:24px;
    animation:fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(145deg,#142b1f,#1a3628);
      border-radius:24px; padding:32px 24px;
      width:100%; max-width:360px;
      border:1px solid rgba(29,185,116,0.3);
      box-shadow:0 20px 60px rgba(0,0,0,0.6);
      display:flex; flex-direction:column; gap:16px;
      text-align:center;
      animation:bounceIn 0.5s cubic-bezier(0.34,1.2,0.64,1);
    ">
      <div style="font-size:56px;">👨‍👩‍👧</div>
      <h3 style="font-size:22px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">Bienvenue dans la famille !</h3>
      <p style="font-size:14px;color:rgba(245,240,232,0.6);font-family:Outfit,sans-serif;line-height:1.6;">
        Ton accès Premium est activé 🎉<br>
        Tu rejoins le classement famille — que le meilleur gagne !
      </p>
      <div style="background:rgba(29,185,116,0.1);border:1px solid rgba(29,185,116,0.2);border-radius:12px;padding:12px;">
        <div style="font-size:12px;color:rgba(29,185,116,0.7);font-family:Outfit,sans-serif;">Code famille</div>
        <div style="font-size:18px;font-weight:800;color:#1db974;font-family:Outfit,sans-serif;letter-spacing:2px;">${code}</div>
      </div>
      <button onclick="document.getElementById('familyWelcomeModal').remove()" style="
        background:linear-gradient(135deg,#1db974,#26d984);
        color:#050e0a; border:none; border-radius:99px; padding:16px;
        font-size:16px; font-weight:800; font-family:Outfit,sans-serif; cursor:pointer;
        box-shadow:0 6px 24px rgba(29,185,116,0.4);
      ">Commencer à apprendre 🚀</button>
    </div>
  `;

  document.body.appendChild(modal);
  playSound("milestone");
  haptic([50, 30, 100]);
}

// ============================================
// CLASSEMENT FAMILLE CONNECTÉ
// ============================================

async function renderConnectedFamilyLeaderboard() {
  const familyCode = getFamilyCode();
  if (!familyCode || !authToken) return;

  // Sync d'abord
  await syncFamilyScore();

  // Charger le classement
  const members = await loadFamilyLeaderboard(familyCode);
  if (!members || members.length === 0) return;

  // Supprimer l'ancien classement
  const old = document.getElementById("connectedLeaderboard");
  if (old) old.remove();

  const medals = ["🥇", "🥈", "🥉", "🏅"];
  const myUserId = currentUser?.id;

  const board = document.createElement("div");
  board.id = "connectedLeaderboard";
  board.style.cssText = `
    background:linear-gradient(145deg,#1a1a35,#20203f);
    border:1px solid rgba(129,140,248,0.2);
    border-radius:20px; padding:20px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    position:relative; overflow:hidden;
    margin-top:4px;
  `;

  board.innerHTML = `
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#818cf8,#a78bfa,#c084fc);"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="font-size:15px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">🌐 Classement Famille</h3>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:rgba(129,140,248,0.6);font-family:Outfit,sans-serif;">${members.length} membre${members.length > 1 ? "s" : ""}</span>
        <button onclick="showFamilyShareModal('${familyCode}')" style="
          background:rgba(129,140,248,0.1);border:1px solid rgba(129,140,248,0.3);
          color:#818cf8;border-radius:99px;padding:4px 12px;font-size:11px;font-weight:700;
          font-family:Outfit,sans-serif;cursor:pointer;
        ">+ Inviter</button>
      </div>
    </div>
    ${members
      .map((m, i) => {
        const isMe =
          m.user_id === myUserId &&
          m.profile_name === (loadProfiles()[currentProfile]?.name || "");
        return `
        <div style="
          display:flex; align-items:center; gap:12px;
          padding:12px 14px; border-radius:12px; margin-bottom:8px;
          background:${isMe ? "rgba(129,140,248,0.1)" : "rgba(245,240,232,0.03)"};
          border:1px solid ${isMe ? "rgba(129,140,248,0.3)" : "rgba(245,240,232,0.06)"};
        ">
          <span style="font-size:22px;width:30px;text-align:center;">${medals[i] || "🏅"}</span>
          <span style="font-size:26px;">${m.avatar}</span>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:${isMe ? "#818cf8" : "#f5f0e8"};font-family:Outfit,sans-serif;">
              ${m.profile_name} ${isMe ? "(toi)" : ""}
            </div>
            <div style="font-size:11px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;margin-top:2px;">
              ${m.words_count} mots · 🔥 ${m.streak}j
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;color:#818cf8;font-family:Outfit,sans-serif;">${m.xp}</div>
            <div style="font-size:10px;color:rgba(245,240,232,0.4);font-family:Outfit,sans-serif;">XP</div>
          </div>
        </div>
      `;
      })
      .join("")}
    <div style="text-align:center;padding:6px;font-size:11px;color:rgba(245,240,232,0.2);font-family:Outfit,sans-serif;">
      Code famille : ${familyCode}
    </div>
  `;

  // Insérer dans l'onglet progrès
  const badgesSection = document.querySelector(".badges-section");
  if (badgesSection) badgesSection.after(board);
  else document.getElementById("tab-progress")?.appendChild(board);
}

// ============================================
// BOUTON PARTAGE DANS PROGRÈS
// ============================================

function showFamilyInviteButton() {
  const familyCode = getFamilyCode();
  if (!familyCode) return;

  const old = document.getElementById("familyInviteBtn");
  if (old) return;

  const btn = document.createElement("button");
  btn.id = "familyInviteBtn";
  btn.innerHTML = "👨‍👩‍👧 Inviter ma famille";
  btn.style.cssText = `
    background:linear-gradient(145deg,#1a1a35,#20203f);
    border:1px solid rgba(129,140,248,0.3);
    color:#818cf8; border-radius:99px; padding:14px 24px;
    font-size:14px; font-weight:700; font-family:Outfit,sans-serif;
    cursor:pointer; width:100%; margin-top:4px;
    transition:all 0.2s;
  `;
  btn.onclick = () => showFamilyShareModal(familyCode);
  document.getElementById("tab-progress")?.appendChild(btn);
}

// ============================================
// INIT
// ============================================

function initFamilySystem() {
  // Sync périodique
  if (getFamilyCode() && authToken) {
    syncFamilyScore();
    setInterval(syncFamilyScore, FAMILY_SYNC_INTERVAL);
  }
}
