// ============================================
// NOUR — Système de notifications
// ============================================

// Enregistrer le Service Worker
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker enregistré');
    return reg;
  } catch(e) {
    console.log('SW non supporté:', e);
    return null;
  }
}

// Demander la permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Initialiser les notifications
async function initNotifications() {
  // Attendre un peu avant de demander (après le onboarding)
  if (localStorage.getItem('nour_notif_asked')) return;

  const reg = await registerServiceWorker();
  if (!reg) return;

  // Demander après 30 secondes d'utilisation
  setTimeout(async () => {
    const granted = await requestNotificationPermission();
    localStorage.setItem('nour_notif_asked', 'true');

    if (granted) {
      localStorage.setItem('nour_notif_enabled', 'true');
      scheduleNotifications(reg);
      showToast('🔔 Notifications activées ! On te rappellera chaque jour.');
    }
  }, 30000);
}

// Programmer les notifications quotidiennes
function scheduleNotifications(reg) {
  if (!reg || !reg.active) return;
  const streak = state?.streak || 0;
  reg.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    streak: streak,
    hour: 18 // 18h00 chaque jour
  });
}

// Réactiver les notifications au retour dans l'app
async function reactivateNotifications() {
  if (!localStorage.getItem('nour_notif_enabled')) return;
  const reg = await navigator.serviceWorker?.ready;
  if (reg) scheduleNotifications(reg);
}

// Afficher la bannière de notification manuelle
function showNotificationBanner() {
  if (localStorage.getItem('nour_notif_asked')) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;

  const banner = document.createElement('div');
  banner.id = 'notifBanner';
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 16px;
    right: 16px;
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
      <div style="font-weight:700;font-size:14px;color:#f5f0e8">Rappels quotidiens</div>
      <div style="font-size:12px;color:rgba(245,240,232,0.55);margin-top:2px">Ne brise jamais ton streak</div>
    </div>
    <button onclick="enableNotifications()" style="background:linear-gradient(135deg,#1db974,#26d984);color:#fff;border:none;border-radius:99px;padding:8px 16px;font-size:13px;font-weight:700;font-family:Outfit,sans-serif;cursor:pointer">Activer</button>
    <button onclick="dismissNotificationBanner()" style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:20px;cursor:pointer;padding:0 4px">✕</button>
  `;

  document.body.appendChild(banner);

  // Fermer automatiquement après 8 secondes
  setTimeout(() => dismissNotificationBanner(), 8000);
}

async function enableNotifications() {
  dismissNotificationBanner();
  const granted = await requestNotificationPermission();
  localStorage.setItem('nour_notif_asked', 'true');
  if (granted) {
    localStorage.setItem('nour_notif_enabled', 'true');
    const reg = await navigator.serviceWorker?.ready;
    if (reg) scheduleNotifications(reg);
    showToast('🔔 Rappels activés chaque jour à 18h !');
  } else {
    showToast('Notifications refusées — tu peux les activer dans les paramètres');
  }
}

function dismissNotificationBanner() {
  const banner = document.getElementById('notifBanner');
  if (banner) banner.remove();
  localStorage.setItem('nour_notif_asked', 'true');
}

// Lancer au démarrage de l'app
document.addEventListener('DOMContentLoaded', async () => {
  await registerServiceWorker();
});
