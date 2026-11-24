import * as THREE from 'three';

const GOAL = Object.freeze({
  halfWidth: 3.66,
  height: 2.44,
  postRadius: 0.06,
});

const NET_DEPTH_TOP = 1.65;
const NET_DEPTH_BOTTOM = 2.15;

function createGrassTextures() {
  const size = 1024;

  // Color map: mowed stripes + cross-cut + turf grain
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  const stripeCount = 16;
  const stripeH = size / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f853a' : '#267231';
    ctx.fillRect(0, i * stripeH, size, stripeH + 1);
  }

  // Subtle cross-cut mow pattern
  ctx.globalAlpha = 0.055;
  const vStripes = 12;
  const vW = size / vStripes;
  for (let i = 0; i < vStripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(i * vW, 0, vW, size);
  }
  ctx.globalAlpha = 1.0;

  // Roughness & bump canvases
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#d4d4d4';
  rCtx.fillRect(0, 0, 512, 512);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  // Fine turf blade noise on color, roughness, and bump
  for (let i = 0; i < 36000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const bright = Math.random() > 0.48;
    ctx.fillStyle = bright ? 'rgba(145, 224, 102, 0.09)' : 'rgba(10, 48, 15, 0.1)';
    ctx.fillRect(x, y, 2, 3);
  }

  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 165 + Math.floor(Math.random() * 80);
    rCtx.fillStyle = `rgb(${v},${v},${v})`;
    rCtx.fillRect(x, y, 2, 2);

    const bv = 75 + Math.floor(Math.random() * 140);
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(x, y, 1.5, 2.5);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(6, 6);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(8, 8);

  return { map, roughnessMap, bumpMap };
}

function createAdBoardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  const panels = [
    { bg: '#082040', accent: '#fbbf24', glow: 'rgba(251,191,36,0.3)', text: 'SÜPER PENALTI' },
    { bg: '#a61220', accent: '#ffffff', glow: 'rgba(255,255,255,0.25)', text: 'STADYUM ARENA' },
    { bg: '#064e3b', accent: '#34d399', glow: 'rgba(52,211,153,0.28)', text: 'CANLI YAYIN • 4K' },
    { bg: '#111834', accent: '#38bdf8', glow: 'rgba(56,189,248,0.32)', text: 'ŞAMPİYONLAR KUPASI' },
  ];

  const panelW = canvas.width / panels.length;
  panels.forEach((p, idx) => {
    const x = idx * panelW;
    const grad = ctx.createLinearGradient(x, 0, x + panelW, canvas.height);
    grad.addColorStop(0, p.bg);
    grad.addColorStop(0.5, '#122645');
    grad.addColorStop(1, p.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, panelW, canvas.height);

    // Bright LED top/bottom strips
    ctx.fillStyle = p.accent;
    ctx.fillRect(x, 0, panelW, 12);
    ctx.fillRect(x, canvas.height - 12, panelW, 12);

    // Diagonal light sweep
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.moveTo(x + 30, 0);
    ctx.lineTo(x + 110, 0);
    ctx.lineTo(x + 65, canvas.height);
    ctx.lineTo(x - 15, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 14;
    ctx.font = 'bold 50px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x + panelW / 2, canvas.height / 2 + 2);
    ctx.shadowBlur = 0;
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createSkyTexture(timeOfDay) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (timeOfDay === 'day') {
    grad.addColorStop(0.0, '#1e5aa8');
    grad.addColorStop(0.32, '#4c94e0');
    grad.addColorStop(0.58, '#8ec6f8');
    grad.addColorStop(0.74, '#cbe6ff');
    grad.addColorStop(1.0, '#88a8c4');
  } else if (timeOfDay === 'sunset') {
    grad.addColorStop(0.0, '#141938');
    grad.addColorStop(0.28, '#3b2554');
    grad.addColorStop(0.48, '#8d3b5c');
    grad.addColorStop(0.64, '#e06c3e');
    grad.addColorStop(0.74, '#f7b267');
    grad.addColorStop(1.0, '#2a1d28');
  } else {
    grad.addColorStop(0.0, '#040814');
    grad.addColorStop(0.32, '#0a1630');
    grad.addColorStop(0.54, '#152b52');
    grad.addColorStop(0.68, '#28456b');
    grad.addColorStop(0.76, '#3a4966');
    grad.addColorStop(1.0, '#0a1220');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (timeOfDay === 'night') {
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.46;
      const a = 0.22 + Math.random() * 0.65;
      const r = Math.random() > 0.85 ? 1.5 : 0.9;
      ctx.fillStyle = `rgba(220, 235, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (timeOfDay === 'day') {
    // Soft cumulus clouds
    for (let i = 0; i < 28; i++) {
      const cx = Math.random() * canvas.width;
      const cy = 90 + Math.random() * 190;
      const rx = 28 + Math.random() * 55;
      const ry = 10 + Math.random() * 18;
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      cg.addColorStop(0, 'rgba(255,255,255,0.42)');
      cg.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (timeOfDay === 'sunset') {
    // Glowing low sun disc
    const sg = ctx.createRadialGradient(340, 325, 6, 340, 325, 90);
    sg.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
    sg.addColorStop(0.3, 'rgba(255, 175, 95, 0.5)');
    sg.addColorStop(1, 'rgba(255, 110, 60, 0.0)');
    ctx.fillStyle = sg;
    ctx.fillRect(240, 225, 200, 200);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createScoreboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1024, 256);
  grad.addColorStop(0, '#071426');
  grad.addColorStop(0.5, '#112e57');
  grad.addColorStop(1, '#071426');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 1004, 236);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 74px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PENALTI ARENA', 512, 102);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('FİNAL STADYUMU • CANLI', 512, 184);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 252, 235, 1.0)');
  grad.addColorStop(0.25, 'rgba(220, 238, 255, 0.55)');
  grad.addColorStop(0.6, 'rgba(150, 200, 255, 0.14)');
  grad.addColorStop(1, 'rgba(150, 200, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPitchMarkings() {
  const group = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf6f9fc });
  const y = 0.008;
  const lw = 0.12;

  function addLine(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const geo = new THREE.PlaneGeometry(len + lw, lw);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, lineMat);
    mesh.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    group.add(mesh);
  }

  addLine(-34, 0, 34, 0);
  addLine(-34, 0, -34, 62);
  addLine(34, 0, 34, 62);
  addLine(-34, 52.5, 34, 52.5);

  // 6-yard box
  addLine(-9.16, 0, -9.16, 5.5);
  addLine(9.16, 0, 9.16, 5.5);
  addLine(-9.16, 5.5, 9.16, 5.5);

  // 18-yard box
  addLine(-20.16, 0, -20.16, 16.5);
  addLine(20.16, 0, 20.16, 16.5);
  addLine(-20.16, 16.5, 20.16, 16.5);

  // Penalty spot
  const spotGeo = new THREE.CircleGeometry(0.14, 24);
  spotGeo.rotateX(-Math.PI / 2);
  const spot = new THREE.Mesh(spotGeo, lineMat);
  spot.position.set(0, y + 0.002, 11);
  group.add(spot);

  // Penalty arc ("D")
  const arcRadius = 9.15;
  const halfAngle = Math.acos((16.5 - 11) / arcRadius);
  const arcGeo = new THREE.RingGeometry(
    arcRadius - lw / 2,
    arcRadius + lw / 2,
    40,
    1,
    Math.PI / 2 - halfAngle,
    halfAngle * 2
  );
  arcGeo.rotateX(Math.PI / 2);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xf6f9fc, side: THREE.DoubleSide });
  const arcMesh = new THREE.Mesh(arcGeo, arcMat);
  arcMesh.position.set(0, y, 11);
  group.add(arcMesh);

  // Center circle
  const centerCircleGeo = new THREE.RingGeometry(9.15 - lw / 2, 9.15 + lw / 2, 64);
  centerCircleGeo.rotateX(-Math.PI / 2);
  const centerCircle = new THREE.Mesh(centerCircleGeo, lineMat);
  centerCircle.position.set(0, y, 52.5);
  group.add(centerCircle);

  // Corner arcs
  const cornerGeoL = new THREE.RingGeometry(1.0 - lw / 2, 1.0 + lw / 2, 16, 1, 0, Math.PI / 2);
  cornerGeoL.rotateX(Math.PI / 2);
  const cornerL = new THREE.Mesh(cornerGeoL, arcMat);
  cornerL.position.set(-34, y, 0);
  group.add(cornerL);

  const cornerGeoR = new THREE.RingGeometry(1.0 - lw / 2, 1.0 + lw / 2, 16, 1, Math.PI / 2, Math.PI / 2);
  cornerGeoR.rotateX(Math.PI / 2);
  const cornerR = new THREE.Mesh(cornerGeoR, arcMat);
  cornerR.position.set(34, y, 0);
  group.add(cornerR);

  return group;
}

function buildDeformableNet() {
  const hw = GOAL.halfWidth;
  const h = GOAL.height;
  const nx = 30;
  const ny = 12;
  const nz = 9;

  const positions = [];
  const restPositions = [];
  const velocities = [];
  const pinned = [];
  const neighbors = [];
  const lineIndices = [];

  function addNode(x, y, z, isPinned) {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    restPositions.push(x, y, z);
    velocities.push(0, 0, 0);
    pinned.push(isPinned);
    neighbors.push([]);
    return idx;
  }

  function link(a, b) {
    lineIndices.push(a, b);
    neighbors[a].push(b);
    neighbors[b].push(a);
  }

  function depthAtY(yNorm) {
    return -(NET_DEPTH_BOTTOM + (NET_DEPTH_TOP - NET_DEPTH_BOTTOM) * yNorm);
  }

  // Back panel
  const backGrid = [];
  for (let iy = 0; iy <= ny; iy++) {
    const row = [];
    const yNorm = iy / ny;
    const y = yNorm * h;
    const z = depthAtY(yNorm);
    for (let ix = 0; ix <= nx; ix++) {
      const x = -hw + (ix / nx) * (hw * 2);
      const isPin = iy === 0 || (iy === ny && (ix === 0 || ix === nx));
      row.push(addNode(x, y, z, isPin));
    }
    backGrid.push(row);
  }
  for (let iy = 0; iy <= ny; iy++) {
    for (let ix = 0; ix <= nx; ix++) {
      if (ix < nx) link(backGrid[iy][ix], backGrid[iy][ix + 1]);
      if (iy < ny) link(backGrid[iy][ix], backGrid[iy + 1][ix]);
    }
  }

  // Top panel
  const topGrid = [];
  for (let iz = 0; iz <= nz; iz++) {
    const row = [];
    if (iz === nz) {
      for (let ix = 0; ix <= nx; ix++) row.push(backGrid[ny][ix]);
    } else {
      const z = -(iz / nz) * NET_DEPTH_TOP;
      for (let ix = 0; ix <= nx; ix++) {
        const x = -hw + (ix / nx) * (hw * 2);
        row.push(addNode(x, h, z, iz === 0));
      }
    }
    topGrid.push(row);
  }
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) {
      if (ix < nx && iz < nz) link(topGrid[iz][ix], topGrid[iz][ix + 1]);
      if (iz < nz) link(topGrid[iz][ix], topGrid[iz + 1][ix]);
    }
  }

  // Side panels
  for (const side of [-1, 1]) {
    const x = side * hw;
    const backColIdx = side === -1 ? 0 : nx;
    const sideGrid = [];

    for (let iy = 0; iy <= ny; iy++) {
      const row = [];
      const yNorm = iy / ny;
      const y = yNorm * h;
      const maxDepth = -depthAtY(yNorm);

      for (let iz = 0; iz <= nz; iz++) {
        if (iz === nz) {
          row.push(backGrid[iy][backColIdx]);
        } else if (iy === ny) {
          row.push(topGrid[iz][backColIdx]);
        } else {
          const z = -(iz / nz) * maxDepth;
          row.push(addNode(x, y, z, iz === 0 || iy === 0));
        }
      }
      sideGrid.push(row);
    }

    for (let iy = 0; iy <= ny; iy++) {
      for (let iz = 0; iz <= nz; iz++) {
        if (iz < nz && iy < ny) link(sideGrid[iy][iz], sideGrid[iy][iz + 1]);
        if (iy < ny && iz < nz) link(sideGrid[iy][iz], sideGrid[iy + 1][iz]);
      }
    }
  }

  const posArray = new Float32Array(positions);
  const restArray = new Float32Array(restPositions);
  const velArray = new Float32Array(velocities);

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(posArray, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setIndex(lineIndices);

  const mat = new THREE.LineBasicMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.8,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;

  const nodeCount = posArray.length / 3;
  let activeEnergy = 0;
  let windTime = 0;

  function impact(point, velocity) {
    if (!point) return;
    const vx = velocity ? velocity.x : 0;
    const vy = velocity ? velocity.y : 0;
    const vz = velocity ? velocity.z : -10;
    const speed = Math.hypot(vx, vy, vz);
    const scale = Math.min(1.65, Math.max(0.45, speed * 0.085));
    const dirX = speed > 0.2 ? vx / speed : 0;
    const dirY = speed > 0.2 ? vy / speed : 0.15;
    const dirZ = speed > 0.2 ? vz / speed : -1;

    const radiusSq = 2.6 * 2.6;
    for (let i = 0; i < nodeCount; i++) {
      if (pinned[i]) continue;
      const i3 = i * 3;
      const dx = posArray[i3] - point.x;
      const dy = posArray[i3 + 1] - point.y;
      const dz = posArray[i3 + 2] - point.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > radiusSq) continue;

      const w = Math.exp(-d2 / 0.85);
      const impulse = 8.8 * scale * w;
      velArray[i3] += dirX * impulse + dx * 0.8 * w;
      velArray[i3 + 1] += dirY * impulse + dy * 0.5 * w;
      velArray[i3 + 2] += dirZ * impulse - 2.3 * scale * w;
    }
    activeEnergy = 1.0;
  }

  function update(dt, windVec) {
    const step = Math.min(dt, 0.033);
    windTime += step;
    const windMag = windVec ? Math.hypot(windVec.x, windVec.z) : 0;

    if (activeEnergy < 0.001) {
      const swayAmp = 0.014 + Math.min(0.04, windMag * 0.005);
      const windPushX = windVec ? windVec.x * 0.006 : 0;
      for (let i = 0; i < nodeCount; i++) {
        if (pinned[i]) continue;
        const i3 = i * 3;
        const rx = restArray[i3];
        const ry = restArray[i3 + 1];
        const rz = restArray[i3 + 2];
        const hFactor = ry / h;
        const sway = Math.sin(windTime * (1.8 + windMag * 0.3) + rx * 0.7 + ry * 0.9) * swayAmp * hFactor;
        posArray[i3] = rx + windPushX * hFactor;
        posArray[i3 + 1] = ry;
        posArray[i3 + 2] = rz + sway;
      }
      posAttr.needsUpdate = true;
      return;
    }

    const stiffness = 34.0;
    const neighborK = 16.0;
    const damping = Math.exp(-4.6 * step);
    let maxDisp = 0;

    for (let i = 0; i < nodeCount; i++) {
      if (pinned[i]) continue;
      const i3 = i * 3;
      const x = posArray[i3];
      const y = posArray[i3 + 1];
      const z = posArray[i3 + 2];

      let fx = (restArray[i3] - x) * stiffness;
      let fy = (restArray[i3 + 1] - y) * stiffness;
      let fz = (restArray[i3 + 2] - z) * stiffness;

      const nbs = neighbors[i];
      if (nbs.length > 0) {
        let ax = 0, ay = 0, az = 0;
        for (let k = 0; k < nbs.length; k++) {
          const n3 = nbs[k] * 3;
          ax += (posArray[n3] - restArray[n3]) - (x - restArray[i3]);
          ay += (posArray[n3 + 1] - restArray[n3 + 1]) - (y - restArray[i3 + 1]);
          az += (posArray[n3 + 2] - restArray[n3 + 2]) - (z - restArray[i3 + 2]);
        }
        const inv = neighborK / nbs.length;
        fx += ax * inv;
        fy += ay * inv;
        fz += az * inv;
      }

      velArray[i3] = (velArray[i3] + fx * step) * damping;
      velArray[i3 + 1] = (velArray[i3 + 1] + fy * step) * damping;
      velArray[i3 + 2] = (velArray[i3 + 2] + fz * step) * damping;
    }

    for (let i = 0; i < nodeCount; i++) {
      if (pinned[i]) continue;
      const i3 = i * 3;
      posArray[i3] += velArray[i3] * step;
      posArray[i3 + 1] = Math.max(0.02, posArray[i3 + 1] + velArray[i3 + 1] * step);
      posArray[i3 + 2] += velArray[i3 + 2] * step;

      const dx = posArray[i3] - restArray[i3];
      const dy = posArray[i3 + 1] - restArray[i3 + 1];
      const dz = posArray[i3 + 2] - restArray[i3 + 2];
      const d = Math.hypot(dx, dy, dz);
      if (d > 1.15) {
        const s = 1.15 / d;
        posArray[i3] = restArray[i3] + dx * s;
        posArray[i3 + 1] = restArray[i3 + 1] + dy * s;
        posArray[i3 + 2] = restArray[i3 + 2] + dz * s;
      }
      if (d > maxDisp) maxDisp = d;
    }

    if (maxDisp < 0.004) {
      activeEnergy *= 0.85;
    }
    posAttr.needsUpdate = true;
  }

  return { mesh, impact, update };
}

function buildGoal() {
  const group = new THREE.Group();
  const hw = GOAL.halfWidth;
  const h = GOAL.height;
  const r = GOAL.postRadius;

  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.3,
  });

  const postGeo = new THREE.CylinderGeometry(r, r, h, 18);
  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-hw, h / 2, 0);
  leftPost.castShadow = true;
  leftPost.receiveShadow = true;
  group.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(hw, h / 2, 0);
  rightPost.castShadow = true;
  rightPost.receiveShadow = true;
  group.add(rightPost);

  const barGeo = new THREE.CylinderGeometry(r, r, hw * 2, 18);
  barGeo.rotateZ(Math.PI / 2);
  const crossbar = new THREE.Mesh(barGeo, postMat);
  crossbar.position.set(0, h, 0);
  crossbar.castShadow = true;
  crossbar.receiveShadow = true;
  group.add(crossbar);

  // Corner joints + base collars
  const jointGeo = new THREE.SphereGeometry(r * 1.04, 14, 14);
  const collarGeo = new THREE.CylinderGeometry(r * 1.35, r * 1.45, 0.08, 14);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x243040, roughness: 0.5, metalness: 0.6 });
  for (const sx of [-1, 1]) {
    const joint = new THREE.Mesh(jointGeo, postMat);
    joint.position.set(sx * hw, h, 0);
    group.add(joint);

    const collar = new THREE.Mesh(collarGeo, darkMat);
    collar.position.set(sx * hw, 0.04, 0);
    group.add(collar);
  }

  // Rear stanchions, tension poles & ground frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ec,
    roughness: 0.35,
    metalness: 0.55,
  });
  const sr = 0.032;
  const groundBackGeo = new THREE.CylinderGeometry(sr, sr, hw * 2, 10);
  groundBackGeo.rotateZ(Math.PI / 2);
  const groundBack = new THREE.Mesh(groundBackGeo, frameMat);
  groundBack.position.set(0, sr, -NET_DEPTH_BOTTOM);
  group.add(groundBack);

  const sideGroundGeo = new THREE.CylinderGeometry(sr, sr, NET_DEPTH_BOTTOM, 10);
  sideGroundGeo.rotateX(Math.PI / 2);
  const topDepthGeo = new THREE.CylinderGeometry(sr, sr, NET_DEPTH_TOP, 10);
  topDepthGeo.rotateX(Math.PI / 2);

  const slopeDx = NET_DEPTH_BOTTOM - NET_DEPTH_TOP;
  const slopeLen = Math.hypot(slopeDx, h);
  const slopeAngle = Math.atan2(slopeDx, h);
  const backStrutGeo = new THREE.CylinderGeometry(sr, sr, slopeLen, 10);

  // External rear tension stanchion poles (modern stadium style)
  const tensionPoleGeo = new THREE.CylinderGeometry(0.04, 0.045, h + 0.55, 10);

  for (const sx of [-1, 1]) {
    const x = sx * hw;
    const sg = new THREE.Mesh(sideGroundGeo, frameMat);
    sg.position.set(x, sr, -NET_DEPTH_BOTTOM / 2);
    group.add(sg);

    const td = new THREE.Mesh(topDepthGeo, frameMat);
    td.position.set(x, h, -NET_DEPTH_TOP / 2);
    group.add(td);

    const bs = new THREE.Mesh(backStrutGeo, frameMat);
    bs.position.set(x, h / 2, -(NET_DEPTH_TOP + NET_DEPTH_BOTTOM) / 2);
    bs.rotation.x = -slopeAngle;
    group.add(bs);

    const tp = new THREE.Mesh(tensionPoleGeo, darkMat);
    tp.position.set(x + sx * 0.42, (h + 0.55) / 2, -NET_DEPTH_BOTTOM - 0.35);
    group.add(tp);
  }

  const net = buildDeformableNet();
  group.add(net.mesh);

  return { group, net };
}

function buildStadiumAndCrowd() {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x333c4a, roughness: 0.88, metalness: 0.06 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.55, metalness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x263245, roughness: 0.68, metalness: 0.38, side: THREE.DoubleSide });
  const accentWallMat = new THREE.MeshStandardMaterial({ color: 0x162b4a, roughness: 0.72 });

  const stands = [
    { cx: 0, cz: -18, width: 82, depth: 16, rotY: 0, tiers: 12 },
    { cx: 48, cz: 26, width: 84, depth: 16, rotY: -Math.PI / 2, tiers: 11 },
    { cx: -48, cz: 26, width: 84, depth: 16, rotY: Math.PI / 2, tiers: 11 },
    { cx: 0, cz: 76, width: 82, depth: 14, rotY: Math.PI, tiers: 10 },
  ];

  const spectators = [];
  const trussTransforms = [];
  const palette = [
    0xe63946, 0xf1faee, 0x1d3557, 0xfbbf24, 0x2a9d8f,
    0x3b82f6, 0xef4444, 0xe2e8f0, 0x1e293b, 0xf97316,
    0x10b981, 0xa855f7,
  ];

  for (const s of stands) {
    const standGroup = new THREE.Group();
    standGroup.position.set(s.cx, 0, s.cz);
    standGroup.rotation.y = s.rotY;

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(s.width, 1.8, 0.8), accentWallMat);
    frontWall.position.set(0, 0.9, s.depth / 2);
    standGroup.add(frontWall);

    const stepH = 0.85;
    const stepD = s.depth / s.tiers;
    for (let t = 0; t < s.tiers; t++) {
      const y = 1.6 + t * stepH;
      const z = s.depth / 2 - stepD * (t + 0.5);
      const step = new THREE.Mesh(new THREE.BoxGeometry(s.width, stepH, stepD + 0.1), concreteMat);
      step.position.set(0, y - stepH / 2, z);
      step.receiveShadow = true;
      standGroup.add(step);

      const cols = Math.floor((s.width - 3) / 1.45);
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.76) continue;
        const lx = -((cols - 1) * 1.45) / 2 + c * 1.45 + (Math.random() - 0.5) * 0.35;
        const ly = y + 0.02;
        const lz = z + (Math.random() - 0.5) * 0.2;

        const cosR = Math.cos(s.rotY);
        const sinR = Math.sin(s.rotY);
        const wx = s.cx + lx * cosR + lz * sinR;
        const wz = s.cz - lx * sinR + lz * cosR;

        spectators.push({
          x: wx,
          y: ly,
          z: wz,
          rotY: s.rotY + (Math.random() - 0.5) * 0.25,
          phase: Math.random() * Math.PI * 2,
          freq: 5.5 + Math.random() * 3.5,
          scale: 0.88 + Math.random() * 0.24,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
    }

    const totalH = 1.8 + s.tiers * stepH + 3.2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(s.width, totalH, 0.8), darkMetalMat);
    backWall.position.set(0, totalH / 2, -s.depth / 2 - 0.4);
    standGroup.add(backWall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(s.width + 2, 0.5, s.depth + 4.5), roofMat);
    roof.position.set(0, totalH + 0.2, 1.2);
    roof.rotation.x = 0.08;
    standGroup.add(roof);

    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(s.width + 2, 0.48, 0.36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    fascia.position.set(0, totalH - 0.58, s.depth / 2 + 3.0);
    standGroup.add(fascia);

    // Collect roof truss beam transforms (instanced later: 1 draw call total)
    const trussCount = 7;
    const cosR = Math.cos(s.rotY);
    const sinR = Math.sin(s.rotY);
    for (let k = 0; k < trussCount; k++) {
      const lx = -s.width * 0.46 + (k / (trussCount - 1)) * (s.width * 0.92);
      const lz = 0.8;
      trussTransforms.push({
        x: s.cx + lx * cosR + lz * sinR,
        y: totalH - 0.35,
        z: s.cz - lx * sinR + lz * cosR,
        rotY: s.rotY,
        len: s.depth + 4.0,
      });
    }

    group.add(standGroup);
  }

  // Instanced roof trusses (1 draw call)
  const trussGeo = new THREE.BoxGeometry(0.42, 0.65, 1);
  const trussMesh = new THREE.InstancedMesh(trussGeo, darkMetalMat, trussTransforms.length);
  const trussDummy = new THREE.Object3D();
  trussTransforms.forEach((tr, idx) => {
    trussDummy.position.set(tr.x, tr.y, tr.z);
    trussDummy.rotation.set(0.08, tr.rotY, 0);
    trussDummy.scale.set(1, 1, tr.len);
    trussDummy.updateMatrix();
    trussMesh.setMatrixAt(idx, trussDummy.matrix);
  });
  trussMesh.instanceMatrix.needsUpdate = true;
  group.add(trussMesh);

  // Scoreboard above North stand
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(18.6, 5.0, 0.7), darkMetalMat);
  boardFrame.position.set(0, 17.8, -19.5);
  group.add(boardFrame);

  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.4),
    new THREE.MeshBasicMaterial({ map: createScoreboardTexture() })
  );
  boardFace.position.set(0, 17.8, -19.12);
  group.add(boardFace);

  // Instanced Crowd (2 draw calls: bodies + heads)
  const count = spectators.length;
  const bodyGeo = new THREE.BoxGeometry(0.46, 0.62, 0.28);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, count);

  const headGeo = new THREE.SphereGeometry(0.16, 7, 6);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xf1c29b });
  const headMesh = new THREE.InstancedMesh(headGeo, headMat, count);

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  const skinTones = [0xf6d0b1, 0xe5b18a, 0xc98b63, 0x8d5524, 0xf2c29b];

  for (let i = 0; i < count; i++) {
    const sp = spectators[i];
    tmpColor.setHex(sp.color);
    bodyMesh.setColorAt(i, tmpColor);
    tmpColor.setHex(skinTones[i % skinTones.length]);
    headMesh.setColorAt(i, tmpColor);

    dummy.position.set(sp.x, sp.y + 0.35 * sp.scale, sp.z);
    dummy.rotation.set(0, sp.rotY, 0);
    dummy.scale.setScalar(sp.scale);
    dummy.updateMatrix();
    bodyMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sp.x, sp.y + 0.80 * sp.scale, sp.z);
    dummy.updateMatrix();
    headMesh.setMatrixAt(i, dummy.matrix);
  }
  bodyMesh.instanceMatrix.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;
  if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;

  group.add(bodyMesh);
  group.add(headMesh);

  let crowdTime = 0;
  let currentExcitement = 0.15;
  let targetExcitement = 0.15;

  function setExcitement(v) {
    targetExcitement = Math.max(0, Math.min(1, Number(v) || 0));
  }

  function updateCrowd(dt) {
    const step = Math.min(dt, 0.05);
    crowdTime += step;
    currentExcitement += (targetExcitement - currentExcitement) * Math.min(1, step * 4.5);

    const amp = 0.035 + currentExcitement * 0.42;
    const speedMul = 0.45 + currentExcitement * 1.35;

    for (let i = 0; i < count; i++) {
      const sp = spectators[i];
      const wave = Math.sin(crowdTime * sp.freq * speedMul + sp.phase);
      const jump = currentExcitement > 0.35
        ? Math.max(0, wave) * amp
        : (wave * 0.5 + 0.5) * amp;

      const s = sp.scale;
      dummy.rotation.set(0, sp.rotY, wave * 0.07 * currentExcitement);
      dummy.scale.setScalar(s);

      dummy.position.set(sp.x, sp.y + 0.35 * s + jump, sp.z);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(sp.x, sp.y + 0.80 * s + jump, sp.z);
      dummy.updateMatrix();
      headMesh.setMatrixAt(i, dummy.matrix);
    }

    bodyMesh.instanceMatrix.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;
  }

  return { group, setExcitement, updateCrowd };
}

function buildFloodlights() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b4657, roughness: 0.5, metalness: 0.7 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbe8 });
  const glowMat = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xeef6ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xdbeeff,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const positions = [
    { x: -45, z: -15 },
    { x: 45, z: -15 },
    { x: -45, z: 66 },
    { x: 45, z: 66 },
  ];

  const poleGeo = new THREE.CylinderGeometry(0.45, 0.9, 34, 8);
  const headGeo = new THREE.BoxGeometry(6.4, 3.2, 0.9);
  const panelGeo = new THREE.PlaneGeometry(5.8, 2.6);
  const coneGeo = new THREE.ConeGeometry(14, 48, 16, 1, true);
  // Shift cone so tip is at origin and extends along +Z when rotated
  coneGeo.translate(0, -24, 0);
  coneGeo.rotateX(-Math.PI / 2);

  const cones = [];
  const glows = [];

  for (const p of positions) {
    const tower = new THREE.Group();
    tower.position.set(p.x, 0, p.z);

    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 17;
    tower.add(pole);

    const head = new THREE.Group();
    head.position.set(0, 34.2, 0);
    head.lookAt(0, 1, 11);

    const housing = new THREE.Mesh(headGeo, poleMat);
    head.add(housing);

    const face = new THREE.Mesh(panelGeo, bulbMat);
    face.position.z = 0.48;
    head.add(face);

    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(17, 17, 1);
    glow.position.z = 1.2;
    head.add(glow);
    glows.push(glow);

    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.z = 0.6;
    head.add(cone);
    cones.push(cone);

    tower.add(head);
    group.add(tower);
  }

  return { group, bulbMat, glowMat, coneMat, cones, glows };
}

function buildAdBoards() {
  const group = new THREE.Group();
  const adTex = createAdBoardTexture();
  const matFront = new THREE.MeshBasicMaterial({ map: adTex });
  const matBack = new THREE.MeshStandardMaterial({ color: 0x161d29, roughness: 0.8 });

  const backGeo = new THREE.BoxGeometry(68, 1.1, 0.25);
  const backBoard = new THREE.Mesh(backGeo, [matBack, matBack, matBack, matBack, matFront, matBack]);
  backBoard.position.set(0, 0.55, -6.8);
  group.add(backBoard);

  const sideTex = adTex.clone();
  sideTex.needsUpdate = true;
  sideTex.repeat.set(1.2, 1);
  const sideFront = new THREE.MeshBasicMaterial({ map: sideTex });
  const sideGeo = new THREE.BoxGeometry(66, 1.1, 0.25);

  const leftBoard = new THREE.Mesh(sideGeo, [matBack, matBack, matBack, matBack, sideFront, matBack]);
  leftBoard.position.set(-37.2, 0.55, 26);
  leftBoard.rotation.y = Math.PI / 2;
  group.add(leftBoard);

  const rightBoard = new THREE.Mesh(sideGeo, [matBack, matBack, matBack, matBack, sideFront, matBack]);
  rightBoard.position.set(37.2, 0.55, 26);
  rightBoard.rotation.y = -Math.PI / 2;
  group.add(rightBoard);

  return { group, adTex, sideTex };
}

function buildCornerFlags() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xffd000,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });

  const flags = [];
  for (const sx of [-1, 1]) {
    const holder = new THREE.Group();
    holder.position.set(sx * 34, 0, 0);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 8), poleMat);
    pole.position.y = 0.775;
    holder.add(pole);

    const pivot = new THREE.Group();
    pivot.position.set(0, 1.36, 0);
    const clothGeo = new THREE.PlaneGeometry(0.52, 0.34, 6, 2);
    // Anchor left edge of cloth at pole (x=0)
    clothGeo.translate(0.26, 0, 0);
    const cloth = new THREE.Mesh(clothGeo, flagMat);
    pivot.add(cloth);
    holder.add(pivot);

    group.add(holder);
    flags.push({ pivot, clothGeo, basePos: new Float32Array(clothGeo.attributes.position.array) });
  }

  return { group, flags };
}

function buildWeatherSystems() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  // Rain streaks (instanced)
  const rainCount = 680;
  const rainGeo = new THREE.BoxGeometry(0.022, 0.75, 0.022);
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xcbe3ff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
  rainMesh.visible = false;
  rainMesh.frustumCulled = false;
  const rainData = [];
  for (let i = 0; i < rainCount; i++) {
    rainData.push({
      x: (Math.random() - 0.5) * 54,
      y: Math.random() * 24,
      z: -10 + Math.random() * 40,
      speed: 20 + Math.random() * 8,
    });
  }
  group.add(rainMesh);

  // Snowflakes (instanced)
  const snowCount = 520;
  const snowGeo = new THREE.OctahedronGeometry(0.055, 0);
  const snowMat = new THREE.MeshBasicMaterial({
    color: 0xf8fbff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const snowMesh = new THREE.InstancedMesh(snowGeo, snowMat, snowCount);
  snowMesh.visible = false;
  snowMesh.frustumCulled = false;
  const snowData = [];
  for (let i = 0; i < snowCount; i++) {
    snowData.push({
      x: (Math.random() - 0.5) * 54,
      y: Math.random() * 22,
      z: -10 + Math.random() * 40,
      speed: 2.0 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.75,
    });
  }
  group.add(snowMesh);

  let weather = 'clear';
  let t = 0;

  function setWeather(w) {
    weather = w;
    rainMesh.visible = weather === 'rain';
    snowMesh.visible = weather === 'snow';
  }

  function update(dt, windVec) {
    if (weather === 'clear') return;
    const step = Math.min(dt, 0.05);
    t += step;
    const wx = windVec ? windVec.x : 0;
    const wz = windVec ? windVec.z : 0;

    if (weather === 'rain') {
      const tiltZ = -Math.atan2(wx * 1.15, 22);
      const tiltX = Math.atan2(wz * 1.15, 22);
      for (let i = 0; i < rainCount; i++) {
        const p = rainData[i];
        p.y -= p.speed * step;
        p.x += wx * 1.15 * step;
        p.z += wz * 1.15 * step;
        if (p.y < 0) {
          p.y = 22 + Math.random() * 3;
          p.x = (Math.random() - 0.5) * 54;
          p.z = -10 + Math.random() * 40;
        }
        if (p.x > 27) p.x -= 54;
        if (p.x < -27) p.x += 54;
        if (p.z > 30) p.z -= 40;
        if (p.z < -10) p.z += 40;

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(tiltX, 0, tiltZ);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rainMesh.setMatrixAt(i, dummy.matrix);
      }
      rainMesh.instanceMatrix.needsUpdate = true;
    } else if (weather === 'snow') {
      for (let i = 0; i < snowCount; i++) {
        const p = snowData[i];
        p.y -= p.speed * step;
        p.x += (wx * 0.65 + Math.sin(t * 1.8 + p.phase) * 0.6) * step;
        p.z += (wz * 0.65 + Math.cos(t * 1.5 + p.phase) * 0.5) * step;
        if (p.y < 0) {
          p.y = 20 + Math.random() * 3;
          p.x = (Math.random() - 0.5) * 54;
          p.z = -10 + Math.random() * 40;
        }
        if (p.x > 27) p.x -= 54;
        if (p.x < -27) p.x += 54;
        if (p.z > 30) p.z -= 40;
        if (p.z < -10) p.z += 40;

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(t + p.phase, t * 0.8, p.phase);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        snowMesh.setMatrixAt(i, dummy.matrix);
      }
      snowMesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, setWeather, update };
}

function buildParticleEffects() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  // 1. Confetti burst pool
  const confettiCount = 240;
  const confettiGeo = new THREE.PlaneGeometry(0.14, 0.08);
  const confettiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const confettiMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, confettiCount);
  confettiMesh.visible = false;
  confettiMesh.frustumCulled = false;
  const confettiPalette = [0xfbbf24, 0xef4444, 0x38bdf8, 0x22c55e, 0xf8fafc, 0xa855f7, 0xf97316];
  const confetti = [];
  for (let i = 0; i < confettiCount; i++) {
    tmpColor.setHex(confettiPalette[i % confettiPalette.length]);
    confettiMesh.setColorAt(i, tmpColor);
    confetti.push({
      active: false, life: 0, maxLife: 1,
      x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0,
      rx: 0, ry: 0, rz: 0, vrx: 0, vry: 0, vrz: 0,
    });
  }
  if (confettiMesh.instanceColor) confettiMesh.instanceColor.needsUpdate = true;
  group.add(confettiMesh);

  // 2. Pyro / spark / smoke jets pool behind goal
  const pyroCount = 140;
  const pyroGeo = new THREE.SphereGeometry(0.16, 6, 6);
  const pyroMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pyroMesh = new THREE.InstancedMesh(pyroGeo, pyroMat, pyroCount);
  pyroMesh.visible = false;
  pyroMesh.frustumCulled = false;
  const pyroColors = [0xfff5cc, 0xffb703, 0xfb8500, 0xff595e, 0xfde047];
  const pyros = [];
  for (let i = 0; i < pyroCount; i++) {
    tmpColor.setHex(pyroColors[i % pyroColors.length]);
    pyroMesh.setColorAt(i, tmpColor);
    pyros.push({
      active: false, life: 0, maxLife: 1,
      x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, scale: 1,
    });
  }
  if (pyroMesh.instanceColor) pyroMesh.instanceColor.needsUpdate = true;
  group.add(pyroMesh);

  // 3. Turf / water / snow spray pool
  const sprayCount = 150;
  const sprayGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  const sprayMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sprayMesh = new THREE.InstancedMesh(sprayGeo, sprayMat, sprayCount);
  sprayMesh.visible = false;
  sprayMesh.frustumCulled = false;
  const sprays = [];
  for (let i = 0; i < sprayCount; i++) {
    sprays.push({
      active: false, life: 0, maxLife: 1,
      x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, scale: 1,
    });
  }
  let sprayCursor = 0;
  group.add(sprayMesh);

  let confettiActive = false;
  let pyroActive = false;
  let sprayActive = false;

  function triggerGoal(point) {
    const px = point ? point.x : 0;
    const py = point ? Math.max(0.8, point.y) : 1.5;
    const pz = point ? point.z : -0.8;

    // Launch confetti from goal area + behind goal
    for (let i = 0; i < confettiCount; i++) {
      const c = confetti[i];
      c.active = true;
      c.life = 0;
      c.maxLife = 2.6 + Math.random() * 1.8;
      const fromPoint = i < 70;
      c.x = fromPoint ? px + (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 9.5;
      c.y = fromPoint ? py + (Math.random() - 0.3) * 0.6 : 0.4 + Math.random() * 1.5;
      c.z = fromPoint ? pz : -3.0 + (Math.random() - 0.5) * 1.2;

      c.vx = (Math.random() - 0.5) * 7.5;
      c.vy = 5.5 + Math.random() * 7.5;
      c.vz = (Math.random() - 0.35) * 5.5;
      c.rx = Math.random() * 6;
      c.ry = Math.random() * 6;
      c.rz = Math.random() * 6;
      c.vrx = (Math.random() - 0.5) * 12;
      c.vry = (Math.random() - 0.5) * 12;
      c.vrz = (Math.random() - 0.5) * 12;
    }
    confettiActive = true;
    confettiMesh.visible = true;

    // Launch pyro flare jets from 4 cannons behind the goal
    const nozzles = [-4.6, -2.1, 2.1, 4.6];
    for (let i = 0; i < pyroCount; i++) {
      const p = pyros[i];
      const nx = nozzles[i % nozzles.length];
      p.active = true;
      p.life = -(Math.random() * 0.55); // staggered jet stream
      p.maxLife = 1.0 + Math.random() * 0.9;
      p.x = nx + (Math.random() - 0.5) * 0.35;
      p.y = 0.25;
      p.z = -3.4 + (Math.random() - 0.5) * 0.3;
      p.vx = (Math.random() - 0.5) * 2.2;
      p.vy = 6.5 + Math.random() * 6.5;
      p.vz = (Math.random() - 0.5) * 1.8;
      p.scale = 0.6 + Math.random() * 1.1;
    }
    pyroActive = true;
    pyroMesh.visible = true;
  }

  function spawnSpray(point, velocity, weather) {
    if (!point) return;
    const vx = velocity ? velocity.x : 0;
    const vy = velocity ? velocity.y : 2;
    const vz = velocity ? velocity.z : -3;
    const count = 24;

    const palette = weather === 'rain'
      ? [0xdbeafe, 0x93c5fd, 0xf0f9ff, 0x3b7a44]
      : weather === 'snow'
        ? [0xffffff, 0xe2e8f0, 0xcbd5e1, 0x94a3b8]
        : [0x2d7a36, 0x3fa34d, 0x5c4028, 0x4a3520];

    for (let k = 0; k < count; k++) {
      const idx = sprayCursor;
      sprayCursor = (sprayCursor + 1) % sprayCount;
      const s = sprays[idx];
      s.active = true;
      s.life = 0;
      s.maxLife = 0.42 + Math.random() * 0.38;
      s.x = point.x + (Math.random() - 0.5) * 0.32;
      s.y = Math.max(0.04, point.y + Math.random() * 0.12);
      s.z = point.z + (Math.random() - 0.5) * 0.32;

      s.vx = vx * 0.28 + (Math.random() - 0.5) * 3.4;
      s.vy = Math.max(1.2, Math.abs(vy) * 0.22 + 1.4 + Math.random() * 2.6);
      s.vz = vz * 0.28 + (Math.random() - 0.5) * 3.4;
      s.scale = 0.65 + Math.random() * 0.85;

      tmpColor.setHex(palette[k % palette.length]);
      sprayMesh.setColorAt(idx, tmpColor);
    }
    if (sprayMesh.instanceColor) sprayMesh.instanceColor.needsUpdate = true;
    sprayActive = true;
    sprayMesh.visible = true;
  }

  function update(dt, windVec) {
    const step = Math.min(dt, 0.05);
    const wx = windVec ? windVec.x : 0;
    const wz = windVec ? windVec.z : 0;

    if (confettiActive) {
      let any = false;
      for (let i = 0; i < confettiCount; i++) {
        const c = confetti[i];
        if (!c.active) {
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          confettiMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        c.life += step;
        if (c.life >= c.maxLife) {
          c.active = false;
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          confettiMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        any = true;
        c.vy -= 4.8 * step;
        const drag = Math.exp(-1.5 * step);
        c.vx = c.vx * drag + wx * 0.35 * step;
        c.vz = c.vz * drag + wz * 0.35 * step;
        c.x += c.vx * step;
        c.y = Math.max(0.03, c.y + c.vy * step);
        c.z += c.vz * step;
        c.rx += c.vrx * step;
        c.ry += c.vry * step;
        c.rz += c.vrz * step;

        const fade = c.life > c.maxLife * 0.75 ? 1 - (c.life - c.maxLife * 0.75) / (c.maxLife * 0.25) : 1;
        dummy.position.set(c.x, c.y, c.z);
        dummy.rotation.set(c.rx, c.ry, c.rz);
        dummy.scale.setScalar(Math.max(0.01, fade));
        dummy.updateMatrix();
        confettiMesh.setMatrixAt(i, dummy.matrix);
      }
      confettiMesh.instanceMatrix.needsUpdate = true;
      if (!any) {
        confettiActive = false;
        confettiMesh.visible = false;
      }
    }

    if (pyroActive) {
      let any = false;
      for (let i = 0; i < pyroCount; i++) {
        const p = pyros[i];
        if (!p.active) {
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          pyroMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        p.life += step;
        if (p.life < 0) {
          any = true;
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          pyroMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        if (p.life >= p.maxLife) {
          p.active = false;
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          pyroMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        any = true;
        p.vy -= 3.2 * step;
        p.vx += wx * 0.25 * step;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.z += p.vz * step;

        const frac = p.life / p.maxLife;
        const sc = p.scale * (0.5 + frac * 1.4) * (1 - frac);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(Math.max(0.01, sc));
        dummy.updateMatrix();
        pyroMesh.setMatrixAt(i, dummy.matrix);
      }
      pyroMesh.instanceMatrix.needsUpdate = true;
      if (!any) {
        pyroActive = false;
        pyroMesh.visible = false;
      }
    }

    if (sprayActive) {
      let any = false;
      for (let i = 0; i < sprayCount; i++) {
        const s = sprays[i];
        if (!s.active) {
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          sprayMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        s.life += step;
        if (s.life >= s.maxLife) {
          s.active = false;
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          sprayMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        any = true;
        s.vy -= 9.81 * step;
        s.x += s.vx * step;
        s.y = Math.max(0.02, s.y + s.vy * step);
        s.z += s.vz * step;

        const sc = s.scale * (1 - s.life / s.maxLife);
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(s.life * 8, s.life * 6, 0);
        dummy.scale.setScalar(Math.max(0.01, sc));
        dummy.updateMatrix();
        sprayMesh.setMatrixAt(i, dummy.matrix);
      }
      sprayMesh.instanceMatrix.needsUpdate = true;
      if (!any) {
        sprayActive = false;
        sprayMesh.visible = false;
      }
    }
  }

  return { group, triggerGoal, spawnSpray, update };
}

export function createWorld(scene) {
  // Cached sky textures per timeOfDay
  const skyCache = {
    night: createSkyTexture('night'),
  };

  scene.background = new THREE.Color(0x0b1528);
  scene.fog = new THREE.Fog(0x0b1528, 72, 185);

  const skyGeo = new THREE.SphereGeometry(170, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyCache.night,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Lights
  const hemi = new THREE.HemisphereLight(0x9bc0ff, 0x1c3d1e, 0.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x283a55, 0.35);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.55);
  keyLight.position.set(22, 36, 26);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 5;
  keyLight.shadow.camera.far = 95;
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 24;
  keyLight.shadow.camera.bottom = -16;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xa3c8ff, 0.6);
  fillLight.position.set(-24, 28, -14);
  scene.add(fillLight);

  // Outer stadium surround
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x1b3322, roughness: 0.94 });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.03, 26);
  apron.receiveShadow = true;
  scene.add(apron);

  // Main PBR striped grass pitch
  const grass = createGrassTextures();
  const pitchMat = new THREE.MeshStandardMaterial({
    map: grass.map,
    roughnessMap: grass.roughnessMap,
    bumpMap: grass.bumpMap,
    bumpScale: 0.032,
    roughness: 0.86,
    metalness: 0.03,
    color: 0xffffff,
  });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(76, 86), pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0, 28);
  pitch.receiveShadow = true;
  scene.add(pitch);

  scene.add(buildPitchMarkings());

  const { group: goalGroup, net } = buildGoal();
  scene.add(goalGroup);

  const { group: adGroup, adTex, sideTex } = buildAdBoards();
  scene.add(adGroup);

  const { group: flagsGroup, flags } = buildCornerFlags();
  scene.add(flagsGroup);

  const { group: stadiumGroup, setExcitement, updateCrowd } = buildStadiumAndCrowd();
  scene.add(stadiumGroup);

  const floodlights = buildFloodlights();
  scene.add(floodlights.group);

  const weatherSys = buildWeatherSystems();
  scene.add(weatherSys.group);

  const effects = buildParticleEffects();
  scene.add(effects.group);

  const PENALTY_SPOT = new THREE.Vector3(0, 0, 11);
  const windVec = new THREE.Vector3(0, 0, 0);
  let currentTimeOfDay = 'night';
  let currentWeather = 'clear';
  let baseKeyIntensity = 1.55;
  let baseConeOpacity = 0.07;
  let goalFlashTimer = 0;
  let elapsed = 0;

  function setEnvironment(opts = {}) {
    const tod = opts.timeOfDay || currentTimeOfDay;
    const weather = opts.weather || currentWeather;
    currentTimeOfDay = (tod === 'day' || tod === 'sunset' || tod === 'night') ? tod : 'night';
    currentWeather = (weather === 'clear' || weather === 'rain' || weather === 'snow') ? weather : 'clear';

    if (!skyCache[currentTimeOfDay]) {
      skyCache[currentTimeOfDay] = createSkyTexture(currentTimeOfDay);
    }
    skyMat.map = skyCache[currentTimeOfDay];
    skyMat.needsUpdate = true;

    if (currentTimeOfDay === 'day') {
      const fogColor = currentWeather === 'rain' ? 0x7b93ad : currentWeather === 'snow' ? 0xc2d5e8 : 0x8ec5f2;
      scene.background.setHex(fogColor);
      scene.fog.color.setHex(fogColor);
      scene.fog.near = currentWeather === 'clear' ? 90 : 58;
      scene.fog.far = currentWeather === 'clear' ? 210 : 155;

      hemi.color.setHex(0xd6ecff);
      hemi.groundColor.setHex(0x2b572d);
      hemi.intensity = currentWeather === 'rain' ? 0.85 : 1.15;
      ambient.color.setHex(0x557090);
      ambient.intensity = 0.45;
      keyLight.color.setHex(0xfffbe8);
      keyLight.position.set(28, 44, 24);
      baseKeyIntensity = currentWeather === 'rain' ? 1.25 : 1.9;
      fillLight.color.setHex(0xb8dcff);
      fillLight.intensity = 0.55;

      floodlights.bulbMat.color.setHex(0x9aa6b5);
      floodlights.glowMat.opacity = 0.06;
      baseConeOpacity = 0.0;
    } else if (currentTimeOfDay === 'sunset') {
      const fogColor = currentWeather === 'rain' ? 0x45354a : 0x61394c;
      scene.background.setHex(fogColor);
      scene.fog.color.setHex(fogColor);
      scene.fog.near = 68;
      scene.fog.far = 175;

      hemi.color.setHex(0xffb88c);
      hemi.groundColor.setHex(0x283622);
      hemi.intensity = 0.9;
      ambient.color.setHex(0x4d3448);
      ambient.intensity = 0.4;
      keyLight.color.setHex(0xffb56b);
      keyLight.position.set(36, 18, 22);
      baseKeyIntensity = 1.65;
      fillLight.color.setHex(0x8899dd);
      fillLight.intensity = 0.55;

      floodlights.bulbMat.color.setHex(0xfff4d6);
      floodlights.glowMat.opacity = 0.48;
      baseConeOpacity = 0.04;
    } else {
      const fogColor = currentWeather === 'snow' ? 0x16243a : 0x0b1528;
      scene.background.setHex(fogColor);
      scene.fog.color.setHex(fogColor);
      scene.fog.near = currentWeather === 'clear' ? 72 : 52;
      scene.fog.far = currentWeather === 'clear' ? 185 : 150;

      hemi.color.setHex(0x9bc0ff);
      hemi.groundColor.setHex(0x1c3d1e);
      hemi.intensity = 0.85;
      ambient.color.setHex(0x283a55);
      ambient.intensity = 0.35;
      keyLight.color.setHex(0xfff6e5);
      keyLight.position.set(22, 36, 26);
      baseKeyIntensity = 1.55;
      fillLight.color.setHex(0xa3c8ff);
      fillLight.intensity = 0.6;

      floodlights.bulbMat.color.setHex(0xfffbe8);
      floodlights.glowMat.opacity = 0.72;
      baseConeOpacity = 0.075;
    }

    keyLight.intensity = baseKeyIntensity;
    floodlights.coneMat.opacity = baseConeOpacity;
    const showCones = baseConeOpacity > 0.005;
    for (const c of floodlights.cones) c.visible = showCones;

    // Weather pitch appearance
    if (currentWeather === 'rain') {
      pitchMat.roughness = 0.28;
      pitchMat.metalness = 0.16;
      pitchMat.color.setHex(0xd4e6da);
      apronMat.color.setHex(0x13271a);
      apronMat.roughness = 0.35;
    } else if (currentWeather === 'snow') {
      pitchMat.roughness = 0.92;
      pitchMat.metalness = 0.02;
      pitchMat.color.setHex(0xd8ece0);
      apronMat.color.setHex(0x6e857a);
      apronMat.roughness = 0.95;
    } else {
      pitchMat.roughness = 0.86;
      pitchMat.metalness = 0.03;
      pitchMat.color.setHex(0xffffff);
      apronMat.color.setHex(0x1b3322);
      apronMat.roughness = 0.94;
    }
    pitchMat.needsUpdate = true;
    weatherSys.setWeather(currentWeather);
  }

  function setWind(vec) {
    if (vec && typeof vec.x === 'number') {
      windVec.set(vec.x || 0, vec.y || 0, vec.z || 0);
    } else {
      windVec.set(0, 0, 0);
    }
  }

  function triggerGoalEffects(point) {
    effects.triggerGoal(point);
    goalFlashTimer = 2.2;
  }

  function spawnTurfSpray(point, velocity) {
    effects.spawnSpray(point, velocity, currentWeather);
  }

  function update(dt) {
    const safeDt = Math.min(Math.max(dt || 0, 0), 0.1);
    elapsed += safeDt;

    net.update(safeDt, windVec);
    updateCrowd(safeDt);
    weatherSys.update(safeDt, windVec);
    effects.update(safeDt, windVec);

    // Subtle LED ad board scroll
    adTex.offset.x = (adTex.offset.x + safeDt * 0.022) % 1;
    sideTex.offset.x = (sideTex.offset.x + safeDt * 0.022) % 1;

    // Corner flags react to wind vector
    const windSpeed = Math.hypot(windVec.x, windVec.z);
    const windAngle = windSpeed > 0.2 ? -Math.atan2(windVec.z, windVec.x) : 0.25;
    const waveFreq = 4.5 + windSpeed * 1.4;
    const waveAmp = 0.04 + Math.min(0.11, windSpeed * 0.015);
    for (let f = 0; f < flags.length; f++) {
      const fl = flags[f];
      fl.pivot.rotation.y = windAngle + Math.sin(elapsed * 2.1 + f) * 0.1;
      const posAttr = fl.clothGeo.attributes.position;
      const base = fl.basePos;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const frac = bx / 0.52;
        posAttr.setZ(i, Math.sin(elapsed * waveFreq - bx * 11 + f * 1.3) * waveAmp * frac);
        posAttr.setY(i, by - (1 - Math.min(1, windSpeed / 4)) * 0.06 * frac);
      }
      posAttr.needsUpdate = true;
    }

    // Celebratory floodlight strobe pulse
    if (goalFlashTimer > 0) {
      goalFlashTimer = Math.max(0, goalFlashTimer - safeDt);
      const pulse = 0.5 + 0.5 * Math.sin(goalFlashTimer * 18.0);
      keyLight.intensity = baseKeyIntensity * (1 + pulse * 0.35);
      if (baseConeOpacity > 0.005) {
        floodlights.coneMat.opacity = baseConeOpacity * (1 + pulse * 1.4);
      }
      if (goalFlashTimer === 0) {
        keyLight.intensity = baseKeyIntensity;
        floodlights.coneMat.opacity = baseConeOpacity;
      }
    }
  }

  function netImpact(point, velocity) {
    net.impact(point, velocity);
  }

  function setCrowdExcitement(v) {
    setExcitement(v);
  }

  return {
    GOAL,
    PENALTY_SPOT,
    update,
    netImpact,
    setCrowdExcitement,
    setEnvironment,
    setWind,
    triggerGoalEffects,
    spawnTurfSpray,
  };
}
