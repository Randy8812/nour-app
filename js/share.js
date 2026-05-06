// ============================================
// NOUR — Système de partage social
// ============================================

// Générer une carte de partage canvas
async function generateShareCard(type, data) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // Fond dégradé
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, '#050e0a');
  bg.addColorStop(0.5, '#0f2018');
  bg.addColorStop(1, '#091510');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  // Motif géométrique subtil
  ctx.strokeStyle = 'rgba(29,185,116,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 1080; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 1080, 1080); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1080, i + 1080); ctx.stroke();
  }

  // Cercle décoratif central
  const gradient = ctx.createRadialGradient(540, 540, 100, 540, 540, 500);
  gradient.addColorStop(0, 'rgba(29,185,116,0.08)');
  gradient.addColorStop(1, 'rgba(29,185,116,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(540, 540, 500, 0, Math.PI * 2); ctx.fill();

  // Cercle doré
  ctx.strokeStyle = 'rgba(212,168,67,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(540, 400, 220, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(540, 400, 200, 0, Math.PI * 2); ctx.stroke();

  if (type === 'word') {
    await drawWordCard(ctx, data);
  } else if (type === 'milestone') {
    await drawMilestoneCard(ctx, data);
  } else if (type === 'streak') {
    await drawStreakCard(ctx, data);
  }

  // Logo en bas
  drawLogo(ctx);

  return canvas.toDataURL('image/png');
}

async function drawWordCard(ctx, { word, wordIndex, total }) {
  // Mot arabe
  ctx.font = 'bold 160px serif';
  ctx.textAlign = 'center';
  const goldGrad = ctx.createLinearGradient(340, 260, 740, 420);
  goldGrad.addColorStop(0, '#f0c860');
  goldGrad.addColorStop(0.5, '#d4a843');
  goldGrad.addColorStop(1, '#e8c97a');
  ctx.fillStyle = goldGrad;
  ctx.shadowColor = 'rgba(212,168,67,0.4)';
  ctx.shadowBlur = 30;
  ctx.fillText(word.arabic, 540, 420);
  ctx.shadowBlur = 0;

  // Translittération
  ctx.font = '400 42px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(29,185,116,0.9)';
  ctx.fillText(word.transliteration, 540, 490);

  // Ligne décorative
  ctx.strokeStyle = 'rgba(212,168,67,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(340, 530); ctx.lineTo(740, 530); ctx.stroke();

  // Signification
  ctx.font = 'bold 56px Outfit, sans-serif';
  ctx.fillStyle = '#f5f0e8';
  ctx.fillText(word.meaning, 540, 610);

  // Compteur
  ctx.font = '400 36px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.4)';
  ctx.fillText(`Mot ${wordIndex} sur ${total} appris`, 540, 680);

  // Verset
  ctx.font = '400 28px serif';
  ctx.fillStyle = 'rgba(240,200,96,0.7)';
  const verseText = word.verseArabic.length > 50 ? word.verseArabic.substring(0, 50) + '...' : word.verseArabic;
  ctx.fillText(verseText, 540, 760);

  ctx.font = '300 24px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.4)';
  ctx.fillText(word.verseRef, 540, 800);
}

async function drawMilestoneCard(ctx, { count, levelName, levelIcon }) {
  // Icône niveau
  ctx.font = '120px serif';
  ctx.textAlign = 'center';
  ctx.fillText(levelIcon, 540, 380);

  // Nombre
  const goldGrad = ctx.createLinearGradient(340, 400, 740, 560);
  goldGrad.addColorStop(0, '#f0c860');
  goldGrad.addColorStop(1, '#d4a843');
  ctx.font = 'bold 180px Outfit, sans-serif';
  ctx.fillStyle = goldGrad;
  ctx.shadowColor = 'rgba(212,168,67,0.5)';
  ctx.shadowBlur = 40;
  ctx.fillText(count, 540, 550);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 48px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.7)';
  ctx.fillText('mots coraniques appris', 540, 620);

  // Niveau
  ctx.font = 'bold 40px Outfit, sans-serif';
  ctx.fillStyle = '#1db974';
  ctx.fillText(`Niveau : ${levelName}`, 540, 700);

  // Message
  ctx.font = '300 34px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.5)';
  ctx.fillText('Le Coran s\'ouvre à moi, un mot à la fois', 540, 780);
}

async function drawStreakCard(ctx, { streak }) {
  // Emoji feu
  ctx.font = '120px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔥', 540, 380);

  // Nombre streak
  const goldGrad = ctx.createLinearGradient(340, 400, 740, 560);
  goldGrad.addColorStop(0, '#f0c860');
  goldGrad.addColorStop(1, '#d4a843');
  ctx.font = 'bold 200px Outfit, sans-serif';
  ctx.fillStyle = goldGrad;
  ctx.shadowColor = 'rgba(212,168,67,0.5)';
  ctx.shadowBlur = 40;
  ctx.fillText(streak, 540, 560);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 52px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.8)';
  ctx.fillText(`jour${streak > 1 ? 's' : ''} de suite !`, 540, 640);

  ctx.font = '300 36px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.5)';
  ctx.fillText('J\'apprends l\'arabe coranique chaque jour', 540, 720);
}

function drawLogo(ctx) {
  // Fond logo
  ctx.fillStyle = 'rgba(9,21,16,0.9)';
  roundRect(ctx, 340, 870, 400, 80, 40);
  ctx.fill();

  // Bordure
  ctx.strokeStyle = 'rgba(29,185,116,0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, 340, 870, 400, 80, 40);
  ctx.stroke();

  // Texte logo
  ctx.font = 'bold 36px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4a843';
  ctx.fillText('ن  NOUR', 540, 920);

  ctx.font = '300 22px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(245,240,232,0.4)';
  ctx.fillText('Arabe Coranique', 540, 948);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Afficher la modale de partage
async function showShareModal(type, data) {
  // Générer l'image
  const imageUrl = await generateShareCard(type, data);

  // Créer la modale
  const modal = document.createElement('div');
  modal.id = 'shareModal';
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:1000; backdrop-filter:blur(8px);
    animation:fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,#0f2018,#091510);
      border-radius:24px 24px 0 0; padding:28px 24px 48px;
      width:100%; max-width:480px;
      border-top:2px solid rgba(29,185,116,0.3);
      box-shadow:0 -20px 60px rgba(0,0,0,0.5);
      animation:slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);
      display:flex; flex-direction:column; gap:20px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <h3 style="font-size:18px;font-weight:800;color:#f5f0e8;">Partager ma progression</h3>
        <button onclick="closeShareModal()" style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:22px;cursor:pointer;">✕</button>
      </div>

      <img src="${imageUrl}" style="width:100%;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.4);" />

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="shareToApp('${imageUrl}')" style="
          background:linear-gradient(135deg,#1db974,#26d984); color:#fff;
          border:none; border-radius:99px; padding:16px;
          font-size:16px; font-weight:700; font-family:Outfit,sans-serif; cursor:pointer;
          box-shadow:0 6px 28px rgba(29,185,116,0.45);
        ">📤 Partager</button>

        <button onclick="downloadShareCard('${imageUrl}')" style="
          background:rgba(245,240,232,0.07); color:rgba(245,240,232,0.7);
          border:1px solid rgba(245,240,232,0.1); border-radius:99px; padding:14px;
          font-size:15px; font-weight:600; font-family:Outfit,sans-serif; cursor:pointer;
        ">⬇️ Télécharger l'image</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeShareModal(); });
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.remove();
}

async function shareToApp(imageUrl) {
  if (navigator.share) {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'nour-progression.png', { type: 'image/png' });
      await navigator.share({
        title: 'Ma progression Nour 🕌',
        text: 'J\'apprends l\'arabe coranique avec Nour — un mot à la fois !',
        files: [file]
      });
    } catch(e) {
      downloadShareCard(imageUrl);
    }
  } else {
    downloadShareCard(imageUrl);
  }
}

function downloadShareCard(imageUrl) {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = 'nour-progression.png';
  link.click();
  showToast('Image téléchargée !');
}

// Bouton de partage flottant après milestone
function showShareTrigger(type, data) {
  // Supprimer l'ancien si existe
  const old = document.getElementById('shareTrigger');
  if (old) old.remove();

  const btn = document.createElement('button');
  btn.id = 'shareTrigger';
  btn.style.cssText = `
    position:fixed; bottom:90px; right:20px;
    background:linear-gradient(135deg,#1db974,#26d984);
    color:#fff; border:none; border-radius:99px;
    padding:12px 20px; font-size:14px; font-weight:700;
    font-family:Outfit,sans-serif; cursor:pointer;
    box-shadow:0 6px 24px rgba(29,185,116,0.5);
    z-index:500; display:flex; align-items:center; gap:8px;
    animation:bounceIn 0.5s cubic-bezier(0.34,1.2,0.64,1) forwards;
  `;
  btn.innerHTML = '📤 Partager';
  btn.onclick = () => { btn.remove(); showShareModal(type, data); };
  document.body.appendChild(btn);

  // Disparaître après 8 secondes
  setTimeout(() => { if (document.getElementById('shareTrigger')) btn.remove(); }, 8000);
}
