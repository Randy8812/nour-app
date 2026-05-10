// ============================================
// NOUR — Notifications + Service Worker
// ============================================

// Enregistrer le Service Worker
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    // Vérifier les mises à jour toutes les 60 secondes
    setInterval(() => reg.update(), 60000);

    // Écouter les messages du SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        showUpdateBanner();
      }
    });

    return reg;
  } catch (e) {
    console.log("SW non supporté:", e);
    return null;
  }
}

// Bannière de mise à jour
function showUpdateBanner() {
  if (document.getElementById("updateBanner")) return;

  const banner = document.createElement("div");
  banner.id = "updateBanner";
  banner.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0;
    background: linear-gradient(135deg, #1db974, #26d984);
    color: #fff;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(29,185,116,0.4);
    animation: slideDown 0.3s ease;
    font-family: Outfit, sans-serif;
  `;

  banner.innerHTML = `
    <span style="font-size:14px;font-weight:600;">🔄 Mise à jour disponible !</span>
    <button onclick="applyUpdate()" style="
      background: #fff;
      color: #1db974;
      border: none;
      border-radius: 99px;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 800;
      font-family: Outfit, sans-serif;
      cursor: pointer;
    ">Mettre à jour</button>
  `;

  document.body.prepend(banner);
}

function applyUpdate() {
  window.location.reload(true);
}

// Demander la permission de notification
async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Bannière notification
function showNotificationBanner() {
  if (localStorage.getItem("nour_notif_asked")) return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") return;

  const banner = document.createElement("div");
  banner.id = "notifBanner";
  banner.style.cssText = `
    position: fixed;
    bottom: 20px; left: 16px; right: 16px;
    background: linear-gradient(135deg, #142b1f, #1a3628);
    border: 1px solid rgba(29,185,116,0.3);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 800;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: slideUp 0.4s ease;
  `;

  banner.innerHTML = `
    <span style="font-size:28px">🔔</span>
    <div style="flex:1">
      <div style="font-weight:700;font-size:14px;color:#f5f0e8;font-family:Outfit,sans-serif;">Rappels quotidiens</div>
      <div style="font-size:12px;color:rgba(245,240,232,0.55);margin-top:2px;font-family:Outfit,sans-serif;">Ne brise jamais ton streak</div>
    </div>
    <button onclick="enableNotifications()" style="background:linear-gradient(135deg,#1db974,#26d984);color:#fff;border:none;border-radius:99px;padding:8px 16px;font-size:13px;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer">Activer</button>
    <button onclick="dismissNotificationBanner()" style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:20px;cursor:pointer;padding:0 4px">✕</button>
  `;

  document.body.appendChild(banner);
  setTimeout(() => dismissNotificationBanner(), 8000);
}

async function enableNotifications() {
  dismissNotificationBanner();
  const granted = await requestNotificationPermission();
  localStorage.setItem("nour_notif_asked", "true");
  if (granted) {
    localStorage.setItem("nour_notif_enabled", "true");
    showToast("🔔 Rappels activés !");
  }
}

function dismissNotificationBanner() {
  const banner = document.getElementById("notifBanner");
  if (banner) banner.remove();
  localStorage.setItem("nour_notif_asked", "true");
}

// Init au démarrage
document.addEventListener("DOMContentLoaded", async () => {
  await registerServiceWorker();
});
