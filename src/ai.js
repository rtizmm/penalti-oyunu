/**
 * Yapay zekâ kaleci/penaltıcı mantığı, takım forma setleri ve turnuva rakipleri (v2).
 *
 * Dünya koordinatları (CONTRACT.md):
 *   'left'   = -x (penaltıcının solu, kalecinin sağı)
 *   'center' = x ≈ 0
 *   'right'  = +x (penaltıcının sağı, kalecinin solu)
 *   height   = 'low' | 'high'
 */

export const TEAM_PRESETS = [
  { id: 'turkiye', name: 'Kırmızı-Beyaz', primary: 0xd32f2f, secondary: 0xffffff, shorts: 0xffffff, gloveColor: 0xffd54f },
  { id: 'fener', name: 'Sarı-Lacivert', primary: 0xfacc15, secondary: 0x1e3a8a, shorts: 0x1e3a8a, gloveColor: 0x38bdf8 },
  { id: 'gala', name: 'Sarı-Kırmızı', primary: 0xc8102e, secondary: 0xfdb913, shorts: 0xffffff, gloveColor: 0xfef08a },
  { id: 'besiktas', name: 'Siyah-Beyaz', primary: 0xf8fafc, secondary: 0x111827, shorts: 0x111827, gloveColor: 0x22c55e },
  { id: 'trabzon', name: 'Bordo-Mavi', primary: 0x7f1d1d, secondary: 0x38bdf8, shorts: 0x1e3a8a, gloveColor: 0xf97316 },
  { id: 'turkuaz', name: 'Turkuaz-Altın', primary: 0x06b6d4, secondary: 0xfbbf24, shorts: 0x0f172a, gloveColor: 0xfde047 },
];

export const TOURNAMENT_STAGES = [
  {
    stage: 'Çeyrek Final',
    opponent: 'Anadolu FK',
    difficulty: 'easy',
    kit: { primary: 0x16a34a, secondary: 0xffffff, shorts: 0x14532d, number: 9, gloveColor: 0xfacc15 },
  },
  {
    stage: 'Yarı Final',
    opponent: 'Boğaz Gücü',
    difficulty: 'medium',
    kit: { primary: 0x2563eb, secondary: 0xfacc15, shorts: 0x1e3a8a, number: 7, gloveColor: 0xf43f5e },
  },
  {
    stage: 'FİNAL',
    opponent: 'Avrupa Yıldızları',
    difficulty: 'hard',
    kit: { primary: 0x18181b, secondary: 0xf59e0b, shorts: 0x09090b, number: 10, gloveColor: 0x38bdf8 },
  },
];

export const SHOT_TYPES = [
  { id: 'normal', key: '1', label: 'Normal', desc: 'Güçlü ve dengeli vuruş' },
  { id: 'finesse', key: '2', label: 'Plase', desc: 'Yüksek isabet ve ekstra falso' },
  { id: 'panenka', key: '3', label: 'Panenka', desc: 'Yavaş aşırtma — erken atlayan kaleciyi avlar' },
  { id: 'trivela', key: '4', label: 'Trivela', desc: 'Ayak dışı sert ve keskin kavis' },
];

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'Kolay',
    note: 'Yavaş güç çubuğu, daha az isabetli rakip, daha geniş tepki süresi.',
    powerSpeed: 0.78,
    aimSpeed: 5.5,
    keeperGuessAccuracy: 0.36,
    keeperHeightAccuracy: 0.45,
    keeperReactionDelay: 0.27,
    keeperDiveDuration: 0.76,
    keeperShuffleAmp: 0.35,
    stutterFoolChance: 0.85,
    aiShotPowerMin: 0.45,
    aiShotPowerMax: 0.65,
    aiCornerBias: 0.35,
    aiHighChance: 0.25,
    aiCurlMax: 0.2,
    aiMissChance: 0.14,
    aiFakeChance: 0.0,
    aiReadEarlyDiveChance: 0.15,
    userDiveDuration: 0.50,
    earlyDiveThreshold: 0.55,
  },
  medium: {
    id: 'medium',
    label: 'Orta',
    note: 'Dengeli tempo, refleksli kaleci ve köşelere giden isabetli şutlar.',
    powerSpeed: 1.18,
    aimSpeed: 6.2,
    keeperGuessAccuracy: 0.58,
    keeperHeightAccuracy: 0.64,
    keeperReactionDelay: 0.14,
    keeperDiveDuration: 0.58,
    keeperShuffleAmp: 0.6,
    stutterFoolChance: 0.65,
    aiShotPowerMin: 0.60,
    aiShotPowerMax: 0.78,
    aiCornerBias: 0.68,
    aiHighChance: 0.45,
    aiCurlMax: 0.55,
    aiMissChance: 0.06,
    aiFakeChance: 0.22,
    aiReadEarlyDiveChance: 0.50,
    userDiveDuration: 0.55,
    earlyDiveThreshold: 0.65,
  },
  hard: {
    id: 'hard',
    label: 'Zor',
    note: 'Hızlı güç çubuğu, keskin kaleci, falsolu 90 atışları ve şaşırtmalı koşu!',
    powerSpeed: 1.68,
    aimSpeed: 7.0,
    keeperGuessAccuracy: 0.78,
    keeperHeightAccuracy: 0.80,
    keeperReactionDelay: 0.04,
    keeperDiveDuration: 0.44,
    keeperShuffleAmp: 0.85,
    stutterFoolChance: 0.38,
    aiShotPowerMin: 0.72,
    aiShotPowerMax: 0.85,
    aiCornerBias: 0.90,
    aiHighChance: 0.58,
    aiCurlMax: 0.95,
    aiMissChance: 0.03,
    aiFakeChance: 0.45,
    aiReadEarlyDiveChance: 0.85,
    userDiveDuration: 0.60,
    earlyDiveThreshold: 0.74,
  },
};

export function getDifficulty(id) {
  return DIFFICULTIES[id] || DIFFICULTIES.medium;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function classifyShot(targetX, targetY) {
  const dir = targetX < -1.05 ? 'left' : targetX > 1.05 ? 'right' : 'center';
  const height = targetY > 1.25 ? 'high' : 'low';
  return { dir, height };
}

/**
 * YZ kaleci karar mekanizması (v2: stutter-step ve Panenka farkındalığı).
 */
export function decideAiKeeperDive(diffId, shotInfo, options = {}) {
  const cfg = getDifficulty(diffId);
  const { dir: trueDir, height: trueHeight } = classifyShot(shotInfo.targetX, shotInfo.targetY);
  const stuttered = !!options.stuttered;
  const isPanenka = shotInfo.shotType === 'panenka';

  // Şaşırtmalı koşu (stutter) kaleciyi erken ve yanlış köşeye atlatabilir
  if (stuttered && Math.random() < cfg.stutterFoolChance) {
    const sideChoice = isPanenka
      ? pickRandom(['left', 'right'])
      : pickRandom(['left', 'center', 'right'].filter((d) => d !== trueDir));
    return {
      dir: sideChoice,
      height: 'low',
      delay: 0,
      duration: cfg.keeperDiveDuration * 1.08,
      fooledByStutter: true,
    };
  }

  // Panenka'ya karşı kaleciler genelde bir köşeye atlamaya meyillidir
  let dir = trueDir;
  const effectiveAcc = isPanenka ? cfg.keeperGuessAccuracy * 0.48 : cfg.keeperGuessAccuracy;
  if (Math.random() > effectiveAcc) {
    const others = ['left', 'center', 'right'].filter((d) => d !== trueDir);
    dir = pickRandom(others);
  }

  let height = trueHeight;
  if (Math.random() > cfg.keeperHeightAccuracy) {
    height = trueHeight === 'high' ? 'low' : 'high';
  }

  const jitter = randRange(-0.02, 0.04);
  const delay = Math.max(0, cfg.keeperReactionDelay + jitter);
  const duration = cfg.keeperDiveDuration * randRange(0.95, 1.06);

  return { dir, height, delay, duration, fooledByStutter: false };
}

/**
 * YZ penaltıcı şut planı (v2: şut tipi çeşitliliği dahil).
 */
export function planAiShot(diffId, goal) {
  const cfg = getDifficulty(diffId);
  const hw = (goal && goal.halfWidth) || 3.66;
  const gh = (goal && goal.height) || 2.44;

  const sideRoll = Math.random();
  let dir;
  if (sideRoll < (1 - cfg.aiCornerBias) * 0.45) {
    dir = 'center';
  } else {
    dir = Math.random() < 0.5 ? 'left' : 'right';
  }

  // Zorluk arttıkça özel şut tipleri (plase, trivela, panenka)
  let shotType = 'normal';
  const typeRoll = Math.random();
  if (dir === 'center' && diffId !== 'easy' && typeRoll < 0.35) {
    shotType = 'panenka';
  } else if (diffId === 'hard' && typeRoll < 0.35) {
    shotType = 'trivela';
  } else if (diffId !== 'easy' && typeRoll < 0.55) {
    shotType = 'finesse';
  }

  const isHigh = shotType === 'panenka' ? true : Math.random() < cfg.aiHighChance;
  const isMiss = Math.random() < cfg.aiMissChance;

  let targetX;
  let targetY;

  if (dir === 'center') {
    targetX = randRange(-0.85, 0.85);
    targetY = isHigh ? randRange(1.45, gh - 0.35) : randRange(0.35, 1.15);
  } else {
    const sign = dir === 'right' ? 1 : -1;
    const minX = 1.45 + cfg.aiCornerBias * 1.15;
    const maxX = hw - 0.28;
    targetX = sign * randRange(Math.min(minX, maxX - 0.15), maxX);
    targetY = isHigh
      ? randRange(1.45 + cfg.aiCornerBias * 0.25, gh - 0.26)
      : randRange(0.28, 1.05);
  }

  if (isMiss && shotType !== 'panenka') {
    if (Math.random() < 0.55) {
      targetY = gh + randRange(0.25, 0.85);
    } else {
      const sign = targetX >= 0 ? 1 : -1;
      targetX = sign * (hw + randRange(0.25, 0.95));
    }
  }

  const power = shotType === 'panenka'
    ? randRange(0.42, 0.62)
    : randRange(cfg.aiShotPowerMin, cfg.aiShotPowerMax);
  const curl = randRange(-cfg.aiCurlMax, cfg.aiCurlMax);

  const hasFake = Math.random() < cfg.aiFakeChance;
  const fakeAt = hasFake ? randRange(0.45, 0.68) : -1;
  const fakePause = hasFake ? randRange(0.28, 0.48) : 0;

  return {
    dir,
    height: isHigh ? 'high' : 'low',
    shotType,
    targetX,
    targetY,
    power,
    curl,
    hasFake,
    fakeAt,
    fakePause,
  };
}

export function adaptAiShotForEarlyDive(plan, diffId, userDiveDir, goal) {
  if (!userDiveDir) return plan;
  const cfg = getDifficulty(diffId);
  if (Math.random() > cfg.aiReadEarlyDiveChance) return plan;

  const hw = (goal && goal.halfWidth) || 3.66;
  const newPlan = { ...plan };

  if (userDiveDir === 'left') {
    newPlan.dir = 'right';
    newPlan.targetX = randRange(hw * 0.55, hw - 0.35);
  } else if (userDiveDir === 'right') {
    newPlan.dir = 'left';
    newPlan.targetX = -randRange(hw * 0.55, hw - 0.35);
  } else {
    const sign = Math.random() < 0.5 ? -1 : 1;
    newPlan.dir = sign < 0 ? 'left' : 'right';
    newPlan.targetX = sign * randRange(hw * 0.62, hw - 0.32);
  }
  newPlan.readEarlyDive = true;
  return newPlan;
}
