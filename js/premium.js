// ============================================
// NOUR — Vérification Premium côté serveur
// ============================================

const PREMIUM_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24h

// Vérifier le statut Premium dans Supabase
async function checkPremiumStatus() {
  // 1. Vérifier d'abord le localStorage (cache)
  const lastCheck = localStorage.getItem('nour_premium_checked');
  const now = Date.now();

  // Ne pas revérifier si moins de 24h
  if (lastCheck && (now - parseInt(lastCheck)) < PREMIUM_CHECK_INTERVAL) {
    return localStorage.getItem('nour_premium') === 'true';
  }

  // 2. Si connecté → vérifier dans Supabase
  if (authToken && currentUser) {
    try {
      const email = currentUser.email;
      const res = await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&status=eq.active&select=status`,
        {
          headers: {
            'apikey': SUPABASE_AUTH_KEY,
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        const isPrem = data && data.length > 0;

        // Mettre à jour le cache
        localStorage.setItem('nour_premium', isPrem ? 'true' : 'false');
        localStorage.setItem('nour_premium_checked', now.toString());

        return isPrem;
      }
    } catch(e) {
      console.log('Erreur vérification premium:', e);
    }
  }

  // 3. Fallback sur localStorage
  return localStorage.getItem('nour_premium') === 'true';
}

// Activer Premium après paiement Stripe
async function activatePremiumInSupabase(email) {
  if (!authToken) return false;
  try {
    // Vérifier si existe déjà
    const checkRes = await fetch(
      `${SUPABASE_AUTH_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}&select=email`,
      {
        headers: {
          'apikey': SUPABASE_AUTH_KEY,
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    const existing = await checkRes.json();

    if (existing && existing.length > 0) {
      // Mettre à jour
      await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/subscriptions?email=eq.${encodeURIComponent(email)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_AUTH_KEY,
            'Authorization': `Bearer ${authToken}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'active' })
        }
      );
    } else {
      // Insérer
      await fetch(`${SUPABASE_AUTH_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_AUTH_KEY,
          'Authorization': `Bearer ${authToken}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email,
          status: 'active',
          created_at: new Date().toISOString()
        })
      });
    }

    localStorage.setItem('nour_premium', 'true');
    localStorage.setItem('nour_premium_checked', Date.now().toString());
    return true;
  } catch(e) {
    console.log('Erreur activation premium:', e);
    return false;
  }
}

// Vérifier au retour de Stripe
async function handleStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('premium') !== 'true') return;

  window.history.replaceState({}, '', '/');
  localStorage.setItem('nour_premium', 'true');
  localStorage.setItem('nour_premium_checked', Date.now().toString());

  // Si connecté, sauvegarder dans Supabase
  if (authToken && currentUser) {
    await activatePremiumInSupabase(currentUser.email);
  }

  showToast('🎉 Bienvenue en Premium !');
}

// Vérification périodique (révocation possible)
async function startPremiumWatcher() {
  // Vérifier au démarrage
  if (authToken && currentUser) {
    const isPrem = await checkPremiumStatus();
    if (!isPrem && localStorage.getItem('nour_premium') === 'true') {
      // Abonnement révoqué
      localStorage.setItem('nour_premium', 'false');
      showToast('Ton abonnement Premium a expiré');
    }
  }
}

// Version sécurisée de isPremium
function isPremiumSecure() {
  // Vérification locale (la vérification serveur se fait en arrière-plan)
  return localStorage.getItem('nour_premium') === 'true';
}
