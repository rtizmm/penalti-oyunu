import * as THREE from 'three';

// ============ EASING & MATH HELPERS ============
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const u = 1 - clamp(t, 0, 1);
  return 1 - u * u * u;
}

function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutQuad(t) {
  const u = 1 - clamp(t, 0, 1);
  return 1 - u * u;
}

function easeInQuad(t) {
  const x = clamp(t, 0, 1);
  return x * x;
}

function easeOutBack(t) {
  const x = clamp(t, 0, 1);
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ============ PROCEDURAL KIT TEXTURES (512×512) ============
function colorToHexString(color) {
  const c = new THREE.Color(color);
  return '#' + c.getHexString();
}

function darkenHex(color, factor = 0.72) {
  const c = new THREE.Color(color);
  c.multiplyScalar(factor);
  return '#' + c.getHexString();
}

function lightenHex(color, factor = 0.24) {
  const c = new THREE.Color(color);
  c.lerp(new THREE.Color(0xffffff), factor);
  return '#' + c.getHexString();
}

/**
 * Creates a UV-preserving tapered athletic box (broader at top shoulders, tapered at waist)
 * with subtle chest fullness so the 6-face jersey textures map cleanly without distortion.
 */
function createTaperedTorsoGeometry(wTop, wBot, h, dTop, dBot) {
  const geo = new THREE.BoxGeometry(1, h, 1, 2, 4, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = clamp((y + h * 0.5) / h, 0, 1); // 0 = waist, 1 = shoulders
    // Smooth V-taper + subtle athletic chest/pectoral curve around t = 0.68
    const chestCurve = Math.sin(t * Math.PI) * 0.022;
    const w = lerp(wBot, wTop, Math.pow(t, 0.82)) + chestCurve;
    const d = lerp(dBot, dTop, Math.pow(t, 0.75)) + chestCurve * 1.1;
    // Slight rounding on outer corners
    const cornerRound = Math.abs(x) > 0.45 && Math.abs(z) > 0.45 ? 0.94 : 1.0;
    pos.setXYZ(i, x * w * cornerRound, y, z * d * cornerRound);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a rich 512×512 canvas texture for a jersey face (front or back)
 * with subtle woven fabric micro-grain, stripes/sash, ribbed V-collar, badge, and sharp number.
 */
function createJerseyTexture({ baseColor, accentColor, number, isBack, isKeeper }) {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const mainHex = colorToHexString(baseColor);
  const darkHex = darkenHex(baseColor, 0.74);
  const deepHex = darkenHex(baseColor, 0.58);
  const lightHex = lightenHex(baseColor, 0.22);
  const accHex = colorToHexString(accentColor);

  // Base jersey fill
  ctx.fillStyle = mainHex;
  ctx.fillRect(0, 0, w, h);

  if (isKeeper) {
    // Dynamic goalkeeper geometric chevron/diagonal graphics
    ctx.fillStyle = darkHex;
    for (let i = -2; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 124, 0);
      ctx.lineTo(i * 124 + 62, 0);
      ctx.lineTo(i * 124 - 92, h);
      ctx.lineTo(i * 124 - 154, h);
      ctx.closePath();
      ctx.fill();
    }
    // Subtle secondary diagonal pinstripes
    ctx.strokeStyle = accHex;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 4;
    for (let i = -1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 124 + 74, 0);
      ctx.lineTo(i * 124 - 80, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // High-vis shoulder panels
    ctx.fillStyle = accHex;
    ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 48, w, 8);
  } else {
    // Crisp vertical athletic stripes + tonal pinstripes
    ctx.fillStyle = darkHex;
    const stripeW = 64;
    for (let x = 0; x < w; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, h);
    }
    ctx.fillStyle = deepHex;
    ctx.globalAlpha = 0.28;
    for (let x = 0; x < w; x += stripeW) {
      ctx.fillRect(x, 0, 3, h);
    }
    ctx.globalAlpha = 1;

    // Clean diagonal sash accent
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = accHex;
    ctx.beginPath();
    ctx.moveTo(w * 0.66, 0);
    ctx.lineTo(w * 0.90, 0);
    ctx.lineTo(w * 0.28, h);
    ctx.lineTo(w * 0.04, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Subtle woven athletic mesh fabric micro-grain
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 0; y < h; y += 8) {
    ctx.fillRect(0, y, w, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let x = 0; x < w; x += 8) {
    ctx.fillRect(x, 0, 2, h);
  }
  ctx.restore();

  // Soft athletic torso lighting gradient + side seam shading
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
  vGrad.addColorStop(0.45, 'rgba(255,255,255,0.02)');
  vGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  // Side accent mesh panels + piping
  ctx.fillStyle = accHex;
  ctx.fillRect(0, 0, 20, h);
  ctx.fillRect(w - 20, 0, 20, h);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(20, 0, 4, h);
  ctx.fillRect(w - 24, 0, 4, h);

  // Hem trim bar
  ctx.fillStyle = accHex;
  ctx.fillRect(0, h - 18, w, 18);

  // Ribbed V-neck collar trim
  ctx.fillStyle = accHex;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, 0);
  ctx.lineTo(w * 0.5, isBack ? 40 : 78);
  ctx.lineTo(w * 0.68, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.34)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner collar accent stitch
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, 4);
  ctx.lineTo(w * 0.5, isBack ? 32 : 64);
  ctx.lineTo(w * 0.64, 4);
  ctx.stroke();

  if (isBack) {
    // Clean nameplate bar above number
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(w * 0.27, h * 0.14, w * 0.46, 24);
    ctx.fillStyle = accHex;
    ctx.fillRect(w * 0.27, h * 0.14 + 24, w * 0.46, 5);

    // Large crisp outlined jersey number on back
    const numStr = String(number ?? 10);
    ctx.font = numStr.length > 2 ? '900 186px "Segoe UI", Arial, sans-serif' : '900 252px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(10, 14, 24, 0.82)';
    ctx.strokeText(numStr, w * 0.5, h * 0.56);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(numStr, w * 0.5, h * 0.56);

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = accHex;
    ctx.strokeText(numStr, w * 0.5, h * 0.56);
  } else {
    // Front: embroidered club crest shield on left chest
    ctx.save();
    ctx.translate(w * 0.69, h * 0.28);
    ctx.fillStyle = accHex;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(32, -25);
    ctx.lineTo(27, 17);
    ctx.lineTo(0, 42);
    ctx.lineTo(-27, 17);
    ctx.lineTo(-32, -25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
    // Inner shield stripe & gold star
    ctx.fillStyle = darkHex;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18, -14);
    ctx.lineTo(15, 10);
    ctx.lineTo(0, 26);
    ctx.lineTo(-15, 10);
    ctx.lineTo(-18, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp chest number on right chest
    ctx.font = '900 66px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(10,14,24,0.65)';
    ctx.strokeText(String(number ?? 10), w * 0.30, h * 0.29);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(number ?? 10), w * 0.30, h * 0.29);

    // Sleek chest sponsor band
    ctx.fillStyle = lightHex;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(38, h * 0.50, w - 76, 46);
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * 0.25, h * 0.532, w * 0.50, 11);
    ctx.fillStyle = accHex;
    ctx.fillRect(w * 0.33, h * 0.562, w * 0.34, 5);
    ctx.globalAlpha = 1;

    // Authentic jock-tag near bottom right hem
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(w * 0.72, h - 42, 44, 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ============ HUMANOID RIG BUILDER (V4) ============
function enableShadows(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// Shared small detail geometries for lean draw calls & zero redundant allocations
const SHARED_GEO = {
  ear: new THREE.SphereGeometry(0.026, 8, 6),
  eye: new THREE.SphereGeometry(0.0185, 10, 8),
  iris: new THREE.SphereGeometry(0.0115, 8, 6),
  pupil: new THREE.SphereGeometry(0.007, 6, 6),
  catchlight: new THREE.SphereGeometry(0.0032, 6, 6),
  brow: new THREE.BoxGeometry(0.040, 0.011, 0.014),
  lace: new THREE.BoxGeometry(0.058, 0.007, 0.014),
  stud: new THREE.CylinderGeometry(0.0075, 0.0045, 0.016, 6),
  fingerRidge: new THREE.BoxGeometry(0.018, 0.056, 0.014),
};

/**
 * Builds a polished athletic footballer rig facing +Z in local space.
 * Origin of `group` is at the soles of the feet (y = 0).
 * Supports live `applyKit(...)` material & texture updates without recreating meshes.
 */
function buildHumanoidRig({
  jerseyColor = 0xd32f2f,
  shortsColor = 0x1b2230,
  sockColor = 0xffffff,
  bootColor = 0x161a24,
  bootAccent = 0xffca28,
  skinColor = 0xe5b28a,
  hairColor = 0x261a14,
  accentColor = 0xffffff,
  number = 10,
  isKeeper = false,
  gloveColor = 0x76ff03,
  scale = 1.0,
}) {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const kitState = {
    primary: jerseyColor,
    secondary: accentColor,
    shorts: shortsColor,
    number,
    gloveColor,
  };

  // Materials
  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jerseyColor,
    roughness: 0.56,
    metalness: 0.06,
  });
  let frontTex = createJerseyTexture({
    baseColor: jerseyColor,
    accentColor,
    number,
    isBack: false,
    isKeeper,
  });
  let backTex = createJerseyTexture({
    baseColor: jerseyColor,
    accentColor,
    number,
    isBack: true,
    isKeeper,
  });
  const frontJerseyMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.52,
    metalness: 0.05,
  });
  const backJerseyMat = new THREE.MeshStandardMaterial({
    map: backTex,
    roughness: 0.52,
    metalness: 0.05,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.44,
    metalness: 0.08,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: shortsColor,
    roughness: 0.66,
    metalness: 0.04,
  });
  const sockMat = new THREE.MeshStandardMaterial({
    color: sockColor,
    roughness: 0.72,
  });
  const sockBandMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.62,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.54,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.72,
    metalness: 0.04,
  });
  // Specular football boots + laces + metallic studs
  const bootMat = new THREE.MeshStandardMaterial({
    color: bootColor,
    roughness: 0.24,
    metalness: 0.30,
  });
  const bootAccentMat = new THREE.MeshStandardMaterial({
    color: bootAccent,
    roughness: 0.20,
    metalness: 0.36,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0x0d1017,
    roughness: 0.45,
    metalness: 0.18,
  });
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xd8e0ec,
    roughness: 0.22,
    metalness: 0.72,
  });
  const tapeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 0.65,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.18 });
  const irisMat = new THREE.MeshStandardMaterial({ color: isKeeper ? 0x2d6a4f : 0x4a3322, roughness: 0.22 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.12, metalness: 0.1 });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb67b63, roughness: 0.65 });
  const captainBandMat = new THREE.MeshStandardMaterial({
    color: 0xffd600,
    roughness: 0.36,
    metalness: 0.14,
  });
  // Detailed specular keeper gloves with distinct high-contrast grip palm
  const gloveMat = new THREE.MeshStandardMaterial({
    color: gloveColor,
    roughness: 0.30,
    metalness: 0.10,
  });
  const glovePalmMat = new THREE.MeshStandardMaterial({
    color: 0xeafff2,
    roughness: 0.42,
    metalness: 0.03,
  });
  const gloveStrapMat = new THREE.MeshStandardMaterial({
    color: 0x141821,
    roughness: 0.48,
  });

  function applyKit({ primary, color, secondary, shorts, number: num, gloveColor: gc } = {}) {
    const nextPrimary = primary !== undefined ? primary : (color !== undefined ? color : kitState.primary);
    const nextSecondary = secondary !== undefined ? secondary : kitState.secondary;
    const nextShorts = shorts !== undefined ? shorts : kitState.shorts;
    const nextNum = num !== undefined ? num : kitState.number;
    const nextGlove = gc !== undefined ? gc : kitState.gloveColor;

    kitState.primary = nextPrimary;
    kitState.secondary = nextSecondary;
    kitState.shorts = nextShorts;
    kitState.number = nextNum;
    kitState.gloveColor = nextGlove;

    jerseyMat.color.set(nextPrimary);
    accentMat.color.set(nextSecondary);
    shortsMat.color.set(nextShorts);
    sockMat.color.set(nextPrimary);
    sockBandMat.color.set(nextSecondary);
    if (isKeeper) {
      gloveMat.color.set(nextGlove);
      bootAccentMat.color.set(nextGlove);
    } else {
      bootAccentMat.color.set(nextSecondary);
    }

    const newFront = createJerseyTexture({
      baseColor: nextPrimary,
      accentColor: nextSecondary,
      number: nextNum,
      isBack: false,
      isKeeper,
    });
    const newBack = createJerseyTexture({
      baseColor: nextPrimary,
      accentColor: nextSecondary,
      number: nextNum,
      isBack: true,
      isKeeper,
    });

    frontJerseyMat.map = newFront;
    frontJerseyMat.needsUpdate = true;
    backJerseyMat.map = newBack;
    backJerseyMat.needsUpdate = true;

    if (frontTex) frontTex.dispose();
    if (backTex) backTex.dispose();
    frontTex = newFront;
    backTex = newBack;
  }

  // ---- HIPS (pelvis pivot at y = 0.94) ----
  const HIP_Y = 0.94;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);

  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.17, 0.215),
    shortsMat
  );
  pelvisMesh.position.set(0, -0.02, 0);
  hips.add(pelvisMesh);

  // Waistband accent
  const waistBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.030, 0.222),
    accentMat
  );
  waistBand.position.set(0, 0.056, 0);
  hips.add(waistBand);

  // ---- TORSO (athletic V-taper pivoting at waist y = 0.06 above hips) ----
  const torso = new THREE.Group();
  torso.position.set(0, 0.06, 0);
  hips.add(torso);

  const chestMaterials = [
    jerseyMat,
    jerseyMat,
    jerseyMat,
    jerseyMat,
    frontJerseyMat,
    backJerseyMat,
  ];
  const chestMesh = new THREE.Mesh(
    createTaperedTorsoGeometry(0.44, 0.34, 0.49, 0.245, 0.195),
    chestMaterials
  );
  chestMesh.position.set(0, 0.245, 0);
  torso.add(chestMesh);

  // Athletic rounded shoulder yoke & deltoid caps
  const shoulderBar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.095, 0.32, 6, 12),
    jerseyMat
  );
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.set(0, 0.435, 0);
  torso.add(shoulderBar);

  // Ribbed collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.072, 0.019, 8, 16),
    accentMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.495, 0.01);
  torso.add(collar);

  // ---- NECK & SCULPTED HEAD ----
  const neck = new THREE.Group();
  neck.position.set(0, 0.50, 0);
  torso.add(neck);

  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.068, 0.095, 12),
    skinMat
  );
  neckMesh.position.set(0, 0.042, 0);
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.105, 0);
  neck.add(head);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.126, 20, 16),
    skinMat
  );
  cranium.scale.set(0.92, 1.07, 0.98);
  cranium.position.set(0, 0.114, 0);
  head.add(cranium);

  // Sculpted jawline + rounded chin
  const jaw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.054, 0.062, 10),
    skinMat
  );
  jaw.scale.set(1.02, 1.0, 0.92);
  jaw.position.set(0, 0.036, 0.036);
  head.add(jaw);

  // Ears
  const leftEar = new THREE.Mesh(SHARED_GEO.ear, skinMat);
  leftEar.scale.set(0.58, 1.18, 0.82);
  leftEar.position.set(0.115, 0.108, -0.01);
  head.add(leftEar);
  const rightEar = leftEar.clone();
  rightEar.position.x = -0.115;
  head.add(rightEar);

  // Sculpted nose bridge
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.040, 0.036),
    skinMat
  );
  nose.position.set(0, 0.098, 0.123);
  nose.rotation.x = -0.18;
  head.add(nose);

  // Determined mouth line
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.010, 0.012),
    mouthMat
  );
  mouth.position.set(0, 0.055, 0.115);
  head.add(mouth);

  // Detailed eyes (sclera + colored iris + pupil + specular catchlight) & angled brows
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(SHARED_GEO.eye, eyeWhiteMat);
    eye.position.set(side * 0.042, 0.127, 0.105);
    head.add(eye);
    const iris = new THREE.Mesh(SHARED_GEO.iris, irisMat);
    iris.position.set(side * 0.042, 0.127, 0.117);
    head.add(iris);
    const pupil = new THREE.Mesh(SHARED_GEO.pupil, pupilMat);
    pupil.position.set(side * 0.042, 0.127, 0.123);
    head.add(pupil);
    const catchlight = new THREE.Mesh(SHARED_GEO.catchlight, catchlightMat);
    catchlight.position.set(side * 0.042 + 0.005, 0.131, 0.128);
    head.add(catchlight);
    const brow = new THREE.Mesh(SHARED_GEO.brow, hairMat);
    brow.position.set(side * 0.042, 0.151, 0.113);
    brow.rotation.z = side * -0.12;
    head.add(brow);
  });

  // Fuller stylized athletic hair (dome cap + layered swept quiff + side fades + back taper)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairCap.scale.set(0.96, 1.06, 1.04);
  hairCap.position.set(0, 0.125, -0.008);
  head.add(hairCap);

  const hairQuiff = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.042, 0.078, 4, 8),
    hairMat
  );
  hairQuiff.rotation.set(-0.28, 0.10, Math.PI / 2 - 0.14);
  hairQuiff.position.set(0.012, 0.236, 0.056);
  head.add(hairQuiff);

  const hairCrown = new THREE.Mesh(
    new THREE.BoxGeometry(0.145, 0.042, 0.135),
    hairMat
  );
  hairCrown.position.set(0, 0.228, -0.01);
  hairCrown.rotation.x = -0.12;
  head.add(hairCrown);

  // Side-fade temple locks
  [-1, 1].forEach((side) => {
    const sideFade = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.072, 0.095),
      hairMat
    );
    sideFade.position.set(side * 0.114, 0.148, -0.024);
    head.add(sideFade);
  });

  const hairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.194, 0.105, 0.064),
    hairMat
  );
  hairBack.position.set(0, 0.114, -0.104);
  head.add(hairBack);

  // ---- ARMS (Left = +x in local space, Right = -x) ----
  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.265, 0.435, 0);
    torso.add(shoulder);

    const sleeveLen = isKeeper ? 0.26 : 0.16;
    const upperArmMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, sleeveLen, 6, 12),
      jerseyMat
    );
    upperArmMesh.position.set(0, -0.13, 0);
    shoulder.add(upperArmMesh);

    // Sleeve cuff trim
    const sleeveCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.058, 0.022, 12),
      accentMat
    );
    sleeveCuff.position.set(0, isKeeper ? -0.26 : -0.20, 0);
    shoulder.add(sleeveCuff);

    // Captain armband on shooter's left upper arm
    if (!isKeeper && side === 1) {
      const armband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.048, 12),
        captainBandMat
      );
      armband.position.set(0, -0.155, 0);
      shoulder.add(armband);
    }

    if (!isKeeper) {
      const bareUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.047, 0.12, 6, 10),
        skinMat
      );
      bareUpper.position.set(0, -0.22, 0);
      shoulder.add(bareUpper);
    }

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.29, 0);
    shoulder.add(elbow);

    const forearmMat = isKeeper ? jerseyMat : skinMat;
    const forearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(isKeeper ? 0.049 : 0.045, isKeeper ? 0.040 : 0.036, 0.25, 10),
      forearmMat
    );
    forearmMesh.position.set(0, -0.13, 0);
    elbow.add(forearmMesh);

    // Athletic white wrist tape on shooter's right wrist (pro striker detail!)
    if (!isKeeper && side === -1) {
      const wristTape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.040, 0.039, 0.056, 10),
        tapeMat
      );
      wristTape.position.set(0, -0.235, 0);
      elbow.add(wristTape);
    }

    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0);
    elbow.add(hand);

    if (isKeeper) {
      // Upgraded goalkeeper glove: Velcro strap + pull tab + latex backhand + 4 finger ridges + distinct grip palm + thumb
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.053, 0.057, 0.068, 12),
        gloveStrapMat
      );
      cuff.position.set(0, -0.01, 0);
      hand.add(cuff);

      // Velcro strap tab
      const strapTab = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 0.026, 0.022),
        gloveMat
      );
      strapTab.position.set(0, -0.012, -0.046);
      hand.add(strapTab);

      const gloveBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.100, 0.155, 0.066),
        gloveMat
      );
      gloveBody.position.set(0, -0.094, 0);
      hand.add(gloveBody);

      // Padded backhand knuckle armor
      const knucklePad = new THREE.Mesh(
        new THREE.BoxGeometry(0.094, 0.044, 0.022),
        gloveStrapMat
      );
      knucklePad.position.set(0, -0.082, -0.032);
      hand.add(knucklePad);

      // Articulated finger ridges
      for (let f = 0; f < 4; f++) {
        const fx = -0.034 + f * 0.0225;
        const finger = new THREE.Mesh(SHARED_GEO.fingerRidge, gloveMat);
        finger.position.set(fx, -0.145, -0.028);
        hand.add(finger);
      }

      // Distinct high-contrast latex grip palm
      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.094, 0.146, 0.026),
        glovePalmMat
      );
      palm.position.set(0, -0.094, 0.032);
      hand.add(palm);

      // Sculpted thumb wrap
      const thumb = new THREE.Mesh(
        new THREE.BoxGeometry(0.040, 0.072, 0.040),
        gloveMat
      );
      thumb.position.set(-side * 0.060, -0.068, 0.018);
      thumb.rotation.z = side * 0.42;
      hand.add(thumb);
    } else {
      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, 0.095, 0.036),
        skinMat
      );
      palm.position.set(0, -0.055, 0);
      hand.add(palm);
    }

    return { shoulder, elbow, hand };
  }

  const leftArm = buildArm(1);
  const rightArm = buildArm(-1);

  // ---- LEGS (defined thighs, calves, folded sock cuffs, shin-guard contour, laced studded boots) ----
  function buildLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.106, -0.06, 0);
    hips.add(hip);

    const shortLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.078, 0.22, 12),
      shortsMat
    );
    shortLeg.position.set(0, -0.10, 0);
    hip.add(shortLeg);

    // Side accent stripe on shorts
    const shortStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.21, 0.034),
      accentMat
    );
    shortStripe.position.set(side * 0.083, -0.10, 0);
    hip.add(shortStripe);

    // Sculpted athletic thigh (tapers naturally toward knee)
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.073, 0.056, 0.24, 12),
      skinMat
    );
    thigh.position.set(0, -0.28, 0.004);
    hip.add(thigh);

    // Subtle knee cap
    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      skinMat
    );
    kneeCap.position.set(0, -0.41, 0.006);
    hip.add(kneeCap);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    // Tapered athletic lower leg / sock
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.043, 0.35, 12),
      sockMat
    );
    sock.position.set(0, -0.195, 0);
    knee.add(sock);

    // Defined calf muscle bulge on back (-z)
    const calfBulge = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 8),
      sockMat
    );
    calfBulge.scale.set(0.92, 1.55, 0.85);
    calfBulge.position.set(0, -0.145, -0.022);
    knee.add(calfBulge);

    // Shin-guard contour on front (+z)
    const shinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.165, 0.028),
      sockMat
    );
    shinGuard.position.set(0, -0.185, 0.042);
    knee.add(shinGuard);

    // Folded sock cuff + dual trim bands
    const foldedCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.062, 0.042, 12),
      sockMat
    );
    foldedCuff.position.set(0, -0.038, 0);
    knee.add(foldedCuff);

    const bandTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.016, 12),
      sockBandMat
    );
    bandTop.position.set(0, -0.028, 0);
    knee.add(bandTop);

    const bandLow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.061, 0.060, 0.014, 12),
      sockBandMat
    );
    bandLow.position.set(0, -0.072, 0);
    knee.add(bandLow);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.39, 0);
    knee.add(ankle);

    // Detailed specular laced football boot with soleplate & studs
    const bootMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.096, 0.076, 0.225),
      bootMat
    );
    bootMain.position.set(0, -0.027, 0.054);
    ankle.add(bootMain);

    const bootToe = new THREE.Mesh(
      new THREE.SphereGeometry(0.049, 12, 8),
      bootMat
    );
    bootToe.scale.set(0.98, 0.72, 1.20);
    bootToe.position.set(0, -0.034, 0.166);
    ankle.add(bootToe);

    // Heel counter accent
    const heelCounter = new THREE.Mesh(
      new THREE.BoxGeometry(0.098, 0.056, 0.048),
      bootAccentMat
    );
    heelCounter.position.set(0, -0.022, -0.042);
    ankle.add(heelCounter);

    // Specular side accent stripe
    const bootStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.102, 0.020, 0.135),
      bootAccentMat
    );
    bootStripe.position.set(0, -0.024, 0.058);
    ankle.add(bootStripe);

    // Crisp laces across the instep
    for (let li = 0; li < 3; li++) {
      const lace = new THREE.Mesh(SHARED_GEO.lace, tapeMat);
      lace.position.set(0, 0.012 - li * 0.005, 0.056 + li * 0.032);
      lace.rotation.x = 0.22;
      ankle.add(lace);
    }

    // Soleplate + 6 metallic studs (4 forefoot, 2 heel)
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.094, 0.015, 0.248),
      soleMat
    );
    sole.position.set(0, -0.065, 0.064);
    ankle.add(sole);

    const studCoords = [
      [-0.030, 0.145], [0.030, 0.145],
      [-0.032, 0.082], [0.032, 0.082],
      [-0.028, -0.025], [0.028, -0.025],
    ];
    for (let si = 0; si < studCoords.length; si++) {
      const stud = new THREE.Mesh(SHARED_GEO.stud, studMat);
      stud.position.set(studCoords[si][0], -0.078, studCoords[si][1]);
      ankle.add(stud);
    }

    return { hip, knee, ankle };
  }

  const leftLeg = buildLeg(1);
  const rightLeg = buildLeg(-1);

  enableShadows(group);

  return {
    group,
    HIP_Y,
    hips,
    torso,
    neck,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    applyKit,
  };
}

function resetJoints(rig) {
  rig.hips.position.set(0, rig.HIP_Y, 0);
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.neck.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);

  [rig.leftArm, rig.rightArm].forEach((a) => {
    a.shoulder.rotation.set(0, 0, 0);
    a.elbow.rotation.set(0, 0, 0);
    a.hand.rotation.set(0, 0, 0);
  });
  [rig.leftLeg, rig.rightLeg].forEach((l) => {
    l.hip.rotation.set(0, 0, 0);
    l.knee.rotation.set(0, 0, 0);
    l.ankle.rotation.set(0, 0, 0);
  });
}

// ============ GOALKEEPER ============
export function createKeeper(
  scene,
  { color = 0x00bcd4, secondary = 0xffe600, shorts = 0x161b26, number = 1, gloveColor = 0x76ff03 } = {}
) {
  const rig = buildHumanoidRig({
    jerseyColor: color,
    shortsColor: shorts,
    sockColor: color,
    bootColor: 0x161a24,
    bootAccent: gloveColor,
    skinColor: 0xe3b18a,
    hairColor: 0x2a1d15,
    accentColor: secondary,
    number,
    isKeeper: true,
    gloveColor,
    scale: 1.04,
  });

  const { group } = rig;
  if (scene) scene.add(group);

  // ---- COLLIDER ANCHORS ATTACHED TO SKELETON ----
  function makeAnchor(parent, x, y, z, radius) {
    const obj = new THREE.Object3D();
    obj.position.set(x, y, z);
    parent.add(obj);
    return { obj, radius, worldPos: new THREE.Vector3() };
  }

  const colliderAnchors = [
    makeAnchor(rig.leftArm.hand, 0, -0.10, 0.02, 0.25),
    makeAnchor(rig.rightArm.hand, 0, -0.10, 0.02, 0.25),
    makeAnchor(rig.leftArm.elbow, 0, -0.15, 0, 0.20),
    makeAnchor(rig.rightArm.elbow, 0, -0.15, 0, 0.20),
    makeAnchor(rig.leftArm.shoulder, 0, -0.12, 0, 0.19),
    makeAnchor(rig.rightArm.shoulder, 0, -0.12, 0, 0.19),
    makeAnchor(rig.torso, 0, 0.34, 0.02, 0.26),
    makeAnchor(rig.torso, 0, 0.14, 0.02, 0.24),
    makeAnchor(rig.hips, 0, 0, 0.02, 0.23),
    makeAnchor(rig.head, 0, 0.11, 0, 0.18),
    makeAnchor(rig.leftLeg.knee, 0, -0.05, 0.02, 0.19),
    makeAnchor(rig.rightLeg.knee, 0, -0.05, 0.02, 0.19),
  ];

  const collidersOut = colliderAnchors.map((a) => ({
    center: a.worldPos,
    radius: a.radius,
  }));

  function getHandColliders() {
    group.updateWorldMatrix(true, true);
    for (let i = 0; i < colliderAnchors.length; i++) {
      colliderAnchors[i].obj.getWorldPosition(colliderAnchors[i].worldPos);
    }
    return collidersOut;
  }

  // ---- STATE ----
  const BASE_Z = 0.3;
  const state = {
    mode: 'idle', // 'idle' | 'ready' | 'dive' | 'celebrate' | 'disappointed'
    time: 0,
    shuffleTargetX: 0,
    currentX: 0,
    diveDir: 'center',
    diveHeight: 'low',
    diveDuration: 0.55,
    diveElapsed: 0,
    diveStartX: 0,
    diveStartZ: BASE_Z,
    // v2 additions
    ballTarget: null,
    landEmitted: false,
    pendingLandEvent: null,
  };

  function applyBallTracking() {
    if (!state.ballTarget) return;
    const dx = state.ballTarget.x - group.position.x;
    const dy = state.ballTarget.y - (group.position.y + 1.55);
    const dz = Math.max(0.5, state.ballTarget.z - group.position.z);
    const yaw = clamp(Math.atan2(dx, dz), -0.52, 0.52);
    const pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.32, 0.32);
    rig.head.rotation.y += yaw * 0.72;
    rig.head.rotation.x += pitch * 0.55;
    rig.torso.rotation.y += yaw * 0.24;
  }

  function applyIdlePose(t) {
    resetJoints(rig);
    const breath = Math.sin(t * 2.2);
    rig.hips.position.y = rig.HIP_Y + breath * 0.012;
    rig.torso.rotation.x = 0.04 + breath * 0.015;
    rig.head.rotation.y = Math.sin(t * 0.9) * 0.06;

    rig.leftArm.shoulder.rotation.set(-0.18, 0, 0.22);
    rig.rightArm.shoulder.rotation.set(-0.18, 0, -0.22);
    rig.leftArm.elbow.rotation.set(-0.55, 0, 0);
    rig.rightArm.elbow.rotation.set(-0.55, 0, 0);

    rig.leftLeg.hip.rotation.set(0, 0, 0.08);
    rig.rightLeg.hip.rotation.set(0, 0, -0.08);

    applyBallTracking();
  }

  function applyReadyPose(t) {
    resetJoints(rig);
    const bounce = Math.abs(Math.sin(t * 5.2));
    const sway = Math.sin(t * 2.6);

    rig.hips.position.y = rig.HIP_Y - 0.16 + bounce * 0.045;
    rig.hips.position.x = sway * 0.035;
    rig.hips.rotation.z = -sway * 0.03;

    rig.torso.rotation.x = 0.30;
    rig.head.rotation.x = -0.24;

    rig.leftArm.shoulder.rotation.set(-0.62, 0.18, 0.42 + bounce * 0.05);
    rig.rightArm.shoulder.rotation.set(-0.62, -0.18, -0.42 - bounce * 0.05);
    rig.leftArm.elbow.rotation.set(-1.15, 0, -0.25);
    rig.rightArm.elbow.rotation.set(-1.15, 0, 0.25);

    const kneeBend = 0.56 - bounce * 0.10;
    rig.leftLeg.hip.rotation.set(-kneeBend * 0.55, 0, 0.20);
    rig.rightLeg.hip.rotation.set(-kneeBend * 0.55, 0, -0.20);
    rig.leftLeg.knee.rotation.set(kneeBend, 0, 0);
    rig.rightLeg.knee.rotation.set(kneeBend, 0, 0);
    rig.leftLeg.ankle.rotation.set(-kneeBend * 0.45, 0, -0.12);
    rig.rightLeg.ankle.rotation.set(-kneeBend * 0.45, 0, 0.12);

    applyBallTracking();
  }

  function applyDivePose(elapsed) {
    resetJoints(rig);
    const dur = Math.max(0.2, state.diveDuration);
    const dir = state.diveDir;
    const isHigh = state.diveHeight === 'high';

    if (dir === 'center') {
      const p = clamp(elapsed / dur, 0, 1);
      const landT = clamp((elapsed - dur) / 0.35, 0, 1);

      group.position.x = state.diveStartX * (1 - easeOutQuad(p) * 0.45);
      group.position.z = state.diveStartZ + Math.sin(Math.min(1, p) * Math.PI) * 0.18;

      if (isHigh) {
        const jumpArc = p < 1 ? Math.sin(p * Math.PI) : 0;
        group.position.y = jumpArc * 0.72;

        const reach = p < 1 ? easeOutCubic(Math.min(1, p * 1.8)) : 1 - easeInOutCubic(landT) * 0.7;
        rig.hips.position.y = rig.HIP_Y - (1 - jumpArc) * 0.08 * (1 - landT);
        rig.torso.rotation.x = lerp(0.15, -0.06, reach);

        rig.leftArm.shoulder.rotation.set(lerp(-0.5, -2.95, reach), 0, lerp(0.35, 0.24, reach));
        rig.rightArm.shoulder.rotation.set(lerp(-0.5, -2.95, reach), 0, lerp(-0.35, -0.24, reach));
        rig.leftArm.elbow.rotation.set(lerp(-0.9, -0.12, reach), 0, 0);
        rig.rightArm.elbow.rotation.set(lerp(-0.9, -0.12, reach), 0, 0);

        const kneeTuck = jumpArc * 0.55;
        rig.leftLeg.hip.rotation.set(-kneeTuck * 0.5, 0, 0.14);
        rig.rightLeg.hip.rotation.set(-kneeTuck * 0.5, 0, -0.14);
        rig.leftLeg.knee.rotation.set(kneeTuck, 0, 0);
        rig.rightLeg.knee.rotation.set(kneeTuck, 0, 0);

        if (p >= 1 && !state.landEmitted) {
          state.landEmitted = true;
          state.pendingLandEvent = new THREE.Vector3(group.position.x, 0.04, group.position.z);
        }
      } else {
        const drop = p < 1 ? easeOutCubic(Math.min(1, p * 2.0)) : 1 - easeInOutCubic(landT) * 0.25;
        group.position.y = 0;
        rig.hips.position.y = lerp(rig.HIP_Y - 0.12, 0.54, drop);
        rig.torso.rotation.x = lerp(0.25, 0.38, drop);
        rig.head.rotation.x = -0.32 * drop;

        rig.leftArm.shoulder.rotation.set(-0.55 * drop, 0, lerp(0.35, 1.25, drop));
        rig.rightArm.shoulder.rotation.set(-0.55 * drop, 0, lerp(-0.35, -1.25, drop));
        rig.leftArm.elbow.rotation.set(-0.35, 0, -0.2);
        rig.rightArm.elbow.rotation.set(-0.35, 0, 0.2);

        rig.leftLeg.hip.rotation.set(-0.65 * drop, 0, 0.55 * drop);
        rig.rightLeg.hip.rotation.set(-0.65 * drop, 0, -0.55 * drop);
        rig.leftLeg.knee.rotation.set(1.15 * drop, 0, 0);
        rig.rightLeg.knee.rotation.set(1.15 * drop, 0, 0);
      }
      return;
    }

    // Side dives ('left' = -x, 'right' = +x)
    const sign = dir === 'right' ? 1 : -1;
    const flightP = clamp(elapsed / dur, 0, 1);
    const landP = clamp((elapsed - dur) / 0.55, 0, 1);

    const maxLateral = isHigh ? 2.15 : 2.10;
    const targetX = clamp(state.diveStartX + sign * maxLateral, -2.55, 2.55);
    const lateralProgress = easeOutCubic(flightP);
    const slideExtra = sign * 0.22 * easeOutQuad(landP);
    group.position.x = clamp(lerp(state.diveStartX, targetX, lateralProgress) + slideExtra, -2.75, 2.75);
    group.position.z = state.diveStartZ + easeOutQuad(flightP) * 0.28;

    let hipY;
    if (isHigh) {
      if (flightP < 1) {
        const arc = Math.sin(flightP * Math.PI * 0.85);
        hipY = lerp(0.80, 1.58, arc);
      } else {
        const endFlightY = lerp(0.80, 1.58, Math.sin(Math.PI * 0.85));
        hipY = lerp(endFlightY, 0.24, easeInQuad(Math.min(1, landP * 1.45)));
      }
    } else {
      if (flightP < 1) {
        const hop = Math.sin(flightP * Math.PI) * 0.16;
        hipY = lerp(0.76, 0.30, easeOutQuad(flightP)) + hop;
      } else {
        hipY = lerp(0.30, 0.22, easeOutQuad(landP));
      }
    }

    // Emit turf landing event once when keeper hits the grass
    if (!state.landEmitted && ((isHigh && landP >= 0.58) || (!isHigh && flightP >= 0.92))) {
      state.landEmitted = true;
      state.pendingLandEvent = new THREE.Vector3(group.position.x, 0.04, group.position.z);
    }

    group.position.y = 0;
    rig.hips.position.y = hipY;

    const peakRoll = isHigh ? 1.32 : 1.50;
    const landRoll = 1.56;
    const rollAngle =
      flightP < 1
        ? lerp(0, peakRoll, easeOutCubic(Math.min(1, flightP * 1.35)))
        : lerp(peakRoll, landRoll, easeOutQuad(landP));
    rig.hips.rotation.z = -sign * rollAngle;
    rig.hips.rotation.y = sign * 0.16 * easeOutQuad(flightP);

    const ext = flightP < 1 ? easeOutCubic(Math.min(1, flightP * 1.5)) : 1 - easeOutQuad(landP) * 0.25;
    const leadArm = sign > 0 ? rig.leftArm : rig.rightArm;
    const trailArm = sign > 0 ? rig.rightArm : rig.leftArm;

    leadArm.shoulder.rotation.set(lerp(-0.5, -3.02, ext), 0, sign * lerp(0.3, 0.12, ext));
    leadArm.elbow.rotation.set(lerp(-0.8, -0.06, ext), 0, 0);

    trailArm.shoulder.rotation.set(lerp(-0.5, -2.82, ext), 0, -sign * lerp(0.3, 0.22, ext));
    trailArm.elbow.rotation.set(lerp(-0.8, -0.18, ext), 0, 0);

    rig.head.rotation.z = sign * 0.35 * ext;
    rig.head.rotation.x = -0.15 * ext;

    const legRelax = easeOutQuad(landP);
    rig.leftLeg.hip.rotation.set(0.12 * ext - 0.35 * legRelax, 0, 0.08);
    rig.rightLeg.hip.rotation.set(-0.10 * ext - 0.25 * legRelax, 0, -0.08);
    rig.leftLeg.knee.rotation.set(0.18 + 0.55 * legRelax, 0, 0);
    rig.rightLeg.knee.rotation.set(0.25 + 0.45 * legRelax, 0, 0);
  }

  function applyCelebratePose(t) {
    resetJoints(rig);
    const hopCycle = (t * 2.8) % 1;
    const hop = Math.sin(hopCycle * Math.PI);
    const pump = Math.sin(t * 7.5);

    group.position.y = hop * 0.26;
    rig.hips.position.y = rig.HIP_Y - (1 - hop) * 0.06;
    rig.torso.rotation.x = -0.12;
    rig.head.rotation.x = -0.18;

    rig.leftArm.shoulder.rotation.set(-2.55 + pump * 0.32, 0, 0.48);
    rig.rightArm.shoulder.rotation.set(-2.55 - pump * 0.32, 0, -0.48);
    rig.leftArm.elbow.rotation.set(-0.65 - pump * 0.25, 0, 0);
    rig.rightArm.elbow.rotation.set(-0.65 + pump * 0.25, 0, 0);

    rig.leftLeg.hip.rotation.set(-0.15 * hop, 0, 0.16);
    rig.rightLeg.hip.rotation.set(-0.15 * hop, 0, -0.16);
    rig.leftLeg.knee.rotation.set(0.35 * hop, 0, 0);
    rig.rightLeg.knee.rotation.set(0.35 * hop, 0, 0);
  }

  function applyDisappointedPose(t) {
    resetJoints(rig);
    const settle = easeOutCubic(Math.min(1, t / 0.45));
    const shake = Math.sin(t * 4.5) * 0.22 * settle;

    group.position.y = 0;
    rig.hips.position.y = lerp(rig.HIP_Y, 0.78, settle);
    rig.torso.rotation.x = lerp(0.05, 0.52, settle);
    rig.head.rotation.x = lerp(0, 0.38, settle);
    rig.head.rotation.y = shake;

    rig.leftArm.shoulder.rotation.set(-0.55 * settle, 0, 0.18);
    rig.rightArm.shoulder.rotation.set(-0.55 * settle, 0, -0.18);
    rig.leftArm.elbow.rotation.set(-0.35 * settle, 0, -0.25 * settle);
    rig.rightArm.elbow.rotation.set(-0.35 * settle, 0, 0.25 * settle);

    rig.leftLeg.hip.rotation.set(-0.38 * settle, 0, 0.14);
    rig.rightLeg.hip.rotation.set(-0.38 * settle, 0, -0.14);
    rig.leftLeg.knee.rotation.set(0.68 * settle, 0, 0);
    rig.rightLeg.knee.rotation.set(0.68 * settle, 0, 0);
  }

  // ---- PUBLIC API ----
  function reset() {
    state.mode = 'idle';
    state.time = 0;
    state.shuffleTargetX = 0;
    state.currentX = 0;
    state.diveElapsed = 0;
    state.landEmitted = false;
    state.pendingLandEvent = null;
    group.position.set(0, 0, BASE_Z);
    group.rotation.set(0, 0, 0);
    applyIdlePose(0);
  }

  function setReady() {
    state.mode = 'ready';
    state.time = 0;
    group.position.y = 0;
    group.position.z = BASE_Z;
    applyReadyPose(0);
  }

  function shuffle(x) {
    state.shuffleTargetX = clamp(Number(x) || 0, -1, 1);
  }

  function dive(dir = 'center', height = 'low', duration = 0.55) {
    state.mode = 'dive';
    state.diveDir = dir === 'left' || dir === 'right' ? dir : 'center';
    state.diveHeight = height === 'high' ? 'high' : 'low';
    state.diveDuration = Math.max(0.22, Number(duration) || 0.55);
    state.diveElapsed = 0;
    state.diveStartX = group.position.x;
    state.diveStartZ = group.position.z;
    state.landEmitted = false;
    state.pendingLandEvent = null;
    applyDivePose(0);
  }

  function celebrate() {
    state.mode = 'celebrate';
    state.time = 0;
    group.position.y = 0;
    group.position.z = BASE_Z;
    applyCelebratePose(0);
  }

  function disappointed() {
    state.mode = 'disappointed';
    state.time = 0;
    group.position.y = 0;
    applyDisappointedPose(0);
  }

  function setKit(opts) {
    rig.applyKit(opts);
  }

  function setBallTarget(vec3) {
    if (vec3 && typeof vec3.x === 'number') {
      if (!state.ballTarget) state.ballTarget = new THREE.Vector3();
      state.ballTarget.set(vec3.x, vec3.y, vec3.z);
    } else {
      state.ballTarget = null;
    }
  }

  function consumeLandEvent() {
    const ev = state.pendingLandEvent;
    state.pendingLandEvent = null;
    return ev;
  }

  function update(dt) {
    const safeDt = Math.min(Math.max(dt || 0, 0), 0.1);
    state.time += safeDt;

    if (state.mode === 'idle') {
      state.currentX = lerp(state.currentX, state.shuffleTargetX, 1 - Math.exp(-8 * safeDt));
      group.position.x = state.currentX;
      applyIdlePose(state.time);
    } else if (state.mode === 'ready') {
      const prevX = state.currentX;
      state.currentX = lerp(state.currentX, state.shuffleTargetX, 1 - Math.exp(-9 * safeDt));
      group.position.x = state.currentX;
      const vx = safeDt > 0.0001 ? (state.currentX - prevX) / safeDt : 0;
      applyReadyPose(state.time);
      rig.hips.rotation.z += clamp(-vx * 0.04, -0.12, 0.12);
    } else if (state.mode === 'dive') {
      state.diveElapsed += safeDt;
      applyDivePose(state.diveElapsed);
    } else if (state.mode === 'celebrate') {
      applyCelebratePose(state.time);
    } else if (state.mode === 'disappointed') {
      applyDisappointedPose(state.time);
    }
  }

  reset();

  return {
    group,
    reset,
    setReady,
    shuffle,
    dive,
    getHandColliders,
    celebrate,
    disappointed,
    update,
    // v2 API
    setKit,
    setBallTarget,
    consumeLandEvent,
  };
}

// ============ SHOOTER ============
export function createShooter(
  scene,
  { color = 0xd32f2f, secondary = 0xffffff, shorts = 0xf4f6fa, number = 10 } = {}
) {
  const rig = buildHumanoidRig({
    jerseyColor: color,
    shortsColor: shorts,
    sockColor: color,
    bootColor: 0x161a24,
    bootAccent: 0xffd54f,
    skinColor: 0xe6b58c,
    hairColor: 0x1f1612,
    accentColor: secondary,
    number,
    isKeeper: false,
    scale: 1.0,
  });

  const { group } = rig;
  group.rotation.y = Math.PI;
  if (scene) scene.add(group);

  const START_POS = new THREE.Vector3(0, 0, 13.5);
  const CONTACT_POS = new THREE.Vector3(-0.20, 0, 11.48);

  const state = {
    mode: 'idle', // 'idle' | 'runup' | 'followthrough' | 'celebrate' | 'disappointed'
    time: 0,
    runupDuration: 1.2,
    runupElapsed: 0,
    contactFired: false,
    onContact: null,
    followElapsed: 0,
    // v2 additions
    shotType: 'normal', // 'normal' | 'finesse' | 'panenka' | 'trivela'
    autoStutter: false,
    stutterTriggered: false,
    stutterRemaining: 0,
    stutterTotal: 0.34,
    celebrateStyle: 0, // 0 = knee slide, 1 = jump-spin SIUU, 2 = airplane
    celebrateStartPos: new THREE.Vector3(),
  };

  function applyIdlePose(t) {
    resetJoints(rig);
    const breath = Math.sin(t * 2.0);
    const weightShift = Math.sin(t * 1.1) * 0.025;

    rig.hips.position.y = rig.HIP_Y + breath * 0.01;
    rig.hips.position.x = weightShift;
    rig.torso.rotation.x = 0.04 + breath * 0.015;
    rig.head.rotation.x = 0.06;

    rig.leftArm.shoulder.rotation.set(-0.1, 0, 0.20);
    rig.rightArm.shoulder.rotation.set(-0.1, 0, -0.20);
    rig.leftArm.elbow.rotation.set(-0.42, 0, 0);
    rig.rightArm.elbow.rotation.set(-0.42, 0, 0);

    rig.leftLeg.hip.rotation.set(-0.04, 0, 0.07);
    rig.rightLeg.hip.rotation.set(0.05, 0, -0.07);
    rig.leftLeg.knee.rotation.set(0.08, 0, 0);
    rig.rightLeg.knee.rotation.set(0.06, 0, 0);
  }

  function applyRunupPose(p, isStuttering = false, stutterPhase = 0) {
    resetJoints(rig);
    const t = clamp(p, 0, 1);
    const shotType = state.shotType;

    // Curve width adapts subtly per shot type
    const ctrlX =
      shotType === 'finesse' ? -1.02 :
      shotType === 'trivela' ? -0.35 :
      shotType === 'panenka' ? -0.58 : -0.78;
    const ctrlZ = 12.55;

    const u = 1 - t;
    const posX = u * u * START_POS.x + 2 * u * t * ctrlX + t * t * CONTACT_POS.x;
    const posZ = u * u * START_POS.z + 2 * u * t * ctrlZ + t * t * CONTACT_POS.z;

    const dx = 2 * u * (ctrlX - START_POS.x) + 2 * t * (CONTACT_POS.x - ctrlX);
    const dz = 2 * u * (ctrlZ - START_POS.z) + 2 * t * (CONTACT_POS.z - ctrlZ);
    const travelYaw = Math.atan2(dx, dz);

    group.position.set(posX, 0, posZ);
    group.rotation.y = travelYaw;

    if (isStuttering) {
      // Visible mid-run-up stutter-step hesitation/chop!
      const chop = Math.sin(stutterPhase * Math.PI * 5.0);
      const dip = Math.sin(stutterPhase * Math.PI);
      rig.hips.position.y = rig.HIP_Y - 0.14 * dip + Math.abs(chop) * 0.03;
      rig.torso.rotation.x = 0.28 + 0.12 * dip;
      rig.torso.rotation.y = chop * 0.24; // Shoulder feint!
      rig.head.rotation.x = -0.22;

      rig.leftArm.shoulder.rotation.set(-0.45 - chop * 0.3, 0, 0.65);
      rig.rightArm.shoulder.rotation.set(-0.45 + chop * 0.3, 0, -0.65);
      rig.leftArm.elbow.rotation.set(-1.0, 0, 0);
      rig.rightArm.elbow.rotation.set(-1.0, 0, 0);

      // Rapid choppy mini-steps
      rig.leftLeg.hip.rotation.set(-0.35 + chop * 0.32, 0, 0.12);
      rig.rightLeg.hip.rotation.set(-0.35 - chop * 0.32, 0, -0.12);
      rig.leftLeg.knee.rotation.set(0.62 + Math.max(0, chop) * 0.35, 0, 0);
      rig.rightLeg.knee.rotation.set(0.62 + Math.max(0, -chop) * 0.35, 0, 0);
      return;
    }

    if (t < 0.72) {
      const runP = t / 0.72;
      const stride = Math.sin(runP * Math.PI * 3.5);
      const strideAbs = Math.abs(stride);

      rig.hips.position.y = rig.HIP_Y - 0.05 + Math.abs(Math.cos(runP * Math.PI * 3.5)) * 0.06;
      rig.torso.rotation.x = 0.22 + runP * 0.08;
      rig.torso.rotation.y = -stride * 0.18;
      rig.head.rotation.x = -0.16;

      rig.leftArm.shoulder.rotation.set(-stride * 0.85, 0, 0.22);
      rig.rightArm.shoulder.rotation.set(stride * 0.85, 0, -0.22);
      rig.leftArm.elbow.rotation.set(-1.15, 0, 0);
      rig.rightArm.elbow.rotation.set(-1.15, 0, 0);

      rig.leftLeg.hip.rotation.set(stride * 0.85, 0, 0.04);
      rig.rightLeg.hip.rotation.set(-stride * 0.85, 0, -0.04);
      rig.leftLeg.knee.rotation.set(stride > 0 ? 0.25 : 0.95 * strideAbs, 0, 0);
      rig.rightLeg.knee.rotation.set(stride < 0 ? 0.25 : 0.95 * strideAbs, 0, 0);
    } else {
      // Kick windup & strike phase: [0.72, 1.0], customized per shotType
      const k = (t - 0.72) / 0.28;
      const strikeYawOffset =
        shotType === 'finesse' ? 0.28 :
        shotType === 'trivela' ? -0.14 :
        shotType === 'panenka' ? 0.06 : 0.16;
      group.rotation.y = lerp(travelYaw, Math.PI + strikeYawOffset, easeOutQuad(k));

      rig.hips.position.y = shotType === 'panenka' ? rig.HIP_Y - 0.11 : rig.HIP_Y - 0.07;

      // Planted left leg
      rig.leftLeg.hip.rotation.set(-0.24, 0, 0.10);
      rig.leftLeg.knee.rotation.set(shotType === 'panenka' ? 0.48 : 0.36, 0, 0);
      rig.leftLeg.ankle.rotation.set(-0.12, 0, 0);

      // Shot-specific windup & strike parameters
      const windHip = shotType === 'panenka' ? 0.45 : shotType === 'finesse' ? 0.78 : 0.94;
      const windKnee = shotType === 'panenka' ? 0.82 : 1.32;
      const strikeHip = shotType === 'panenka' ? -0.34 : shotType === 'trivela' ? -0.58 : -0.52;
      const hipRoll = shotType === 'trivela' ? -0.16 : shotType === 'finesse' ? 0.26 : 0.18;

      if (k < 0.55) {
        const w = easeOutQuad(k / 0.55);
        rig.torso.rotation.x = lerp(0.24, shotType === 'panenka' ? 0.20 : 0.12, w);
        rig.torso.rotation.y = lerp(0, shotType === 'trivela' ? 0.24 : -0.35, w);
        rig.hips.rotation.z = lerp(0, hipRoll * 0.65, w);

        rig.rightLeg.hip.rotation.set(lerp(0.1, windHip, w), shotType === 'finesse' ? -0.28 * w : 0, -0.06);
        rig.rightLeg.knee.rotation.set(lerp(0.3, windKnee, w), 0, 0);
        rig.rightLeg.ankle.rotation.set(0.32 * w, 0, 0);

        rig.leftArm.shoulder.rotation.set(-0.35, 0, lerp(0.25, 1.15, w));
        rig.leftArm.elbow.rotation.set(-0.45, 0, 0);
        rig.rightArm.shoulder.rotation.set(0.42 * w, 0, -0.35);
        rig.rightArm.elbow.rotation.set(-0.85, 0, 0);
      } else {
        const s = easeInQuad((k - 0.55) / 0.45);
        rig.torso.rotation.x = lerp(0.12, shotType === 'panenka' ? -0.04 : 0.22, s);
        rig.torso.rotation.y = lerp(shotType === 'trivela' ? 0.24 : -0.35, shotType === 'trivela' ? -0.36 : 0.24, s);
        rig.hips.rotation.z = lerp(hipRoll * 0.65, hipRoll, s);

        // Foot angle: finesse opens inside of boot, trivela angles outside of boot, panenka scoops gently
        const footYaw =
          shotType === 'finesse' ? -0.45 :
          shotType === 'trivela' ? 0.42 : 0;
        const footPitch = shotType === 'panenka' ? -0.25 : 0.42;

        rig.rightLeg.hip.rotation.set(lerp(windHip, strikeHip, s), footYaw * 0.5, -0.05);
        rig.rightLeg.knee.rotation.set(lerp(windKnee, shotType === 'panenka' ? 0.22 : 0.08, s), 0, 0);
        rig.rightLeg.ankle.rotation.set(footPitch, footYaw, 0);

        rig.leftArm.shoulder.rotation.set(lerp(-0.35, 0.25, s), 0, lerp(1.15, 0.98, s));
        rig.leftArm.elbow.rotation.set(-0.4, 0, 0);
        rig.rightArm.shoulder.rotation.set(lerp(0.42, -0.55, s), 0, -0.35);
        rig.rightArm.elbow.rotation.set(-0.75, 0, 0);
      }
    }
  }

  function applyFollowThroughPose(elapsed) {
    resetJoints(rig);
    const p = clamp(elapsed / 0.55, 0, 1);
    const swing = easeOutCubic(Math.min(1, p * 1.6));
    const settle = easeInOutCubic(Math.max(0, (p - 0.55) / 0.45));
    const shotType = state.shotType;

    const stepZ = shotType === 'panenka' ? 11.15 : 10.75;
    group.position.x = lerp(CONTACT_POS.x, -0.06, easeOutQuad(p));
    group.position.z = lerp(CONTACT_POS.z, stepZ, easeOutQuad(p));
    group.rotation.y = Math.PI + lerp(0.16, 0.0, p);

    rig.hips.position.y = rig.HIP_Y - 0.05 * (1 - settle);
    rig.torso.rotation.x = lerp(shotType === 'panenka' ? -0.04 : 0.22, 0.04, settle);
    const followYaw = shotType === 'trivela' ? -0.52 : shotType === 'finesse' ? 0.62 : 0.45;
    rig.torso.rotation.y = lerp(0.22, followYaw, swing) * (1 - settle);
    rig.hips.rotation.z = lerp(0.18, 0.0, settle);

    const peakLeg = shotType === 'panenka' ? -0.58 : shotType === 'finesse' ? -1.08 : -1.22;
    rig.rightLeg.hip.rotation.set(lerp(-0.52, peakLeg, swing) * (1 - settle), 0, shotType === 'trivela' ? 0.18 * swing * (1 - settle) : -0.05);
    rig.rightLeg.knee.rotation.set(lerp(0.08, 0.45, swing) * (1 - settle), 0, 0);

    rig.leftLeg.hip.rotation.set(-0.22 * (1 - settle), 0, 0.08);
    rig.leftLeg.knee.rotation.set(0.32 * (1 - settle), 0, 0);

    rig.leftArm.shoulder.rotation.set(lerp(0.25, -0.1, settle), 0, lerp(0.95, 0.22, settle));
    rig.leftArm.elbow.rotation.set(-0.45, 0, 0);
    rig.rightArm.shoulder.rotation.set(lerp(-0.55, -0.1, settle), 0, lerp(-0.35, -0.22, settle));
    rig.rightArm.elbow.rotation.set(-0.65, 0, 0);
  }

  function applyCelebratePose(t) {
    resetJoints(rig);
    const style = state.celebrateStyle;

    if (style === 1) {
      // Style 1: Iconic Jump-Spin "SIUU" celebration!
      if (t < 0.52) {
        const p = t / 0.52;
        const jump = Math.sin(p * Math.PI);
        group.position.y = jump * 0.62;
        // Full 360° celebratory spin in mid-air
        group.rotation.y = Math.PI + easeInOutCubic(p) * Math.PI * 2;
        rig.hips.position.y = rig.HIP_Y;
        rig.torso.rotation.x = -0.14 * jump;

        // Arms crossed/tucked on takeoff then exploding outward on landing
        rig.leftArm.shoulder.rotation.set(-1.35 * jump, 0, 0.5 + 0.6 * p);
        rig.rightArm.shoulder.rotation.set(-1.35 * jump, 0, -0.5 - 0.6 * p);
        rig.leftArm.elbow.rotation.set(-0.9 * (1 - p), 0, 0);
        rig.rightArm.elbow.rotation.set(-0.9 * (1 - p), 0, 0);

        rig.leftLeg.knee.rotation.set(0.55 * jump, 0, 0);
        rig.rightLeg.knee.rotation.set(0.55 * jump, 0, 0);
      } else {
        // Power landing stance: wide legs, arms thrown down & back, chest out!
        const l = clamp((t - 0.52) / 0.28, 0, 1);
        const snap = easeOutBack(l);
        group.position.y = 0;
        group.rotation.y = Math.PI;
        rig.hips.position.y = rig.HIP_Y - 0.14 * clamp(snap, 0, 1.1);
        rig.torso.rotation.x = -0.18 * l;
        rig.head.rotation.x = -0.15 * l;

        rig.leftArm.shoulder.rotation.set(0.35 * l, 0, 0.95 * clamp(snap, 0, 1.1));
        rig.rightArm.shoulder.rotation.set(0.35 * l, 0, -0.95 * clamp(snap, 0, 1.1));
        rig.leftArm.elbow.rotation.set(-0.2, 0, 0);
        rig.rightArm.elbow.rotation.set(-0.2, 0, 0);

        rig.leftLeg.hip.rotation.set(-0.22 * l, 0, 0.34 * l);
        rig.rightLeg.hip.rotation.set(-0.22 * l, 0, -0.34 * l);
        rig.leftLeg.knee.rotation.set(0.42 * l, 0, 0);
        rig.rightLeg.knee.rotation.set(0.42 * l, 0, 0);
      }
      return;
    }

    if (style === 2) {
      // Style 2: Airplane arms joyful glide!
      const stride = Math.sin(t * 7.0);
      const bank = Math.sin(t * 3.0) * 0.24;
      group.position.y = Math.abs(Math.cos(t * 7.0)) * 0.08;
      rig.hips.position.y = rig.HIP_Y - 0.04;
      rig.hips.rotation.z = bank;
      rig.torso.rotation.x = 0.26;
      rig.head.rotation.x = -0.22;

      // Arms stretched straight out horizontally like airplane wings
      rig.leftArm.shoulder.rotation.set(0.05, 0, 1.52);
      rig.rightArm.shoulder.rotation.set(0.05, 0, -1.52);
      rig.leftArm.elbow.rotation.set(-0.08, 0, 0);
      rig.rightArm.elbow.rotation.set(-0.08, 0, 0);

      // Celebratory jog legs
      rig.leftLeg.hip.rotation.set(stride * 0.65, 0, 0.08);
      rig.rightLeg.hip.rotation.set(-stride * 0.65, 0, -0.08);
      rig.leftLeg.knee.rotation.set(stride > 0 ? 0.25 : 0.85, 0, 0);
      rig.rightLeg.knee.rotation.set(stride < 0 ? 0.25 : 0.85, 0, 0);
      return;
    }

    // Style 0 (default): Classic Knee Slide with arms wide!
    if (t < 0.45) {
      const p = t / 0.45;
      const jump = Math.sin(p * Math.PI);
      group.position.y = jump * 0.34;
      rig.hips.position.y = rig.HIP_Y;
      rig.torso.rotation.x = -0.15 * jump;
      rig.head.rotation.x = -0.22 * jump;

      rig.leftArm.shoulder.rotation.set(-2.5 * easeOutCubic(p), 0, 0.65);
      rig.rightArm.shoulder.rotation.set(-2.5 * easeOutCubic(p), 0, -0.65);
      rig.leftArm.elbow.rotation.set(-0.35, 0, 0);
      rig.rightArm.elbow.rotation.set(-0.35, 0, 0);

      rig.leftLeg.knee.rotation.set(0.65 * jump, 0, 0);
      rig.rightLeg.knee.rotation.set(0.65 * jump, 0, 0);
    } else {
      const s = clamp((t - 0.45) / 0.35, 0, 1);
      const slideEase = easeOutBack(s);
      const cheerWave = Math.sin((t - 0.45) * 6.0) * 0.14;

      group.position.y = 0;
      rig.hips.position.y = lerp(rig.HIP_Y, 0.50, clamp(slideEase, 0, 1.05));
      rig.torso.rotation.x = lerp(0, -0.26, s);
      rig.head.rotation.x = -0.18;

      rig.leftArm.shoulder.rotation.set(-1.75 + cheerWave, 0, 1.15);
      rig.rightArm.shoulder.rotation.set(-1.75 - cheerWave, 0, -1.15);
      rig.leftArm.elbow.rotation.set(-0.35, 0, 0);
      rig.rightArm.elbow.rotation.set(-0.35, 0, 0);

      rig.leftLeg.hip.rotation.set(-0.18 * s, 0, 0.14);
      rig.rightLeg.hip.rotation.set(-0.18 * s, 0, -0.14);
      rig.leftLeg.knee.rotation.set(1.82 * s, 0, 0);
      rig.rightLeg.knee.rotation.set(1.82 * s, 0, 0);
    }
  }

  function applyDisappointedPose(t) {
    resetJoints(rig);
    const p = easeOutCubic(Math.min(1, t / 0.42));
    const headShake = Math.sin(t * 4.2) * 0.18 * p;

    group.position.y = 0;
    rig.hips.position.y = rig.HIP_Y - 0.05 * p;
    rig.torso.rotation.x = 0.22 * p;
    rig.head.rotation.x = 0.30 * p;
    rig.head.rotation.y = headShake;

    rig.leftArm.shoulder.rotation.set(-2.35 * p, 0.35 * p, 0.72 * p);
    rig.rightArm.shoulder.rotation.set(-2.35 * p, -0.35 * p, -0.72 * p);
    rig.leftArm.elbow.rotation.set(-1.65 * p, 0, -0.55 * p);
    rig.rightArm.elbow.rotation.set(-1.65 * p, 0, 0.55 * p);

    rig.leftLeg.hip.rotation.set(-0.12 * p, 0, 0.08);
    rig.rightLeg.hip.rotation.set(-0.12 * p, 0, -0.08);
    rig.leftLeg.knee.rotation.set(0.24 * p, 0, 0);
    rig.rightLeg.knee.rotation.set(0.24 * p, 0, 0);
  }

  // ---- PUBLIC API ----
  function reset() {
    state.mode = 'idle';
    state.time = 0;
    state.runupElapsed = 0;
    state.contactFired = false;
    state.onContact = null;
    state.followElapsed = 0;
    state.shotType = 'normal';
    state.autoStutter = false;
    state.stutterTriggered = false;
    state.stutterRemaining = 0;
    group.position.copy(START_POS);
    group.rotation.set(0, Math.PI, 0);
    applyIdlePose(0);
  }

  function runUp(duration = 1.2, onContact = null, options = {}) {
    state.mode = 'runup';
    state.time = 0;
    state.runupDuration = Math.max(0.25, Number(duration) || 1.2);
    state.runupElapsed = 0;
    state.contactFired = false;
    state.onContact = typeof onContact === 'function' ? onContact : null;
    state.followElapsed = 0;
    const validTypes = ['normal', 'finesse', 'panenka', 'trivela'];
    state.shotType = options && validTypes.includes(options.shotType) ? options.shotType : 'normal';
    state.autoStutter = Boolean(options && options.stutter);
    state.stutterTriggered = false;
    state.stutterRemaining = 0;
    applyRunupPose(0);
  }

  function triggerStutter() {
    if (state.mode !== 'runup' || state.stutterTriggered || state.contactFired) return false;
    const p = state.runupElapsed / state.runupDuration;
    if (p >= 0.72) return false; // Too late (already planting/kicking)
    state.stutterTriggered = true;
    state.stutterRemaining = state.stutterTotal;
    return true;
  }

  function celebrate(style) {
    state.mode = 'celebrate';
    state.time = 0;
    state.celebrateStyle = style === 1 || style === 2 ? style : 0;
    state.celebrateStartPos.copy(group.position);
    group.position.y = 0;
    applyCelebratePose(0);
  }

  function disappointed() {
    state.mode = 'disappointed';
    state.time = 0;
    group.position.y = 0;
    applyDisappointedPose(0);
  }

  function setKit(opts) {
    rig.applyKit(opts);
  }

  function update(dt) {
    const safeDt = Math.min(Math.max(dt || 0, 0), 0.1);
    state.time += safeDt;

    if (state.mode === 'idle') {
      applyIdlePose(state.time);
    } else if (state.mode === 'runup') {
      const pBefore = state.runupElapsed / state.runupDuration;
      if (state.autoStutter && !state.stutterTriggered && pBefore >= 0.48 && pBefore < 0.70) {
        triggerStutter();
      }

      if (state.stutterRemaining > 0) {
        state.stutterRemaining = Math.max(0, state.stutterRemaining - safeDt);
        // Slow forward creep during stutter hesitation
        state.runupElapsed += safeDt * 0.16;
        const p = clamp(state.runupElapsed / state.runupDuration, 0, 1);
        const stutterPhase = 1 - state.stutterRemaining / state.stutterTotal;
        applyRunupPose(p, true, stutterPhase);
      } else {
        state.runupElapsed += safeDt;
        const p = clamp(state.runupElapsed / state.runupDuration, 0, 1);
        applyRunupPose(p, false, 0);
        if (p >= 1 && !state.contactFired) {
          state.contactFired = true;
          const cb = state.onContact;
          state.onContact = null;
          state.mode = 'followthrough';
          state.followElapsed = 0;
          if (cb) cb();
        }
      }
    } else if (state.mode === 'followthrough') {
      state.followElapsed += safeDt;
      applyFollowThroughPose(state.followElapsed);
    } else if (state.mode === 'celebrate') {
      applyCelebratePose(state.time);
    } else if (state.mode === 'disappointed') {
      applyDisappointedPose(state.time);
    }
  }

  reset();

  return {
    group,
    reset,
    runUp,
    triggerStutter,
    celebrate,
    disappointed,
    update,
    // v2 API
    setKit,
  };
}
