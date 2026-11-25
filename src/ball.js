import * as THREE from 'three';

export const BALL_RADIUS = 0.11;
const GRAVITY = 9.81;
const BASE_AIR_DRAG = 0.22;
const MAGNUS_COEFF = 0.26;
const NET_DEPTH = 2.0;

export const BALL_SKINS = [
  { id: 'classic', label: 'Klasik' },
  { id: 'star', label: 'Yıldız' },
  { id: 'neon', label: 'Neon' },
  { id: 'gold', label: 'Altın' },
];

const textureCache = new Map();
let detailMapsCache = null;

/**
 * 3D panel dikişleri için prosedürel bumpMap + roughnessMap (tüm top tasarımlarında ortak).
 */
function getBallDetailMaps() {
  if (detailMapsCache) return detailMapsCache;

  const size = 512;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  // Taban: parlak deri paneller (bump = yüksek/açık, roughness = düşük/koyu)
  bCtx.fillStyle = '#dcdcdc';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#525252'; // ~0.32 pürüzlülük
  rCtx.fillRect(0, 0, size, size);

  // İnce deri mikro-dokusu (deterministik)
  for (let i = 0; i < 2400; i++) {
    const x = (i * 197) % size;
    const y = (i * 353 + Math.floor(i / 40) * 19) % size;
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    bCtx.fillRect(x, y, 2, 2);
  }

  // Girintili dikiş olukları (bump = koyu çukur, roughness = mat/açık)
  const strokeSeam = (drawPath) => {
    bCtx.save();
    bCtx.strokeStyle = '#1a1a1a';
    bCtx.lineWidth = 4.5;
    drawPath(bCtx);
    bCtx.stroke();
    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = 1.2;
    bCtx.globalAlpha = 0.25;
    drawPath(bCtx);
    bCtx.stroke();
    bCtx.restore();

    rCtx.save();
    rCtx.strokeStyle = '#d8d8d8'; // ~0.85 mat dikiş
    rCtx.lineWidth = 5;
    drawPath(rCtx);
    rCtx.stroke();
    rCtx.restore();
  };

  const polyPath = (cx, cy, r, sides, rot) => (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * Math.PI * 2) / sides - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Kutup ve ekvator beşgen dikişleri
  strokeSeam(polyPath(size * 0.5, size * 0.06, 30, 5, 0));
  strokeSeam(polyPath(size * 0.5, size * 0.94, 30, 5, Math.PI));
  for (let i = 0; i < 5; i++) {
    const x1 = ((i + 0.5) / 5) * size;
    const x2 = ((i / 5) * size + size) % size;
    strokeSeam(polyPath(x1, size * 0.30, 34, 5, i * 0.25));
    strokeSeam(polyPath(x2, size * 0.70, 34, 5, Math.PI + i * 0.25));
    // Bağlantı dikiş çizgileri
    strokeSeam((ctx) => {
      ctx.beginPath();
      ctx.moveTo(x1, size * 0.30 + 34);
      ctx.lineTo(x2, size * 0.70 - 34);
    });
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  detailMapsCache = { bumpMap, roughnessMap };
  return detailMapsCache;
}

/**
 * Seçilebilir futbol topu dokuları (CanvasTexture, harici dosya gerektirmez).
 */
function getBallTexture(skinId = 'classic') {
  if (textureCache.has(skinId)) return textureCache.get(skinId);

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const drawPoly = (cx, cy, r, sides, rot, fill, stroke) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * Math.PI * 2) / sides - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawStar = (cx, cy, outerR, innerR, points, fill, stroke) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  };

  if (skinId === 'star') {
    // Şampiyonlar Ligi esintili yıldızlı top
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo((i * size) / 8, 0); ctx.lineTo((i * size) / 8, size); ctx.stroke();
    }
    drawStar(size * 0.5, size * 0.08, 36, 15, 5, '#0f2862', '#60a5fa');
    drawStar(size * 0.5, size * 0.92, 36, 15, 5, '#0f2862', '#60a5fa');
    for (let i = 0; i < 5; i++) {
      const x = ((i + 0.5) / 5) * size;
      drawStar(x, size * 0.32, 42, 18, 5, '#1e3a8a', '#93c5fd');
      drawStar(((i / 5) * size + size) % size, size * 0.68, 42, 18, 5, '#0f172a', '#38bdf8');
    }
  } else if (skinId === 'neon') {
    // Yüksek görünürlüklü gece/kar neon topu
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#c8ff00');
    grad.addColorStop(0.5, '#a3e635');
    grad.addColorStop(1, '#22d3ee');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5; i++) {
      const x = ((i + 0.5) / 5) * size;
      drawPoly(x, size * 0.30, 34, 5, i * 0.3, '#0f172a', '#ffffff');
      drawPoly(((i / 5) * size + size) % size, size * 0.70, 34, 5, Math.PI, '#1e293b', '#f43f5e');
    }
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, size * 0.5); ctx.lineTo(size, size * 0.5); ctx.stroke();
  } else if (skinId === 'gold') {
    // Şampiyonluk altın topu
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#eab308');
    grad.addColorStop(1, '#a16207');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5; i++) {
      const x = ((i + 0.5) / 5) * size;
      drawPoly(x, size * 0.30, 34, 5, i * 0.2, '#1c1917', '#fef9c3');
      drawPoly(((i / 5) * size + size) % size, size * 0.70, 34, 5, Math.PI, '#1c1917', '#fef9c3');
    }
    drawStar(size * 0.5, size * 0.5, 44, 18, 5, '#ffffff', '#b45309');
  } else {
    // Klasik siyah-beyaz futbol topu
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(30, 40, 60, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo((i * size) / 8, 0); ctx.lineTo((i * size) / 8, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * size) / 8); ctx.lineTo(size, (i * size) / 8); ctx.stroke();
    }
    drawPoly(size * 0.5, size * 0.06, 30, 5, 0, '#181c24', '#d0d7e3');
    drawPoly(size * 0.5, size * 0.94, 30, 5, Math.PI, '#181c24', '#d0d7e3');
    for (let i = 0; i < 5; i++) {
      const x = ((i + 0.5) / 5) * size;
      drawPoly(x, size * 0.30, 34, 5, i * 0.25, '#181c24', '#d0d7e3');
      drawPoly(((i / 5) * size + size) % size, size * 0.70, 34, 5, Math.PI + i * 0.25, '#181c24', '#d0d7e3');
    }
    drawPoly(size, size * 0.70, 34, 5, Math.PI, '#181c24', '#d0d7e3');
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(size * 0.5, size * 0.5, 42, 0, Math.PI * 2); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(skinId, tex);
  return tex;
}

function closestPointOnSegment(p, a, b, out) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const lenSq = abx * abx + aby * aby + abz * abz;
  let t = 0;
  if (lenSq > 1e-8) {
    t = ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  out.set(a.x + abx * t, a.y + aby * t, a.z + abz * t);
  return out;
}

export function createBall(scene, goal) {
  const GOAL = goal || { halfWidth: 3.66, height: 2.44, postRadius: 0.06 };

  const geom = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
  const { bumpMap, roughnessMap } = getBallDetailMaps();
  const mat = new THREE.MeshStandardMaterial({
    map: getBallTexture('classic'),
    bumpMap,
    bumpScale: 0.014,
    roughnessMap,
    roughness: 0.85,
    metalness: 0.10,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Yerde yumuşak temas gölgesi
  const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.35, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.012;
  scene.add(groundShadow);

  // Hız izi (glowing trail spheres — InstancedMesh = tek draw call!)
  const TRAIL_COUNT = 22;
  const trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.72, 10, 8);
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const trailMesh = new THREE.InstancedMesh(trailGeo, trailMat, TRAIL_COUNT);
  trailMesh.frustumCulled = false;
  scene.add(trailMesh);

  const trailPoints = [];
  const trailDummy = new THREE.Object3D();
  let trailSampleAccum = 0;

  function clearTrail() {
    trailPoints.length = 0;
    trailDummy.scale.setScalar(0);
    trailDummy.position.set(0, -10, 0);
    trailDummy.updateMatrix();
    for (let i = 0; i < TRAIL_COUNT; i++) {
      trailMesh.setMatrixAt(i, trailDummy.matrix);
    }
    trailMesh.instanceMatrix.needsUpdate = true;
  }

  function pushTrailPoint(p) {
    trailPoints.unshift(p.clone());
    if (trailPoints.length > TRAIL_COUNT) trailPoints.pop();
    for (let i = 0; i < TRAIL_COUNT; i++) {
      if (i < trailPoints.length) {
        const frac = 1 - i / TRAIL_COUNT;
        trailDummy.position.copy(trailPoints[i]);
        trailDummy.scale.setScalar(frac * 0.92);
      } else {
        trailDummy.position.set(0, -10, 0);
        trailDummy.scale.setScalar(0);
      }
      trailDummy.updateMatrix();
      trailMesh.setMatrixAt(i, trailDummy.matrix);
    }
    trailMesh.instanceMatrix.needsUpdate = true;
  }

  const pos = new THREE.Vector3(0, BALL_RADIUS, 11);
  const vel = new THREE.Vector3();
  const spin = new THREE.Vector3();
  const env = {
    wind: new THREE.Vector3(0, 0, 0),
    weather: 'clear', // 'clear' | 'rain' | 'snow'
  };

  const hw = GOAL.halfWidth;
  const gh = GOAL.height;
  const pr = GOAL.postRadius;
  const postSegments = [
    { a: new THREE.Vector3(-hw, 0, 0), b: new THREE.Vector3(-hw, gh, 0), name: 'leftPost' },
    { a: new THREE.Vector3(hw, 0, 0), b: new THREE.Vector3(hw, gh, 0), name: 'rightPost' },
    { a: new THREE.Vector3(-hw, gh, 0), b: new THREE.Vector3(hw, gh, 0), name: 'crossbar' },
  ];

  const tmpClosest = new THREE.Vector3();
  const tmpNormal = new THREE.Vector3();
  const tmpAxis = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  const state = {
    active: false,
    flightTime: 0,
    inGoal: false,
    crossedOut: false,
    hitPost: false,
    saved: false,
    hitNet: false,
    settled: false,
    netSoundCooldown: 0,
    postSoundCooldown: 0,
    shotType: 'normal',
    lastSpeedKmh: 0,
  };

  function setSkin(skinId) {
    mat.map = getBallTexture(skinId);
    mat.metalness = skinId === 'gold' ? 0.55 : 0.10;
    mat.roughness = skinId === 'gold' ? 0.58 : 0.85;
    mat.needsUpdate = true;
  }

  function setEnvironment({ wind, weather } = {}) {
    if (wind) env.wind.copy(wind);
    if (weather) env.weather = weather;
  }

  function setTrailColor(hex, opacity = 0.44) {
    trailMat.color.setHex(hex);
    trailMat.opacity = opacity;
  }

  function syncMesh() {
    mesh.position.copy(pos);
    groundShadow.position.x = pos.x;
    groundShadow.position.z = pos.z;
    const hFactor = Math.max(0.25, 1 - pos.y * 0.22);
    groundShadow.scale.setScalar(hFactor);
    shadowMat.opacity = 0.35 * hFactor;
  }

  function setReplayPose(p, quat, addTrail = true) {
    pos.copy(p);
    if (quat) mesh.quaternion.copy(quat);
    syncMesh();
    if (addTrail) pushTrailPoint(pos);
  }

  function reset(spot) {
    const sx = spot ? spot.x : 0;
    const sz = spot ? spot.z : 11;
    pos.set(sx, BALL_RADIUS, sz);
    vel.set(0, 0, 0);
    spin.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    state.active = false;
    state.flightTime = 0;
    state.inGoal = false;
    state.crossedOut = false;
    state.hitPost = false;
    state.saved = false;
    state.hitNet = false;
    state.settled = false;
    state.netSoundCooldown = 0;
    state.postSoundCooldown = 0;
    state.shotType = 'normal';
    trailSampleAccum = 0;
    setTrailColor(0x38bdf8, 0.42);
    clearTrail();
    syncMesh();
  }

  /**
   * Şutun başlangıç hız vektörünü ve spin değerini hesaplar (kick ve predictTrajectory ortak kullanır).
   */
  function computeKickInitial({
    startX,
    startY,
    startZ,
    targetX,
    targetY,
    power,
    curl = 0,
    shotType = 'normal',
    timedFinish = null,
    weather = env.weather,
    speedMult = 1,
    curlMult = 1,
  }) {
    const p = Math.max(0.15, Math.min(1, power));
    const mult = Math.max(1, Math.min(2.0, Number(speedMult) || 1));
    const cMult = Math.max(1, Math.min(4.0, Number(curlMult) || 1));
    const distZ = Math.max(1, startZ);

    let speed;
    let effTargetX = targetX;
    let effTargetY = Math.max(BALL_RADIUS + 0.05, targetY);
    let effCurl = curl;
    let overThreshold = 0.85;
    let extraLoft = 0;

    if (shotType === 'panenka') {
      speed = 11.2 + p * 3.4;
      overThreshold = 0.94;
      extraLoft = 1.05;
      effTargetY = Math.max(1.25, Math.min(gh - 0.35, targetY + 0.35));
      effCurl = curl * 0.4;
    } else if (shotType === 'finesse') {
      speed = 15.0 + p * 14.2;
      overThreshold = 0.90;
      const autoDir = targetX >= 0 ? 0.55 : -0.55;
      effCurl = Math.max(-1.4, Math.min(1.4, curl * 1.45 + (Math.abs(curl) < 0.15 ? autoDir : 0)));
    } else if (shotType === 'trivela') {
      speed = 17.5 + p * 16.5;
      overThreshold = 0.86;
      const whip = targetX >= 0 ? 1.15 : -1.15;
      effCurl = Math.max(-1.6, Math.min(1.6, curl + whip));
    } else {
      speed = 16.0 + p * 19.2;
    }

    effCurl *= cMult;
    speed *= mult;

    if (timedFinish === 'perfect') {
      speed *= 1.10;
      overThreshold += 0.05;
    } else if (timedFinish === 'bad') {
      effTargetX += (Math.random() - 0.5) * 1.3;
      effTargetY += (Math.random() - 0.3) * 0.7;
    }

    if (p > overThreshold) {
      const over = (p - overThreshold) / Math.max(0.05, 1 - overThreshold);
      effTargetY += 0.85 + over * 2.5;
    }

    const dx = effTargetX - startX;
    const dy = effTargetY - startY;
    const flatDist = Math.hypot(dx, distZ);
    const tFlight = flatDist / (speed * 0.91);

    const spinY = effCurl * 17.5;
    const lateralCurveShift = 0.5 * (MAGNUS_COEFF * spinY * (-distZ / tFlight)) * tFlight * tFlight * 0.17;

    const airDrag = BASE_AIR_DRAG + (weather === 'snow' ? 0.06 : 0);
    const vx = (dx - lateralCurveShift) / tFlight;
    const vz = -distZ / tFlight;
    const vy = (dy + extraLoft + 0.5 * GRAVITY * tFlight * tFlight) / tFlight;

    const dragBoost = 1 + airDrag * tFlight * 0.44;
    return {
      vx: vx * dragBoost,
      vy: vy * (1 + airDrag * tFlight * 0.24),
      vz: vz * dragBoost,
      spinX: shotType === 'panenka' ? 14 : -speed * 0.9,
      spinY,
      spinZ: -vx * 0.4,
      tFlight,
      effTargetX,
      effTargetY,
    };
  }

  /**
   * Topun gerçek fizik parametreleriyle (yerçekimi, hava direnci, Magnus falso, rüzgar, şut tipi)
   * kale düzlemine (z = 0) kadar izleyeceği kavisli yörüngeyi simüle eder.
   */
  function predictTrajectory({
    aimX,
    aimY,
    power,
    curl = 0,
    shotType = 'normal',
    windX = env.wind.x,
    windZ = env.wind.z,
    weather = env.weather,
    speedMult = 1,
    curlMult = 1,
    samples = 24,
  }) {
    const sx = pos.x;
    const sy = Math.max(BALL_RADIUS, pos.y);
    const sz = Math.max(1, pos.z);

    const init = computeKickInitial({
      startX: sx,
      startY: sy,
      startZ: sz,
      targetX: aimX,
      targetY: aimY,
      power,
      curl,
      shotType,
      timedFinish: null,
      weather,
      speedMult,
      curlMult,
    });

    const airDrag = BASE_AIR_DRAG + (weather === 'snow' ? 0.06 : 0);
    const bounceRestitution = weather === 'rain' ? 0.62 : weather === 'snow' ? 0.44 : 0.52;
    const groundFriction = weather === 'rain' ? 1.35 : weather === 'snow' ? 3.2 : 2.2;

    let px = sx, py = sy, pz = sz;
    let vx = init.vx, vy = init.vy, vz = init.vz;
    let spinY = init.spinY;

    const h = 1 / 120;
    const maxSteps = 300; // 2.5 sn
    const rawPts = [new THREE.Vector3(px, py, pz)];
    let landX = aimX;
    let landY = aimY;
    let crossed = false;

    for (let i = 0; i < maxSteps; i++) {
      const prevX = px, prevY = py, prevZ = pz;

      vy -= GRAVITY * h;
      const drag = Math.exp(-airDrag * h);
      vx *= drag;
      vy *= drag;
      vz *= drag;

      if (py > BALL_RADIUS + 0.04) {
        vx += windX * 0.42 * h;
        vz += windZ * 0.25 * h;
      }
      if (Math.abs(spinY) > 0.01 && py > BALL_RADIUS + 0.02) {
        vx += MAGNUS_COEFF * spinY * (-vz) * 0.088 * h;
        spinY *= Math.exp(-0.32 * h);
      }

      px += vx * h;
      py += vy * h;
      pz += vz * h;

      if (py < BALL_RADIUS) {
        py = BALL_RADIUS;
        if (vy < -0.6) {
          vy = -vy * bounceRestitution;
          const slip = weather === 'rain' ? 0.94 : 0.82;
          vx *= slip;
          vz *= slip;
        } else {
          vy = 0;
          const fric = Math.exp(-groundFriction * h);
          vx *= fric;
          vz *= fric;
        }
      }

      if (prevZ >= 0 && pz <= 0) {
        const denom = prevZ - pz;
        const t = denom > 1e-6 ? prevZ / denom : 0;
        landX = prevX + (px - prevX) * t;
        landY = prevY + (py - prevY) * t;
        rawPts.push(new THREE.Vector3(landX, Math.max(BALL_RADIUS, landY), 0));
        crossed = true;
        break;
      }

      rawPts.push(new THREE.Vector3(px, py, pz));
    }

    if (!crossed) {
      landX = px;
      landY = py;
    }

    // Eşit aralıklı örnekleme
    const points = [];
    const lastIdx = rawPts.length - 1;
    const count = Math.max(2, samples);
    for (let i = 0; i < count; i++) {
      const f = (i / (count - 1)) * lastIdx;
      const idx0 = Math.floor(f);
      const idx1 = Math.min(lastIdx, idx0 + 1);
      const alpha = f - idx0;
      points.push(new THREE.Vector3().lerpVectors(rawPts[idx0], rawPts[idx1], alpha));
    }

    const insideX = Math.abs(landX) <= hw - pr * 0.6;
    const overBar = landY > gh - pr * 0.6;
    const inGoal = insideX && !overBar && landY >= 0;
    const isTopCorner = inGoal && Math.abs(landX) > hw - 1.15 && landY > gh - 0.85;

    return {
      points,
      landing: { x: landX, y: Math.max(BALL_RADIUS, landY), z: 0 },
      inGoal,
      overBar,
      isTopCorner,
    };
  }

  /**
   * Topa şut çeker (v2: shotType, timedFinish, wind/weather uyumlu).
   */
  function kick({
    targetX,
    targetY,
    power,
    curl = 0,
    shotType = 'normal',
    timedFinish = null,
    goldTrail = false,
    speedMult = 1,
    curlMult = 1,
  }) {
    state.shotType = shotType;
    const mult = Math.max(1, Math.min(2.0, Number(speedMult) || 1));
    const init = computeKickInitial({
      startX: pos.x,
      startY: pos.y,
      startZ: pos.z,
      targetX,
      targetY,
      power,
      curl,
      shotType,
      timedFinish,
      weather: env.weather,
      speedMult: mult,
      curlMult,
    });

    vel.set(init.vx, init.vy, init.vz);
    spin.set(init.spinX, init.spinY, init.spinZ);
    const { tFlight, effTargetX, effTargetY } = init;

    // İz rengi: Roket, Zamanlı vuruş veya 90'a giden şut → altın iz!
    const isTopCorner = Math.abs(effTargetX) > hw - 1.15 && effTargetY > gh - 0.85 && effTargetY < gh;
    if (mult > 1.25 || goldTrail || timedFinish === 'perfect' || isTopCorner) {
      setTrailColor(0xffcc00, mult > 1.25 ? 0.72 : 0.58);
    } else if (shotType === 'trivela') {
      setTrailColor(0xf43f5e, 0.48);
    } else if (shotType === 'finesse') {
      setTrailColor(0x22c55e, 0.45);
    } else if (shotType === 'panenka') {
      setTrailColor(0xa855f7, 0.45);
    } else {
      setTrailColor(0x38bdf8, 0.40);
    }

    clearTrail();
    pushTrailPoint(pos);

    state.active = true;
    state.flightTime = 0;
    state.inGoal = false;
    state.crossedOut = false;
    state.hitPost = false;
    state.saved = false;
    state.hitNet = false;
    state.settled = false;

    const actualSpeed = vel.length();
    const speedKmh = Math.round(actualSpeed * 3.6);
    state.lastSpeedKmh = speedKmh;
    return { tFlight, speed: actualSpeed, speedKmh };
  }

  function step(dt, ctx = {}) {
    if (!state.active || dt <= 0) {
      syncMesh();
      return state;
    }

    const {
      keeper,
      world,
      audio,
      onEvent,
      keeperReachBoost = 0,
      keeperDiveInfo = null,
      godSave = false,
      brickWall = false,
      homingTarget = null,
    } = ctx;
    const emit = (type, info) => { if (onEvent) onEvent(type, info); };

    state.netSoundCooldown = Math.max(0, state.netSoundCooldown - dt);
    state.postSoundCooldown = Math.max(0, state.postSoundCooldown - dt);

    const airDrag = BASE_AIR_DRAG + (env.weather === 'snow' ? 0.06 : 0);
    const bounceRestitution = env.weather === 'rain' ? 0.62 : env.weather === 'snow' ? 0.44 : 0.52;
    const groundFriction = env.weather === 'rain' ? 1.35 : env.weather === 'snow' ? 3.2 : 2.2;

    const maxStep = 1 / 240;
    const steps = Math.min(10, Math.max(1, Math.ceil(dt / maxStep)));
    const h = dt / steps;

    const colliders = (!state.saved && !state.inGoal && keeper && typeof keeper.getHandColliders === 'function')
      ? keeper.getHandColliders()
      : null;

    for (let s = 0; s < steps; s++) {
      state.flightTime += h;
      const prevZ = pos.z;
      const prevX = pos.x;
      const prevY = pos.y;

      // Yerçekimi
      vel.y -= GRAVITY * h;

      // Hava direnci
      const drag = Math.exp(-airDrag * h);
      vel.multiplyScalar(drag);

      // Rüzgar etkisi (havadayken belirgin)
      if (pos.y > BALL_RADIUS + 0.04) {
        vel.x += env.wind.x * 0.42 * h;
        vel.z += env.wind.z * 0.25 * h;
      }

      // Magnus / falso etkisi
      if (Math.abs(spin.y) > 0.01 && pos.y > BALL_RADIUS + 0.02) {
        const ax = MAGNUS_COEFF * spin.y * (-vel.z) * 0.088;
        vel.x += ax * h;
        spin.y *= Math.exp(-0.32 * h);
      }

      // Top Mıknatısı (homing): kale içi açık köşeye doğru yumuşak güdümlü kavis
      if (homingTarget && !state.inGoal && !state.saved && pos.z > 0.12 && vel.z < -1.0) {
        const tRem = Math.max(0.06, pos.z / (-vel.z));
        const desiredVx = (homingTarget.x - pos.x) / tRem;
        const desiredVy = (homingTarget.y - pos.y + 0.5 * GRAVITY * tRem * tRem) / tRem;
        const steer = Math.min(1, 9.5 * h);
        vel.x += (desiredVx - vel.x) * steer;
        vel.y += (desiredVy - vel.y) * steer;
      }

      // Konum güncelle
      pos.x += vel.x * h;
      pos.y += vel.y * h;
      pos.z += vel.z * h;

      // 0) Görünmez Kale Duvarı (brickWall) veya Tanrı Modu Kaleci (godSave) garantili kurtarış
      if (!state.saved && !state.inGoal && (brickWall || godSave)) {
        const zMin = -0.25;
        const zMax = brickWall ? 0.45 : 0.55;
        const inGoalOpening = Math.abs(pos.x) <= hw + 0.12 && pos.y <= gh + 0.12 && pos.y >= 0;
        if (pos.z <= zMax && pos.z >= zMin && inGoalOpening) {
          pos.z = zMax + 0.02;
          const spd = Math.max(8, vel.length());
          if (brickWall) {
            vel.set((pos.x >= 0 ? 1 : -1) * 2.5, Math.max(3.2, Math.abs(vel.y) * 0.5 + 2.2), Math.max(12, spd * 0.82));
            world?.spawnTurfSpray?.(pos.clone(), new THREE.Vector3(0, 2.5, 6));
          } else {
            const sideBias = (pos.x >= 0 ? 1 : -1) * 0.4;
            vel.set(sideBias * spd * 0.55, Math.max(2.6, spd * 0.3), Math.max(6.0, spd * 0.52));
          }
          spin.multiplyScalar(-0.4);
          state.saved = true;
          audio?.save?.();
          emit('save', { point: pos.clone(), speed: spd, brickWall });
        }
      }

      // 1) Kaleci kurtarışı (el/kol/gövde küreleri + Panenka/Merkez yakalama)
      if (!state.saved && !state.inGoal && keeper && keeperDiveInfo && keeperDiveInfo.dir === 'center') {
        const kx = keeper.group ? keeper.group.position.x : 0;
        const curSpeed = vel.length();
        if (
          pos.z <= 0.7 &&
          pos.z >= -0.15 &&
          Math.abs(pos.x - kx) < 1.35 &&
          pos.y <= 2.3 &&
          (keeperDiveInfo.height === 'high' || curSpeed < 18.5)
        ) {
          pos.z = 0.72;
          vel.set((pos.x - kx) * 2.2, Math.max(2.0, curSpeed * 0.28), Math.max(4.5, curSpeed * 0.42));
          spin.multiplyScalar(-0.3);
          state.saved = true;
          audio?.save?.();
          emit('save', { point: pos.clone(), speed: curSpeed, panenkaSave: true });
        }
      }

      if (colliders && !state.saved && !state.inGoal && pos.z > -0.35 && pos.z < 2.2) {
        for (let i = 0; i < colliders.length; i++) {
          const c = colliders[i];
          if (!c || !c.center) continue;
          const dx = pos.x - c.center.x;
          const dy = pos.y - c.center.y;
          const dz = pos.z - c.center.z;
          const minDist = BALL_RADIUS + (c.radius || 0.16) + keeperReachBoost;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.0001;
            tmpNormal.set(dx / dist, dy / dist, dz / dist);
            if (tmpNormal.z < 0.35) {
              tmpNormal.z = 0.55;
              tmpNormal.normalize();
            }
            pos.x = c.center.x + tmpNormal.x * (minDist + 0.01);
            pos.y = Math.max(BALL_RADIUS, c.center.y + tmpNormal.y * (minDist + 0.01));
            pos.z = c.center.z + tmpNormal.z * (minDist + 0.01);

            const speed = vel.length();
            const deflectSpeed = Math.max(5.5, speed * 0.48);
            const sideBias = (pos.x >= 0 ? 1 : -1) * 0.35;
            vel.set(
              (tmpNormal.x + sideBias) * deflectSpeed,
              Math.max(2.2, (tmpNormal.y + 0.35) * deflectSpeed * 0.65),
              Math.max(4.0, Math.abs(tmpNormal.z) * deflectSpeed * 0.85)
            );
            spin.multiplyScalar(-0.4);
            state.saved = true;
            audio?.save?.();
            emit('save', { point: pos.clone(), speed });
            break;
          }
        }
      }

      // 2) Direk / üst direk çarpışması
      if (Math.abs(pos.z) < 0.5 && Math.abs(pos.x) < hw + 0.45 && pos.y < gh + 0.45) {
        const hitR = BALL_RADIUS + pr;
        for (let i = 0; i < postSegments.length; i++) {
          const seg = postSegments[i];
          closestPointOnSegment(pos, seg.a, seg.b, tmpClosest);
          tmpNormal.subVectors(pos, tmpClosest);
          const d = tmpNormal.length();
          if (d < hitR) {
            if (d > 1e-5) tmpNormal.divideScalar(d);
            else tmpNormal.set(0, 0, 1);
            pos.copy(tmpClosest).addScaledVector(tmpNormal, hitR + 0.004);
            const vn = vel.dot(tmpNormal);
            if (vn < 0) {
              vel.addScaledVector(tmpNormal, -1.72 * vn);
              vel.multiplyScalar(0.82);
            }
            state.hitPost = true;
            if (state.postSoundCooldown <= 0) {
              state.postSoundCooldown = 0.14;
              audio?.postHit?.();
              emit('post', { part: seg.name, point: pos.clone() });
            }
          }
        }
      }

      // 3) Kale çizgisi (z = 0) kontrolü
      if (!state.inGoal && !state.saved && prevZ >= 0 && pos.z < 0) {
        const denom = prevZ - pos.z;
        const t = denom > 1e-6 ? prevZ / denom : 0;
        const x0 = prevX + (pos.x - prevX) * t;
        const y0 = prevY + (pos.y - prevY) * t;
        const insideX = Math.abs(x0) <= hw - pr * 0.6;
        const insideY = y0 <= gh - pr * 0.6 && y0 >= 0;
        if (insideX && insideY) {
          state.inGoal = true;
          const isTopCorner = Math.abs(x0) > hw - 1.15 && y0 > gh - 0.85;
          emit('goal', { x: x0, y: y0, hitPost: state.hitPost, isTopCorner });
        } else if (!state.crossedOut) {
          state.crossedOut = true;
          emit('out', { x: x0, y: y0, hitPost: state.hitPost });
        }
      }

      // 4) Kale ağı
      if (state.inGoal && pos.z < -0.02) {
        let touchedNet = false;
        const preVel = vel.clone();

        if (pos.z < -(NET_DEPTH - BALL_RADIUS)) {
          pos.z = -(NET_DEPTH - BALL_RADIUS);
          vel.z = Math.abs(vel.z) * 0.12;
          vel.x *= 0.25;
          vel.y *= 0.3;
          touchedNet = true;
        }
        if (pos.x < -(hw - BALL_RADIUS)) {
          pos.x = -(hw - BALL_RADIUS);
          vel.x = Math.abs(vel.x) * 0.18;
          vel.z *= 0.35;
          touchedNet = true;
        } else if (pos.x > hw - BALL_RADIUS) {
          pos.x = hw - BALL_RADIUS;
          vel.x = -Math.abs(vel.x) * 0.18;
          vel.z *= 0.35;
          touchedNet = true;
        }
        if (pos.y > gh - BALL_RADIUS) {
          pos.y = gh - BALL_RADIUS;
          vel.y = -Math.abs(vel.y) * 0.18;
          vel.z *= 0.4;
          touchedNet = true;
        }

        if (touchedNet) {
          state.hitNet = true;
          world?.netImpact?.(pos.clone(), preVel);
          if (state.netSoundCooldown <= 0) {
            state.netSoundCooldown = 0.2;
            audio?.netHit?.();
          }
        }
      }

      // 5) Zemin sekmesi
      if (pos.y < BALL_RADIUS) {
        pos.y = BALL_RADIUS;
        if (vel.y < -0.6) {
          vel.y = -vel.y * bounceRestitution;
          const slip = env.weather === 'rain' ? 0.94 : 0.82;
          vel.x *= slip;
          vel.z *= slip;
        } else {
          vel.y = 0;
          const fric = Math.exp(-groundFriction * h);
          vel.x *= fric;
          vel.z *= fric;
        }
      }
    }

    // Görsel dönüş
    const speed = vel.length();
    if (speed > 0.05) {
      tmpAxis.set(vel.z, 0, -vel.x);
      if (tmpAxis.lengthSq() > 1e-6) {
        tmpAxis.normalize();
        tmpQuat.setFromAxisAngle(tmpAxis, (speed / BALL_RADIUS) * dt * 0.85);
        mesh.quaternion.premultiply(tmpQuat);
      }
      if (Math.abs(spin.y) > 0.05) {
        tmpAxis.set(0, 1, 0);
        tmpQuat.setFromAxisAngle(tmpAxis, spin.y * dt);
        mesh.quaternion.premultiply(tmpQuat);
      }
    }

    // Hız izi örnekleme
    trailSampleAccum += dt;
    if (trailSampleAccum >= 0.012 && speed > 4.5 && !state.settled) {
      trailSampleAccum = 0;
      pushTrailPoint(pos);
    }

    const outOfArena = pos.z < -8 || pos.z > 24 || Math.abs(pos.x) > 16 || pos.y > 12;
    if ((state.flightTime > 0.7 && speed < 0.35 && pos.y <= BALL_RADIUS + 0.05) || outOfArena) {
      state.settled = true;
    }

    syncMesh();
    return state;
  }

  reset({ x: 0, z: 11 });

  return {
    mesh,
    position: pos,
    velocity: vel,
    state,
    radius: BALL_RADIUS,
    setSkin,
    setEnvironment,
    setTrailColor,
    setReplayPose,
    clearTrail,
    predictTrajectory,
    reset,
    kick,
    step,
  };
}
