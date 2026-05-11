// ============================================
// NOUR — Certificat de Progression
// ============================================

const CERTIFICATE_MILESTONES = [10, 50, 100, 200];

function checkCertificate(learnedCount) {
  if (!CERTIFICATE_MILESTONES.includes(learnedCount)) return;

  // Vérifier si déjà montré pour ce milestone
  const key = `nour_cert_${currentProfile}_${learnedCount}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "true");

  // Attendre 1 seconde puis afficher
  setTimeout(() => showCertificateModal(learnedCount), 1000);
}

async function generateCertificate(learnedCount) {
  const profiles = loadProfiles();
  const profile = profiles[currentProfile];
  const name = profile?.name || "Apprenant";
  const level =
    LEVELS.find((l) => learnedCount >= l.min && learnedCount <= l.max) ||
    LEVELS[0];
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 848;
  const ctx = canvas.getContext("2d");

  // --- FOND ---
  const bg = ctx.createLinearGradient(0, 0, 1200, 848);
  bg.addColorStop(0, "#050e0a");
  bg.addColorStop(0.5, "#0d2a1e");
  bg.addColorStop(1, "#050e0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 848);

  // Bordure extérieure dorée
  ctx.strokeStyle = "#d4a843";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 1152, 800);
  ctx.strokeStyle = "rgba(212,168,67,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, 1136, 784);

  // Halo central
  const glow = ctx.createRadialGradient(600, 424, 50, 600, 424, 400);
  glow.addColorStop(0, "rgba(29,185,116,0.08)");
  glow.addColorStop(1, "rgba(29,185,116,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 848);

  // Coins décoratifs
  drawCorner(ctx, 50, 50, 0);
  drawCorner(ctx, 1150, 50, 90);
  drawCorner(ctx, 1150, 798, 180);
  drawCorner(ctx, 50, 798, 270);

  // --- LOGO ---
  ctx.beginPath();
  ctx.arc(600, 130, 50, 0, Math.PI * 2);
  const logoGrad = ctx.createRadialGradient(590, 120, 5, 600, 130, 50);
  logoGrad.addColorStop(0, "#26d984");
  logoGrad.addColorStop(0.6, "#1db974");
  logoGrad.addColorStop(1, "#d4a843");
  ctx.fillStyle = logoGrad;
  ctx.fill();
  ctx.strokeStyle = "#d4a843";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "bold 44px serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("ن", 600, 146);

  // --- TITRE NOUR ---
  ctx.font = "800 28px Arial";
  ctx.fillStyle = "#d4a843";
  ctx.letterSpacing = "6px";
  ctx.fillText("N O U R", 600, 210);

  // Ligne déco
  ctx.strokeStyle = "rgba(212,168,67,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 228);
  ctx.lineTo(800, 228);
  ctx.stroke();

  // --- TITRE CERTIFICAT ---
  ctx.font = "300 18px Arial";
  ctx.fillStyle = "rgba(245,240,232,0.5)";
  ctx.letterSpacing = "4px";
  ctx.fillText("CERTIFICAT DE PROGRESSION", 600, 265);

  // --- NOM ---
  ctx.font = "bold 64px Arial";
  const nameGrad = ctx.createLinearGradient(300, 300, 900, 380);
  nameGrad.addColorStop(0, "#f0c860");
  nameGrad.addColorStop(0.5, "#d4a843");
  nameGrad.addColorStop(1, "#f0c860");
  ctx.fillStyle = nameGrad;
  ctx.letterSpacing = "0px";
  ctx.fillText(name, 600, 360);

  // --- TEXTE PRINCIPAL ---
  ctx.font = "400 22px Arial";
  ctx.fillStyle = "rgba(245,240,232,0.7)";
  ctx.fillText("a appris avec succès", 600, 410);

  ctx.font = "bold 72px Arial";
  const countGrad = ctx.createLinearGradient(400, 430, 800, 510);
  countGrad.addColorStop(0, "#1db974");
  countGrad.addColorStop(1, "#26d984");
  ctx.fillStyle = countGrad;
  ctx.fillText(`${learnedCount}`, 600, 500);

  ctx.font = "600 26px Arial";
  ctx.fillStyle = "rgba(245,240,232,0.8)";
  ctx.fillText("mots coraniques", 600, 540);

  // Ligne séparatrice
  ctx.strokeStyle = "rgba(29,185,116,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(350, 570);
  ctx.lineTo(850, 570);
  ctx.stroke();

  // --- NIVEAU & DATE ---
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#1db974";
  ctx.fillText(`${level.icon}  Niveau : ${level.name}`, 600, 615);

  ctx.font = "400 18px Arial";
  ctx.fillStyle = "rgba(245,240,232,0.4)";
  ctx.fillText(`Délivré le ${date}`, 600, 650);

  // --- VERSETS DÉCORATIFS ---
  ctx.font = "400 16px serif";
  ctx.fillStyle = "rgba(212,168,67,0.3)";
  ctx.fillText("اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ", 600, 720);

  ctx.font = "300 13px Arial";
  ctx.fillStyle = "rgba(245,240,232,0.2)";
  ctx.fillText("nour-app-indol.vercel.app", 600, 790);

  return canvas;
}

function drawCorner(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.strokeStyle = "#d4a843";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(40, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 40);
  ctx.stroke();
  // Point déco
  ctx.fillStyle = "#1db974";
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

async function showCertificateModal(learnedCount) {
  const canvas = await generateCertificate(learnedCount);
  const imageUrl = canvas.toDataURL("image/png");
  const profiles = loadProfiles();
  const name = profiles[currentProfile]?.name || "Apprenant";

  const modal = document.createElement("div");
  modal.id = "certificateModal";
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.9);
    display:flex; align-items:flex-end; justify-content:center;
    z-index:1000; backdrop-filter:blur(8px);
    animation:fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(180deg,#0f2018,#091510);
      border-radius:24px 24px 0 0; padding:24px 24px 48px;
      width:100%; max-width:480px;
      border-top:3px solid #d4a843;
      box-shadow:0 -20px 60px rgba(0,0,0,0.6);
      animation:slideUp 0.4s cubic-bezier(0.34,1.2,0.64,1);
      display:flex; flex-direction:column; gap:16px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h3 style="font-size:18px;font-weight:800;color:#f5f0e8;font-family:Outfit,sans-serif;">🏆 Félicitations ${name} !</h3>
          <p style="font-size:13px;color:rgba(245,240,232,0.5);font-family:Outfit,sans-serif;margin-top:2px;">${learnedCount} mots coraniques appris !</p>
        </div>
        <button onclick="document.getElementById('certificateModal').remove()" 
          style="background:none;border:none;color:rgba(245,240,232,0.4);font-size:22px;cursor:pointer;">✕</button>
      </div>

      <img src="${imageUrl}" style="width:100%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);" />

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button onclick="downloadCertificate('${imageUrl}', '${name}', ${learnedCount})" style="
          background:linear-gradient(135deg,#d4a843,#f0c860);
          color:#050e0a; border:none; border-radius:99px; padding:16px;
          font-size:15px; font-weight:800; font-family:Outfit,sans-serif; cursor:pointer;
          box-shadow:0 6px 24px rgba(212,168,67,0.4);
        ">⬇️ Télécharger mon certificat</button>

        <button onclick="shareCertificate('${imageUrl}')" style="
          background:rgba(29,185,116,0.1); color:#1db974;
          border:1px solid rgba(29,185,116,0.3); border-radius:99px; padding:14px;
          font-size:15px; font-weight:700; font-family:Outfit,sans-serif; cursor:pointer;
        ">📤 Partager</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Son fanfare
  playSound("milestone");
  haptic([50, 30, 50, 30, 100]);
}

function downloadCertificate(imageUrl, name, count) {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `certificat-nour-${name}-${count}mots.png`;
  link.click();
  showToast("✅ Certificat téléchargé !");
}

async function shareCertificate(imageUrl) {
  if (navigator.share) {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], "certificat-nour.png", {
        type: "image/png",
      });
      await navigator.share({
        title: "Mon certificat Nour 🕌",
        text: "Je viens d'apprendre des mots coraniques avec Nour !",
        files: [file],
      });
    } catch (e) {
      downloadCertificate(imageUrl, "nour", 0);
    }
  } else {
    downloadCertificate(imageUrl, "nour", 0);
  }
}
