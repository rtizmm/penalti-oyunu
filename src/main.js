import * as THREE from 'three';
import { createWorld } from './scene.js';
import { CAMERA_MODES, createCameraRig } from './cameras.js';
import { createAudio } from './audio.js';
import { createKeeper, createShooter } from './characters.js';
import { createBall, BALL_SKINS } from './ball.js';
import { createNetClient } from './net.js';
import {
  TEAM_PRESETS,
  TOURNAMENT_STAGES,
  SHOT_TYPES,
  DIFFICULTIES,
  getDifficulty,
  decideAiKeeperDive,
  planAiShot,
  adaptAiShotForEarlyDive,
} from './ai.js';

const STORAGE_CAM = 'penalti_cam_v1';
const STORAGE_DIFF = 'penalti_diff_v1';
const STORAGE_MODE = 'penalti_mode_v1';
const STORAGE_MUTE = 'penalti_mute_v1';
const STORAGE_ENV = 'penalti_env_v2';
const STORAGE_KIT = 'penalti_kit_v2';
const STORAGE_STATS = 'penalti_stats_v2';
const STORAGE_NAME = 'penalti_name_v3';

const $ = (id) => document.getElementById(id);

const ui = {
  canvas: $('game'),
  loading: $('loading'),
  menu: $('menu'),
  hud: $('hud'),
  pause: $('pause'),
  end: $('end'),
  statsModal: $('statsModal'),
  statsGrid: $('statsGrid'),
  // Scoreboard & meta
  sbMode: $('sbMode'),
  sbDiff: $('sbDiff'),
  rowUser: $('rowUser'),
  rowAi: $('rowAi'),
  swatchUser: $('swatchUser'),
  swatchAi: $('swatchAi'),
  dotsUser: $('dotsUser'),
  dotsAi: $('dotsAi'),
  scoreUser: $('scoreUser'),
  scoreAi: $('scoreAi'),
  sbFoot: $('sbFoot'),
  windBadge: $('windBadge'),
  windArrow: $('windArrow'),
  windText: $('windText'),
  speedBadge: $('speedBadge'),
  speedVal: $('speedVal'),
  bracketBar: $('bracketBar'),
  targetHud: $('targetHud'),
  targetScore: $('targetScore'),
  targetCombo: $('targetCombo'),
  // Controls & overlays
  camButtons: $('camButtons'),
  camChips: $('camChips'),
  btnAnnouncer: $('btnAnnouncer'),
  btnMute: $('btnMute'),
  btnPause: $('btnPause'),
  turnInfo: $('turnInfo'),
  hint: $('hint'),
  slowmo: $('slowmo'),
  toast: $('toast'),
  replayHud: $('replayHud'),
  btnSkipReplay: $('btnSkipReplay'),
  shotBar: $('shotBar'),
  timedBar: $('timedBar'),
  timedCursor: $('timedCursor'),
  reticle: $('reticle'),
  power: $('power'),
  pwFill: $('pwFill'),
  pwMarker: $('pwMarker'),
  pwCurl: $('pwCurl'),
  keeperPad: $('keeperPad'),
  keeperPadTitle: $('keeperPadTitle'),
  banner: $('banner'),
  bannerText: $('bannerText'),
  bannerSub: $('bannerSub'),
  // Menu
  modeGrid: $('modeGrid'),
  diffSeg: $('diffSeg'),
  diffNote: $('diffNote'),
  timeSeg: $('timeSeg'),
  weatherSeg: $('weatherSeg'),
  teamSwatches: $('teamSwatches'),
  jerseyInput: $('jerseyInput'),
  ballSkinChips: $('ballSkinChips'),
  btnStart: $('btnStart'),
  btnStats: $('btnStats'),
  btnMenuAnnouncer: $('btnMenuAnnouncer'),
  btnResetStats: $('btnResetStats'),
  btnCloseStats: $('btnCloseStats'),
  // Pause / End
  btnResume: $('btnResume'),
  btnRestart: $('btnRestart'),
  btnMenu: $('btnMenu'),
  endIcon: $('endIcon'),
  endTitle: $('endTitle'),
  endScore: $('endScore'),
  endDetail: $('endDetail'),
  btnNextStage: $('btnNextStage'),
  btnRematch: $('btnRematch'),
  btnAgain: $('btnAgain'),
  btnLeaveOnline: $('btnLeaveOnline'),
  btnEndMenu: $('btnEndMenu'),
  // Online Lobby & HUD (v3)
  onlineLobby: $('onlineLobby'),
  netStatus: $('netStatus'),
  netOnlineCount: $('netOnlineCount'),
  netRoomCount: $('netRoomCount'),
  netPing: $('netPing'),
  netHudPing: $('netHudPing'),
  hudPingVal: $('hudPingVal'),
  netNameInput: $('netNameInput'),
  lobbyMain: $('lobbyMain'),
  lobbyWaiting: $('lobbyWaiting'),
  btnCreateRoom: $('btnCreateRoom'),
  joinCodeInput: $('joinCodeInput'),
  btnJoinRoom: $('btnJoinRoom'),
  roomCodeDisplay: $('roomCodeDisplay'),
  btnCopyInvite: $('btnCopyInvite'),
  btnCancelRoom: $('btnCancelRoom'),
  lobbyError: $('lobbyError'),
  btnCloseLobby: $('btnCloseLobby'),
  onlineTimerBar: $('onlineTimerBar'),
  onlineStatusText: $('onlineStatusText'),
  onlineTimerSec: $('onlineTimerSec'),
  onlineTimerFill: $('onlineTimerFill'),
  emoteBar: $('emoteBar'),
  emoteFloat: $('emoteFloat'),
};

// ============ THREE.JS KURULUMU ============
const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 340);

const world = createWorld(scene);
const GOAL = world.GOAL || { halfWidth: 3.66, height: 2.44, postRadius: 0.06 };
const PENALTY_SPOT = world.PENALTY_SPOT || new THREE.Vector3(0, 0, 11);

const cameraRig = createCameraRig(camera);
const audio = createAudio();
const keeper = createKeeper(scene, { color: 0x00bcd4 });
const shooter = createShooter(scene, { color: 0xd32f2f });
const ball = createBall(scene, GOAL);

// ============ AYARLAR & İSTATİSTİKLER ============
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

const savedEnv = loadJSON(STORAGE_ENV, { timeOfDay: 'night', weather: 'clear', announcer: true });
const savedKit = loadJSON(STORAGE_KIT, { teamId: 'turkiye', number: 10, ballSkin: 'classic' });

const settings = {
  mode: localStorage.getItem(STORAGE_MODE) || 'series',
  difficulty: localStorage.getItem(STORAGE_DIFF) || 'medium',
  cameraId: localStorage.getItem(STORAGE_CAM) || (CAMERA_MODES[0] && CAMERA_MODES[0].id) || 'broadcast',
  muted: localStorage.getItem(STORAGE_MUTE) === '1',
  timeOfDay: savedEnv.timeOfDay,
  weather: savedEnv.weather,
  announcer: savedEnv.announcer !== false,
  teamId: savedKit.teamId,
  jerseyNumber: Math.max(1, Math.min(99, Number(savedKit.number) || 10)),
  ballSkin: savedKit.ballSkin || 'classic',
};

const VALID_MODES = ['shooter', 'keeper', 'series', 'local2p', 'tournament', 'targets', 'online'];
if (!VALID_MODES.includes(settings.mode)) settings.mode = 'series';
if (!DIFFICULTIES[settings.difficulty]) settings.difficulty = 'medium';
if (!CAMERA_MODES.some((m) => m.id === settings.cameraId)) {
  settings.cameraId = (CAMERA_MODES[0] && CAMERA_MODES[0].id) || 'broadcast';
}
if (!TEAM_PRESETS.some((t) => t.id === settings.teamId)) settings.teamId = TEAM_PRESETS[0].id;
if (!BALL_SKINS.some((s) => s.id === settings.ballSkin)) settings.ballSkin = 'classic';

const DEFAULT_STATS = {
  totalGoals: 0,
  totalShots: 0,
  totalSaves: 0,
  totalFaced: 0,
  bestStreak: 0,
  currentStreak: 0,
  maxSpeedKmh: 0,
  trophies: 0,
  bestTargetScore: 0,
};
let stats = loadJSON(STORAGE_STATS, DEFAULT_STATS);

function saveStats() {
  try { localStorage.setItem(STORAGE_STATS, JSON.stringify(stats)); } catch {}
}

function saveEnv() {
  try {
    localStorage.setItem(STORAGE_ENV, JSON.stringify({
      timeOfDay: settings.timeOfDay,
      weather: settings.weather,
      announcer: settings.announcer,
    }));
  } catch {}
}

function saveKit() {
  try {
    localStorage.setItem(STORAGE_KIT, JSON.stringify({
      teamId: settings.teamId,
      number: settings.jerseyNumber,
      ballSkin: settings.ballSkin,
    }));
  } catch {}
}

function hexToCss(hex) {
  return '#' + (hex >>> 0).toString(16).padStart(6, '0');
}

// ============ 3D HEDEF VURMA SİSTEMİ ============
const targetGroup = new THREE.Group();
scene.add(targetGroup);
const targetItems = [];

const TARGET_LAYOUT = [
  { x: -2.78, y: 1.90, r: 0.56, pts: 300, color: 0xffcc00, label: "90'A ASMA!" },
  { x: 2.78, y: 1.90, r: 0.56, pts: 300, color: 0xffcc00, label: "90'A ASMA!" },
  { x: -2.55, y: 0.65, r: 0.64, pts: 150, color: 0x38bdf8, label: 'ALT KÖŞE!' },
  { x: 2.55, y: 0.65, r: 0.64, pts: 150, color: 0x38bdf8, label: 'ALT KÖŞE!' },
  { x: 0.0, y: 1.28, r: 0.68, pts: 100, color: 0x22c55e, label: 'MERKEZ HEDEF!' },
];

function buildTargets() {
  while (targetGroup.children.length) targetGroup.remove(targetGroup.children[0]);
  targetItems.length = 0;

  TARGET_LAYOUT.forEach((def) => {
    const holder = new THREE.Group();
    holder.position.set(def.x, def.y, -0.12);

    const outer = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, 0.055, 12, 32),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.92 })
    );
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(def.r * 0.78, 28),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    const bull = new THREE.Mesh(
      new THREE.CircleGeometry(def.r * 0.24, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    bull.position.z = 0.01;
    holder.add(outer, inner, bull);
    targetGroup.add(holder);

    targetItems.push({
      ...def,
      group: holder,
      outer,
      inner,
      bull,
      hit: false,
      burstTimer: 0,
    });
  });
}
buildTargets();
targetGroup.visible = false;

function resetTargets() {
  targetItems.forEach((t) => {
    t.hit = false;
    t.burstTimer = 0;
    t.group.visible = true;
    t.group.scale.setScalar(1);
    t.outer.material.opacity = 0.92;
    t.inner.material.opacity = 0.24;
    t.bull.material.opacity = 0.85;
  });
}

function updateTargets(dt, nowSec) {
  if (!targetGroup.visible) return;
  for (const t of targetItems) {
    if (!t.hit) {
      const pulse = 1 + Math.sin(nowSec * 4.2 + t.x) * 0.05;
      t.group.scale.setScalar(pulse);
    } else if (t.burstTimer > 0) {
      t.burstTimer = Math.max(0, t.burstTimer - dt);
      const frac = 1 - t.burstTimer / 0.45;
      t.group.scale.setScalar(1 + frac * 0.85);
      const op = Math.max(0, 1 - frac);
      t.outer.material.opacity = op;
      t.inner.material.opacity = op * 0.3;
      t.bull.material.opacity = op;
      if (t.burstTimer <= 0) t.group.visible = false;
    }
  }
}

// ============ OYUN DURUMU ============
const windVec = new THREE.Vector3(0, 0, 0);

const state = {
  phase: 'menu', // 'menu' | 'aim' | 'runup' | 'flight' | 'result' | 'replay' | 'ended'
  paused: false,
  userRole: 'shooter', // 'shooter' | 'keeper'
  activeDifficulty: settings.difficulty,
  roundIndex: 0,
  suddenDeath: false,
  // Turnuva
  tournamentStage: 0, // 0=Çeyrek, 1=Yarı, 2=Final
  // Hedef Vurma
  targetScore: 0,
  targetCombo: 0,
  targetShotsLeft: 10,
  // Skorlar
  userResults: [],
  aiResults: [],
  userScore: 0,
  aiScore: 0,
  // Penaltıcı nişan + güç + şut tipi + zamanlı vuruş
  shotType: 'normal',
  aimX: 0,
  aimY: 1.15,
  curl: 0,
  charging: false,
  power: 0,
  powerDir: 1,
  lockedShot: null,
  stuttered: false,
  timedFinish: null, // 'perfect' | 'good' | 'bad' | null
  timedLocked: false,
  // Kaleci / koşu
  aiKeeperPlan: null,
  aiKeeperDived: false,
  aiKeeperTimer: 0,
  aiShotPlan: null,
  aiShotReadyTimer: 0,
  runupElapsed: 0,
  runupDuration: 1.35,
  runupFakeDone: false,
  runupPauseTimer: 0,
  userKeeperDived: false,
  userKeeperDir: null,
  userKeeperHeight: 'low',
  userDiveProgress: 0,
  keeperShufflePhase: 0,
  // Sonuç, hız, ağır çekim, tekrar
  kickResolved: false,
  kickOutcome: null,
  resultTimer: 0,
  slowMoTimer: 0,
  slowMoTriggered: false,
  timeScale: 1,
  toastTimer: 0,
  speedTimer: 0,
  // Instant Replay
  replayFrames: [],
  replayRecordAccum: 0,
  replayIndex: 0,
  replayTimer: 0,
  replayPrevCam: null,
  shouldReplay: false,
};

// ============ ONLINE 1v1 DURUMU (V3) ============
const online = {
  active: false,
  side: null, // 'host' | 'guest'
  code: '',
  players: null,
  turnId: 0,
  round: 1,
  shooterSide: 'host',
  deadlineMs: 0,
  picked: false,
  opponentReady: false,
  opponentKeeperX: 0,
  execDive: null,
  execDiveTriggered: false,
  execDiveTimer: 0,
  pendingNextTurn: null,
  pendingMatchOver: null,
  waitingForScore: false,
  rematchRequested: false,
  emoteTimer: 0,
  playerName: localStorage.getItem(STORAGE_NAME) || 'Oyuncu',
};

let netClient = null;

function showLobbyError(msg) {
  if (!msg) {
    ui.lobbyError.classList.add('hidden');
    ui.lobbyError.textContent = '';
  } else {
    ui.lobbyError.textContent = msg;
    ui.lobbyError.classList.remove('hidden');
  }
}

function showEmotePopup(fromName, emoji) {
  ui.emoteFloat.textContent = `${fromName}: ${emoji}`;
  ui.emoteFloat.classList.remove('hidden');
  online.emoteTimer = 2.3;
}

function getSelectedKitIndex() {
  const idx = TEAM_PRESETS.findIndex((t) => t.id === settings.teamId);
  return idx >= 0 ? idx : 0;
}

function getNetClient() {
  if (netClient) return netClient;
  netClient = createNetClient({
    onOpen() {
      ui.netStatus.textContent = '● Çevrimiçi';
      ui.netStatus.className = 'net-status-pill ok';
      showLobbyError('');
    },
    onClose() {
      ui.netStatus.textContent = 'Bağlantı kesildi';
      ui.netStatus.className = 'net-status-pill err';
    },
    onError() {
      ui.netStatus.textContent = 'Bağlantı hatası';
      ui.netStatus.className = 'net-status-pill err';
    },
    onStats({ onlineCount, roomCount, pingMs }) {
      ui.netOnlineCount.textContent = String(onlineCount ?? 0);
      ui.netRoomCount.textContent = String(roomCount ?? 0);
      const pingText = pingMs != null ? String(Math.round(pingMs)) : '--';
      ui.netPing.textContent = pingText;
      ui.hudPingVal.textContent = pingText;
    },
    onRoomCreated({ code, side }) {
      online.code = code;
      online.side = side;
      ui.roomCodeDisplay.textContent = code;
      ui.lobbyMain.classList.add('hidden');
      ui.lobbyWaiting.classList.remove('hidden');
      showLobbyError('');
    },
    onRoomError({ message }) {
      showLobbyError(message || 'Oda hatası');
    },
    onMatchStart(data) {
      handleOnlineMatchStart(data);
    },
    onOpponentKeeperPos({ x }) {
      online.opponentKeeperX = Math.max(-1, Math.min(1, Number(x) || 0));
    },
    onOpponentReady({ role }) {
      online.opponentReady = true;
      const msg = role === 'shooter' ? '✅ Rakip şutunu hazırladı!' : '✅ Rakip kaleci hazır!';
      ui.onlineStatusText.textContent = msg;
      showToast(msg, 1.3);
    },
    onExecuteTurn(data) {
      handleOnlineExecuteTurn(data);
    },
    onTurnScored(data) {
      handleOnlineTurnScored(data);
    },
    onEmote({ fromName, emoji }) {
      showEmotePopup(fromName || 'Rakip', emoji);
    },
    onRematchStatus({ readySides }) {
      const count = Array.isArray(readySides) ? readySides.length : 0;
      ui.btnRematch.textContent = online.rematchRequested
        ? `⏳ RÖVANŞ BEKLENİYOR (${count}/2)`
        : `🔄 RÖVANŞ İSTE (${count}/2)`;
    },
    onOpponentLeft({ message }) {
      if (!online.active) return;
      online.active = false;
      ui.onlineTimerBar.classList.add('hidden');
      ui.emoteBar.classList.add('hidden');
      ui.netHudPing.classList.add('hidden');
      finishMatch('🔌', 'RAKİP AYRILDI', `${state.userScore} - ${state.aiScore}`, message || 'Rakip bağlantıyı kesti.', false);
    },
  });
  return netClient;
}

function openOnlineLobby(prefillCode = '') {
  audio.unlock();
  ui.netNameInput.value = online.playerName;
  ui.lobbyMain.classList.remove('hidden');
  ui.lobbyWaiting.classList.add('hidden');
  showLobbyError('');
  if (prefillCode) {
    ui.joinCodeInput.value = prefillCode.toUpperCase().slice(0, 4);
  }
  ui.onlineLobby.classList.remove('hidden');
  const client = getNetClient();
  if (!client.isConnected()) {
    ui.netStatus.textContent = 'Bağlanıyor…';
    ui.netStatus.className = 'net-status-pill';
    client.connect();
  }
}

function closeOnlineLobby() {
  if (netClient && online.code && !online.active) {
    netClient.leaveRoom();
    online.code = '';
  }
  ui.onlineLobby.classList.add('hidden');
}

function handleOnlineMatchStart(data) {
  audio.unlock();
  audio.crowdAmbience(true);
  audio.setCrowdIntensity(0.4);

  settings.mode = 'online';
  online.active = true;
  online.code = data.code;
  online.side = data.side;
  online.players = data.players;
  online.rematchRequested = false;

  // Ev sahibinin ortamını uygula
  if (data.env) {
    const expMap = { day: 1.04, sunset: 1.12, night: 1.18 };
    renderer.toneMappingExposure = expMap[data.env.timeOfDay] || 1.08;
    world.setEnvironment?.({ timeOfDay: data.env.timeOfDay, weather: data.env.weather });
    audio.setWeatherAmbience?.(data.env.weather);
  }

  targetGroup.visible = false;
  keeper.group.visible = true;
  ui.targetHud.classList.add('hidden');
  ui.bracketBar.classList.add('hidden');
  ui.onlineLobby.classList.add('hidden');
  ui.menu.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.end.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.emoteBar.classList.remove('hidden');
  ui.netHudPing.classList.remove('hidden');

  startOnlineTurn(data.turn);
}

function applyOnlineKits() {
  if (!online.players) return;
  const hostP = online.players.host || { name: 'Ev Sahibi', kitIndex: 0, jerseyNumber: 10 };
  const guestP = online.players.guest || { name: 'Misafir', kitIndex: 1, jerseyNumber: 9 };
  const hostKit = TEAM_PRESETS[hostP.kitIndex % TEAM_PRESETS.length] || TEAM_PRESETS[0];
  let guestKit = TEAM_PRESETS[guestP.kitIndex % TEAM_PRESETS.length] || TEAM_PRESETS[1];
  if (guestKit.id === hostKit.id) {
    guestKit = TEAM_PRESETS[(hostP.kitIndex + 1) % TEAM_PRESETS.length];
  }

  const myKit = online.side === 'host' ? hostKit : guestKit;
  const oppKit = online.side === 'host' ? guestKit : hostKit;
  ui.swatchUser.style.setProperty('--c', hexToCss(myKit.primary));
  ui.swatchAi.style.setProperty('--c', hexToCss(oppKit.primary));

  const shooterP = online.shooterSide === 'host' ? hostP : guestP;
  const shooterKit = online.shooterSide === 'host' ? hostKit : guestKit;
  const keeperKit = online.shooterSide === 'host' ? guestKit : hostKit;

  shooter.setKit?.({
    primary: shooterKit.primary,
    secondary: shooterKit.secondary,
    shorts: shooterKit.shorts,
    number: shooterP.jerseyNumber || 10,
  });
  keeper.setKit?.({
    primary: keeperKit.primary,
    secondary: keeperKit.secondary,
    shorts: keeperKit.shorts,
    number: 1,
    gloveColor: keeperKit.gloveColor,
  });
}

function syncOnlineScores(scores, history, suddenDeath) {
  const mySide = online.side || 'host';
  const oppSide = mySide === 'host' ? 'guest' : 'host';
  state.userScore = (scores && scores[mySide]) || 0;
  state.aiScore = (scores && scores[oppSide]) || 0;
  state.userResults = (history && Array.isArray(history[mySide]) ? history[mySide] : []).map((v) => v === 'goal' || v === true);
  state.aiResults = (history && Array.isArray(history[oppSide]) ? history[oppSide] : []).map((v) => v === 'goal' || v === true);
  state.suddenDeath = !!suddenDeath;
}

function startOnlineTurn(turn) {
  if (!turn) return;
  online.turnId = turn.turnId;
  online.round = turn.round || 1;
  online.shooterSide = turn.shooterSide;
  online.deadlineMs = turn.deadlineMs || Date.now() + 15000;
  online.picked = false;
  online.opponentReady = false;
  online.opponentKeeperX = 0;
  online.execDive = null;
  online.execDiveTriggered = false;
  online.execDiveTimer = 0;
  online.pendingNextTurn = null;
  online.pendingMatchOver = null;
  online.waitingForScore = false;

  syncOnlineScores(turn.scores, turn.history, turn.suddenDeath);
  state.userRole = turn.shooterSide === online.side ? 'shooter' : 'keeper';

  // Deterministik rüzgar (sunucudan)
  const wx = Number(turn.windX) || 0;
  windVec.set(wx, 0, 0);
  world.setWind?.(windVec);
  ball.setEnvironment({ wind: windVec, weather: settings.weather });
  const kmh = Math.round(Math.abs(wx) * 3.6);
  ui.windArrow.style.display = 'inline-block';
  ui.windArrow.style.transform = `rotate(${wx >= 0 ? 0 : 180}deg)`;
  ui.windText.textContent = kmh < 2 ? 'Sakin' : `${kmh} km/s`;

  // Kaleciyken Kaleci Gözü öner, şutörken seçili kameraya dön
  if (state.userRole === 'keeper') {
    cameraRig.setMode('keeper');
  } else {
    cameraRig.setMode(settings.cameraId === 'keeper' ? 'broadcast' : settings.cameraId);
  }

  prepareTurn();
  applyOnlineKits();

  ui.onlineTimerBar.classList.remove('hidden');
  ui.onlineStatusText.textContent = state.userRole === 'shooter' ? 'Şutunu ayarla!' : 'Atlayış yönünü seç!';
  ui.turnInfo.textContent = state.userRole === 'shooter'
    ? `ONLINE — PENALTI SIRASI: SEN`
    : `ONLINE — KALEDESİN!`;
  if (state.userRole === 'keeper') {
    ui.hint.innerHTML = 'Fareyle çizgide kıpırdan · <kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd> (+ <kbd>W</kbd> yüksek) veya butonlarla yön kilitle';
  } else {
    ui.hint.innerHTML = 'Nişan al + <kbd>1-4</kbd> şut tipi + <kbd>Sol Tık</kbd>/<kbd>Boşluk</kbd> güç → şutunu kilitle!';
  }
  updateScoreboard();
}

function handleOnlineExecuteTurn({ turnId, shot, dive, windX }) {
  if (!online.active || turnId !== online.turnId) return;
  if (state.phase !== 'aim') return;

  ui.onlineTimerBar.classList.add('hidden');
  ui.reticle.classList.add('hidden');
  ui.power.classList.add('hidden');
  ui.shotBar.classList.add('hidden');
  ui.keeperPad.classList.add('hidden');

  const wx = Number(windX) || 0;
  windVec.set(wx, 0, 0);
  world.setWind?.(windVec);
  ball.setEnvironment({ wind: windVec, weather: settings.weather });

  const s = shot || { aimX: 0, aimY: 1.1, power: 0.65, curl: 0, shotType: 'normal', stutter: false };
  online.execDive = dive || { dir: 'center', height: 'low' };
  online.execDiveTriggered = false;
  online.execDiveTimer = 0;

  state.lockedShot = {
    targetX: Number(s.aimX) || 0,
    targetY: Number(s.aimY) || 1.1,
    power: Number(s.power) || 0.65,
    curl: Number(s.curl) || 0,
    shotType: s.shotType || 'normal',
    timedFinish: null,
    goldTrail: false,
  };

  state.phase = 'runup';
  state.runupDuration = state.lockedShot.shotType === 'panenka' ? 1.25 : 1.18;
  state.runupElapsed = 0;
  audio.setCrowdIntensity(0.65);

  shooter.runUp(
    state.runupDuration,
    () => {
      if (state.phase !== 'runup') return;
      executeKick(state.lockedShot);
    },
    { shotType: state.lockedShot.shotType, stutter: !!s.stutter }
  );
}

function handleOnlineTurnScored({ turnId, scores, history, nextTurn, matchOver, winnerSide }) {
  if (!online.active || turnId !== online.turnId) return;
  syncOnlineScores(scores, history, nextTurn ? nextTurn.suddenDeath : state.suddenDeath);
  updateScoreboard();

  if (matchOver) {
    online.pendingMatchOver = { winnerSide, scores };
  } else {
    online.pendingNextTurn = nextTurn;
  }

  // Eğer client zaten tur geçişini bekliyorsa hemen uygula
  if (online.waitingForScore) {
    online.waitingForScore = false;
    advanceOnlineAfterTurn();
  }
}

function advanceOnlineAfterTurn() {
  if (!online.active) return;
  if (online.pendingMatchOver) {
    const { winnerSide } = online.pendingMatchOver;
    const won = winnerSide === online.side;
    const oppSide = online.side === 'host' ? 'guest' : 'host';
    const oppName = (online.players && online.players[oppSide] && online.players[oppSide].name) || 'Rakip';
    online.rematchRequested = false;
    ui.btnRematch.textContent = '🔄 RÖVANŞ İSTE';
    if (won) {
      world.triggerGoalEffects?.(new THREE.Vector3(0, 1.5, 0));
      audio.pyroPop?.();
      audio.speak?.('champion');
    }
    finishMatch(
      won ? '🏆' : '😔',
      won ? 'ONLINE MAÇI KAZANDIN!' : 'MAÇI KAYBETTİN',
      `${state.userScore} - ${state.aiScore}`,
      `${oppName} ile oynanan Online 1v1 düello sona erdi!`,
      false
    );
    return;
  }
  if (online.pendingNextTurn) {
    const next = online.pendingNextTurn;
    online.pendingNextTurn = null;
    startOnlineTurn(next);
  } else {
    online.waitingForScore = true;
  }
}

const keys = new Set();
const raycaster = new THREE.Raycaster();
const goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const tmpVec = new THREE.Vector3();
const tmpFwd = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

// ============ ORTAM, FORMA, RÜZGAR ============
function applyEnvironment() {
  const expMap = { day: 1.04, sunset: 1.12, night: 1.18 };
  renderer.toneMappingExposure = expMap[settings.timeOfDay] || 1.08;
  world.setEnvironment?.({ timeOfDay: settings.timeOfDay, weather: settings.weather });
  audio.setWeatherAmbience?.(settings.weather);
}

function rollWind() {
  const maxW = settings.weather === 'rain' ? 5.5 : settings.weather === 'snow' ? 4.2 : 3.2;
  const wx = (Math.random() * 2 - 1) * maxW;
  const wz = (Math.random() * 2 - 1) * (maxW * 0.45);
  windVec.set(wx, 0, wz);
  world.setWind?.(windVec);
  ball.setEnvironment({ wind: windVec, weather: settings.weather });

  const kmh = Math.round(Math.hypot(wx, wz) * 3.6);
  const angleDeg = Math.round((Math.atan2(wz, wx) * 180) / Math.PI);
  ui.windArrow.style.display = 'inline-block';
  ui.windArrow.style.transform = `rotate(${angleDeg}deg)`;
  ui.windText.textContent = kmh < 2 ? 'Sakin' : `${kmh} km/s`;
}

function getUserTeam() {
  return TEAM_PRESETS.find((t) => t.id === settings.teamId) || TEAM_PRESETS[0];
}

function applyTeamKits() {
  const userTeam = getUserTeam();
  let rivalKit = { primary: 0x1565c0, secondary: 0x93c5fd, shorts: 0x0f172a, number: 9, gloveColor: 0x38bdf8 };
  if (settings.mode === 'tournament') {
    rivalKit = TOURNAMENT_STAGES[state.tournamentStage].kit;
  }

  ui.swatchUser.style.setProperty('--c', hexToCss(userTeam.primary));
  ui.swatchAi.style.setProperty('--c', hexToCss(rivalKit.primary));

  const userIsShooter = state.userRole === 'shooter' || settings.mode === 'local2p' || settings.mode === 'targets';
  if (userIsShooter) {
    shooter.setKit?.({
      primary: userTeam.primary,
      secondary: userTeam.secondary,
      shorts: userTeam.shorts,
      number: settings.jerseyNumber,
    });
    keeper.setKit?.({
      primary: rivalKit.primary,
      secondary: rivalKit.secondary,
      shorts: rivalKit.shorts,
      number: 1,
      gloveColor: rivalKit.gloveColor,
    });
  } else {
    shooter.setKit?.({
      primary: rivalKit.primary,
      secondary: rivalKit.secondary,
      shorts: rivalKit.shorts,
      number: rivalKit.number || 9,
    });
    keeper.setKit?.({
      primary: userTeam.primary,
      secondary: userTeam.secondary,
      shorts: userTeam.shorts,
      number: 1,
      gloveColor: userTeam.gloveColor,
    });
  }
}

// ============ YARDIMCI UI FONKSİYONLARI ============
function showToast(msg, duration = 1.4) {
  ui.toast.textContent = msg;
  ui.toast.classList.remove('hidden');
  state.toastTimer = duration;
}

function showShotSpeed(kmh) {
  ui.speedVal.textContent = String(kmh);
  ui.speedBadge.classList.remove('hidden');
  state.speedTimer = 3.2;
}

function getCameraRightX() {
  camera.getWorldDirection(tmpFwd);
  tmpRight.crossVectors(tmpFwd, worldUp);
  return tmpRight.x >= 0 ? 1 : -1;
}

function screenXToWorldDir(sx) {
  if (sx === 0) return 'center';
  const worldSign = sx * getCameraRightX();
  return worldSign < 0 ? 'left' : 'right';
}

function updateKeeperPadLabels() {
  const btns = ui.keeperPad.querySelectorAll('.kp-btn');
  btns.forEach((btn) => {
    const sx = Number(btn.dataset.sx);
    const h = btn.dataset.h;
    const isHigh = h === 'high';
    const worldDir = screenXToWorldDir(sx);

    let label;
    if (worldDir === 'center') {
      label = isHigh ? '↑ ORTA ÜST' : '● ORTA';
    } else {
      const keeperSide = worldDir === 'right' ? 'SOL' : 'SAĞ';
      const arrow = sx < 0 ? (isHigh ? '↖' : '←') : (isHigh ? '↗' : '→');
      const hTag = isHigh ? ' ÜST' : '';
      label = sx < 0
        ? `<span class="arr">${arrow}</span>${keeperSide}${hTag}`
        : `${keeperSide}${hTag}<span class="arr">${arrow}</span>`;
    }
    btn.innerHTML = label;
  });
}

function updateAudioButtons() {
  ui.btnMute.textContent = settings.muted ? '🔇' : '🔊';
  ui.btnMute.title = settings.muted ? 'Sesi aç (M)' : 'Sesi kapat (M)';
  ui.btnAnnouncer.classList.toggle('off', !settings.announcer);
  ui.btnAnnouncer.title = settings.announcer ? 'Spiker: Açık' : 'Spiker: Kapalı';
  ui.btnMenuAnnouncer.textContent = settings.announcer ? '🎙️ Spiker: Açık' : '🎙️ Spiker: Kapalı';
}

function setCameraMode(id, persist = true) {
  if (!CAMERA_MODES.some((m) => m.id === id)) return;
  settings.cameraId = id;
  cameraRig.setMode(id);
  if (persist) localStorage.setItem(STORAGE_CAM, id);
  syncCameraUI();
}

function cycleCamera() {
  cameraRig.next();
  settings.cameraId = cameraRig.getMode();
  localStorage.setItem(STORAGE_CAM, settings.cameraId);
  syncCameraUI();
  const modeObj = CAMERA_MODES.find((m) => m.id === settings.cameraId);
  if (modeObj && state.phase !== 'menu') {
    showToast(`Kamera: ${modeObj.label}`, 1.1);
  }
}

function syncCameraUI() {
  ui.camButtons.querySelectorAll('.cam-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.cam === settings.cameraId);
  });
  ui.camChips.querySelectorAll('.chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.cam === settings.cameraId);
  });
}

function buildStaticUI() {
  // Kameralar
  ui.camButtons.innerHTML = '';
  ui.camChips.innerHTML = '';
  CAMERA_MODES.forEach((m, idx) => {
    const hudBtn = document.createElement('button');
    hudBtn.className = 'cam-btn';
    hudBtn.dataset.cam = m.id;
    hudBtn.innerHTML = `${m.label}${idx === 0 ? '<span class="key">[C]</span>' : ''}`;
    hudBtn.addEventListener('click', () => {
      audio.unlock();
      setCameraMode(m.id);
    });
    ui.camButtons.appendChild(hudBtn);

    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.cam = m.id;
    chip.textContent = m.label;
    chip.addEventListener('click', () => {
      audio.unlock();
      setCameraMode(m.id);
    });
    ui.camChips.appendChild(chip);
  });

  // Şut tipleri
  ui.shotBar.innerHTML = '';
  SHOT_TYPES.forEach((st) => {
    const btn = document.createElement('button');
    btn.className = 'shot-pill';
    btn.dataset.shot = st.id;
    btn.title = st.desc;
    btn.innerHTML = `<span class="sk">${st.key}</span>${st.label}`;
    btn.addEventListener('click', () => {
      audio.unlock();
      setShotType(st.id);
    });
    ui.shotBar.appendChild(btn);
  });

  // Takım renkleri
  ui.teamSwatches.innerHTML = '';
  TEAM_PRESETS.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'swatch-btn';
    btn.dataset.team = t.id;
    btn.title = t.name;
    btn.style.setProperty('--p', hexToCss(t.primary));
    btn.style.setProperty('--s', hexToCss(t.secondary));
    btn.addEventListener('click', () => {
      settings.teamId = t.id;
      saveKit();
      applyTeamKits();
      syncMenuUI();
    });
    ui.teamSwatches.appendChild(btn);
  });

  // Top tasarımları
  ui.ballSkinChips.innerHTML = '';
  BALL_SKINS.forEach((s) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.skin = s.id;
    btn.textContent = s.label;
    btn.addEventListener('click', () => {
      settings.ballSkin = s.id;
      saveKit();
      ball.setSkin(s.id);
      syncMenuUI();
    });
    ui.ballSkinChips.appendChild(btn);
  });

  syncCameraUI();
}

function setShotType(id) {
  if (!SHOT_TYPES.some((s) => s.id === id)) return;
  state.shotType = id;
  ui.shotBar.querySelectorAll('.shot-pill').forEach((b) => {
    b.classList.toggle('active', b.dataset.shot === id);
  });
}

function syncMenuUI() {
  ui.modeGrid.querySelectorAll('.mode-card').forEach((c) => {
    c.classList.toggle('active', c.dataset.mode === settings.mode);
  });
  ui.diffSeg.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.diff === settings.difficulty);
  });
  ui.diffNote.textContent = getDifficulty(settings.difficulty).note;
  ui.timeSeg.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.time === settings.timeOfDay);
  });
  ui.weatherSeg.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.weather === settings.weather);
  });
  ui.teamSwatches.querySelectorAll('.swatch-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.team === settings.teamId);
  });
  ui.ballSkinChips.querySelectorAll('.chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.skin === settings.ballSkin);
  });
  ui.jerseyInput.value = String(settings.jerseyNumber);
  updateAudioButtons();
}

function openStatsModal() {
  const shotPct = stats.totalShots > 0 ? Math.round((stats.totalGoals / stats.totalShots) * 100) : 0;
  const savePct = stats.totalFaced > 0 ? Math.round((stats.totalSaves / stats.totalFaced) * 100) : 0;
  const cards = [
    { val: stats.totalGoals, lbl: 'TOPLAM GOL' },
    { val: `%${shotPct}`, lbl: 'GOL İSABETİ' },
    { val: `%${savePct}`, lbl: `KURTARIŞ (${stats.totalSaves}/${stats.totalFaced})` },
    { val: stats.bestStreak, lbl: 'EN UZUN GOL SERİSİ' },
    { val: `${stats.maxSpeedKmh} km/s`, lbl: 'EN SERT ŞUT' },
    { val: stats.trophies, lbl: 'KAZANILAN KUPA 🏆' },
    { val: stats.bestTargetScore, lbl: 'HEDEF VURMA REKORU' },
    { val: stats.totalShots, lbl: 'TOPLAM PENALTI' },
  ];
  ui.statsGrid.innerHTML = cards
    .map((c) => `<div class="stat-box"><div class="stat-val">${c.val}</div><div class="stat-lbl">${c.lbl}</div></div>`)
    .join('');
  ui.statsModal.classList.remove('hidden');
}

function renderDots(el, results, totalSlots, isNext) {
  el.innerHTML = '';
  const count = Math.max(totalSlots, results.length + (isNext ? 1 : 0));
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (i < results.length) {
      dot.classList.add(results[i] ? 'goal' : 'miss');
      dot.textContent = results[i] ? '✓' : '✗';
    } else if (isNext && i === results.length) {
      dot.classList.add('next');
    }
    el.appendChild(dot);
  }
}

function updateBracketUI() {
  if (settings.mode !== 'tournament') {
    ui.bracketBar.classList.add('hidden');
    return;
  }
  ui.bracketBar.classList.remove('hidden');
  ui.bracketBar.querySelectorAll('.br-step').forEach((el) => {
    const s = Number(el.dataset.stage);
    el.classList.toggle('done', s < state.tournamentStage);
    el.classList.toggle('current', s === state.tournamentStage);
  });
}

function updateScoreboard() {
  const diff = getDifficulty(state.activeDifficulty);
  ui.sbDiff.textContent = settings.mode === 'online'
    ? `ODA ${online.code || '----'}`
    : settings.mode === 'local2p'
      ? '2P'
      : diff.label.toUpperCase();

  const userNameEl = ui.rowUser.querySelector('.sb-name');
  const aiNameEl = ui.rowAi.querySelector('.sb-name');

  if (settings.mode === 'online') {
    const mySide = online.side || 'host';
    const oppSide = mySide === 'host' ? 'guest' : 'host';
    const myName = (online.players && online.players[mySide]?.name) || online.playerName || 'SEN';
    const oppName = (online.players && online.players[oppSide]?.name) || 'RAKİP';
    ui.sbMode.textContent = state.suddenDeath ? 'ANİ ÖLÜM' : 'ONLINE 1v1';
    userNameEl.textContent = myName.slice(0, 10).toUpperCase();
    aiNameEl.textContent = oppName.slice(0, 10).toUpperCase();
    ui.rowAi.classList.remove('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    ui.scoreAi.textContent = String(state.aiScore);
    const slots = state.suddenDeath ? Math.max(state.userResults.length, state.aiResults.length, 5) : 5;
    renderDots(ui.dotsUser, state.userResults, slots, state.userRole === 'shooter' && state.phase !== 'ended');
    renderDots(ui.dotsAi, state.aiResults, slots, state.userRole === 'keeper' && state.phase !== 'ended');
    ui.sbFoot.textContent = state.suddenDeath
      ? `ANİ ÖLÜM — ${online.round}. TUR`
      : `${Math.min(5, online.round)}. TUR / 5`;
    updateBracketUI();
    return;
  }

  if (settings.mode === 'shooter') {
    ui.sbMode.textContent = 'PENALTICI';
    userNameEl.textContent = 'GOL';
    ui.rowAi.classList.add('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    renderDots(ui.dotsUser, state.userResults, 5, state.phase !== 'ended');
    const kickNo = Math.min(5, state.userResults.length + (state.phase === 'result' ? 0 : 1));
    ui.sbFoot.textContent = `${kickNo}. PENALTI / 5`;
  } else if (settings.mode === 'keeper') {
    ui.sbMode.textContent = 'KALECİ';
    userNameEl.textContent = 'KURTARIŞ';
    ui.rowAi.classList.add('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    renderDots(ui.dotsUser, state.userResults, 5, state.phase !== 'ended');
    const kickNo = Math.min(5, state.userResults.length + (state.phase === 'result' ? 0 : 1));
    ui.sbFoot.textContent = `${kickNo}. ŞUT / 5`;
  } else if (settings.mode === 'targets') {
    ui.sbMode.textContent = 'HEDEF VURMA';
    userNameEl.textContent = 'İSABET';
    ui.rowAi.classList.add('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    renderDots(ui.dotsUser, state.userResults, 10, state.phase !== 'ended');
    ui.sbFoot.textContent = `KALAN ATIŞ: ${state.targetShotsLeft} / 10`;
    ui.targetScore.textContent = String(state.targetScore);
    ui.targetCombo.textContent = `KOMBO x${Math.max(1, state.targetCombo)}`;
  } else if (settings.mode === 'local2p') {
    ui.sbMode.textContent = '2 KİŞİLİK';
    userNameEl.textContent = 'P1 ŞUT';
    aiNameEl.textContent = 'P2 KALE';
    ui.rowAi.classList.remove('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    ui.scoreAi.textContent = String(state.aiScore);
    renderDots(ui.dotsUser, state.userResults, 5, state.phase !== 'ended');
    renderDots(ui.dotsAi, state.aiResults, 5, false);
    const kickNo = Math.min(5, state.userResults.length + (state.phase === 'result' ? 0 : 1));
    ui.sbFoot.textContent = `${kickNo}. PENALTI / 5`;
  } else {
    const isTourn = settings.mode === 'tournament';
    const stageInfo = TOURNAMENT_STAGES[state.tournamentStage];
    ui.sbMode.textContent = state.suddenDeath
      ? 'ANİ ÖLÜM'
      : isTourn
        ? stageInfo.stage.toUpperCase()
        : 'SERİ PENALTI';
    userNameEl.textContent = 'SEN';
    aiNameEl.textContent = isTourn ? stageInfo.opponent.slice(0, 10).toUpperCase() : 'RAKİP';
    ui.rowAi.classList.remove('hidden');
    ui.scoreUser.textContent = String(state.userScore);
    ui.scoreAi.textContent = String(state.aiScore);
    const slots = state.suddenDeath ? Math.max(state.userResults.length, state.aiResults.length, 5) : 5;
    renderDots(ui.dotsUser, state.userResults, slots, state.userRole === 'shooter' && state.phase !== 'ended');
    renderDots(ui.dotsAi, state.aiResults, slots, state.userRole === 'keeper' && state.phase !== 'ended');
    const roundNum = Math.floor((state.userResults.length + state.aiResults.length) / 2) + 1;
    ui.sbFoot.textContent = state.suddenDeath
      ? `ANİ ÖLÜM — ${roundNum}. TUR`
      : `${Math.min(5, roundNum)}. TUR / 5`;
  }
  updateBracketUI();
}

function updateCurlUI() {
  if (Math.abs(state.curl) < 0.08) ui.pwCurl.textContent = 'FALSO: YOK';
  else if (state.curl < 0) ui.pwCurl.textContent = `FALSO: SOL ${Math.round(Math.abs(state.curl) * 100)}%`;
  else ui.pwCurl.textContent = `FALSO: SAĞ ${Math.round(state.curl * 100)}%`;
}

function updatePowerUI() {
  const pct = Math.round(state.power * 100);
  ui.pwFill.style.height = `${pct}%`;
  ui.pwMarker.style.bottom = `${pct}%`;
  ui.reticle.classList.toggle('charging', state.charging);
}

function updateReticleScreenPosition() {
  // 2 Kişilik modda güç dolarken nişangahı gizle (P2 kopya çekemesin!)
  const hideFor2P = settings.mode === 'local2p' && state.charging;
  if (state.phase !== 'aim' || state.userRole !== 'shooter' || hideFor2P) {
    ui.reticle.classList.add('hidden');
    return;
  }
  tmpVec.set(state.aimX, state.aimY, 0);
  tmpVec.project(camera);
  if (tmpVec.z > 1) {
    ui.reticle.classList.add('hidden');
    return;
  }
  const sx = (tmpVec.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-tmpVec.y * 0.5 + 0.5) * window.innerHeight;
  ui.reticle.style.left = `${sx}px`;
  ui.reticle.style.top = `${sy}px`;
  ui.reticle.classList.remove('hidden');
}

function showBanner(type, text, sub = '') {
  ui.banner.className = type;
  ui.bannerText.textContent = text;
  ui.bannerSub.textContent = sub;
  ui.banner.classList.remove('hidden');
}

function hideBanner() {
  ui.banner.classList.add('hidden');
}

// ============ MAÇ & TUR AKIŞI ============
function startMatch(keepTournamentStage = false) {
  audio.unlock();
  audio.crowdAmbience(true);
  audio.setCrowdIntensity(0.35);
  audio.setTension?.(0.1);
  applyEnvironment();

  state.paused = false;
  state.roundIndex = 0;
  state.suddenDeath = false;
  state.userResults = [];
  state.aiResults = [];
  state.userScore = 0;
  state.aiScore = 0;
  state.targetScore = 0;
  state.targetCombo = 0;
  state.targetShotsLeft = 10;

  if (settings.mode === 'tournament') {
    if (!keepTournamentStage) state.tournamentStage = 0;
    state.activeDifficulty = TOURNAMENT_STAGES[state.tournamentStage].difficulty;
  } else {
    state.activeDifficulty = settings.difficulty;
  }

  targetGroup.visible = settings.mode === 'targets';
  keeper.group.visible = settings.mode !== 'targets';
  ui.targetHud.classList.toggle('hidden', settings.mode !== 'targets');
  if (settings.mode === 'targets') resetTargets();

  ui.menu.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.end.classList.add('hidden');
  ui.statsModal.classList.add('hidden');
  ui.hud.classList.remove('hidden');

  state.userRole = settings.mode === 'keeper' ? 'keeper' : 'shooter';
  rollWind();
  prepareTurn();
}

function prepareTurn() {
  state.phase = 'aim';
  state.charging = false;
  state.power = 0;
  state.powerDir = 1;
  state.aimX = 0;
  state.aimY = 1.15;
  state.curl = 0;
  state.lockedShot = null;
  state.stuttered = false;
  state.timedFinish = null;
  state.timedLocked = false;
  state.aiKeeperPlan = null;
  state.aiKeeperDived = false;
  state.aiKeeperTimer = 0;
  state.aiShotPlan = null;
  state.aiShotReadyTimer = 0.78;
  state.runupElapsed = 0;
  state.runupFakeDone = false;
  state.runupPauseTimer = 0;
  state.userKeeperDived = false;
  state.userKeeperDir = null;
  state.userKeeperHeight = 'low';
  state.userDiveProgress = 0;
  state.kickResolved = false;
  state.kickOutcome = null;
  state.resultTimer = 0;
  state.slowMoTimer = 0;
  state.slowMoTriggered = false;
  state.timeScale = 1;
  state.replayFrames.length = 0;
  state.shouldReplay = false;

  ui.slowmo.classList.add('hidden');
  ui.replayHud.classList.add('hidden');
  ui.timedBar.classList.add('hidden');
  hideBanner();

  applyTeamKits();
  ball.reset(PENALTY_SPOT);
  shooter.reset();
  keeper.reset();
  keeper.setReady();
  world.setCrowdExcitement(0.2);
  audio.setCrowdIntensity(0.35);

  // Kritik penaltılarda gerilim sesi (kalp atışı + davul)
  const highTension = state.suddenDeath || (settings.mode === 'tournament' && state.tournamentStage === 2);
  audio.setTension?.(highTension ? 0.85 : 0.2);

  ui.keeperPad.querySelectorAll('.kp-btn').forEach((b) => {
    b.classList.remove('chosen');
    b.disabled = false;
  });

  if (settings.mode === 'local2p') {
    ui.turnInfo.textContent = '2 KİŞİLİK — P1 ŞUT vs P2 KALECİ';
    ui.hint.innerHTML = 'P1: <kbd>Fare</kbd>+<kbd>Sol Tık</kbd>/<kbd>Boşluk</kbd> (şutta nişangah gizlenir) · P2 Kaleci: <kbd>J</kbd> sol · <kbd>K</kbd> orta · <kbd>L</kbd> sağ · <kbd>I</kbd> yüksek';
    ui.power.classList.remove('hidden');
    ui.shotBar.classList.remove('hidden');
    ui.keeperPad.classList.add('hidden');
    setShotType(state.shotType);
    updatePowerUI();
    updateCurlUI();
  } else if (state.userRole === 'shooter') {
    ui.turnInfo.textContent = settings.mode === 'targets' ? 'HEDEF VURMA — 90\'I HEDEFLE!' : 'PENALTI SIRASI: SEN';
    ui.hint.innerHTML = '<kbd>Fare</kbd>/<kbd>Oklar</kbd> nişan · <kbd>Sol Tık</kbd>/<kbd>Boşluk</kbd> güç · <kbd>1-4</kbd> şut tipi · <kbd>Q</kbd>/<kbd>E</kbd> falso';
    ui.power.classList.remove('hidden');
    ui.shotBar.classList.remove('hidden');
    ui.keeperPad.classList.add('hidden');
    setShotType(state.shotType);
    updatePowerUI();
    updateCurlUI();
  } else {
    ui.turnInfo.textContent = 'KALEDESİN — ŞUTU KURTAR!';
    ui.hint.innerHTML = '<kbd>A</kbd>/<kbd>←</kbd> sol · <kbd>S</kbd>/<kbd>↓</kbd> orta · <kbd>D</kbd>/<kbd>→</kbd> sağ · <kbd>W</kbd>/<kbd>↑</kbd> yüksek atla';
    ui.power.classList.add('hidden');
    ui.shotBar.classList.add('hidden');
    ui.keeperPad.classList.remove('hidden');
    ui.reticle.classList.add('hidden');
    updateKeeperPadLabels();
    state.aiShotPlan = planAiShot(state.activeDifficulty, GOAL);
  }

  updateScoreboard();
  audio.whistle();
}

function triggerUserShot() {
  if (state.phase !== 'aim' || state.userRole !== 'shooter') return;
  if (online.active && online.picked) return;
  state.charging = false;
  const p = Math.max(0.18, state.power);

  // Online 1v1: şutu sunucuya kilitle, rakip kaleciyi bekle
  if (online.active) {
    online.picked = true;
    ui.reticle.classList.add('hidden');
    ui.power.classList.add('hidden');
    ui.shotBar.classList.add('hidden');
    ui.onlineStatusText.textContent = online.opponentReady ? 'Başlıyor…' : '⏳ Kaleci bekleniyor…';
    getNetClient().commitShot({
      turnId: online.turnId,
      aimX: state.aimX,
      aimY: state.aimY,
      power: p,
      curl: state.curl,
      shotType: state.shotType,
      timedQuality: 'none',
      stutter: false,
    });
    return;
  }

  state.lockedShot = {
    targetX: state.aimX,
    targetY: state.aimY,
    power: p,
    curl: state.curl,
    shotType: state.shotType,
  };

  if (settings.mode !== 'local2p' && settings.mode !== 'targets') {
    state.aiKeeperPlan = decideAiKeeperDive(state.activeDifficulty, state.lockedShot, { stuttered: false });
  } else {
    state.aiKeeperPlan = null;
  }
  state.aiKeeperDived = false;
  state.aiKeeperTimer = 0;
  state.stuttered = false;
  state.timedFinish = null;
  state.timedLocked = false;

  state.phase = 'runup';
  state.runupDuration = state.shotType === 'panenka' ? 1.25 : 1.18;
  state.runupElapsed = 0;
  ui.reticle.classList.add('hidden');
  ui.shotBar.classList.add('hidden');
  ui.timedBar.classList.remove('hidden');
  ui.timedCursor.style.left = '0%';
  audio.setCrowdIntensity(0.62);

  shooter.runUp(
    state.runupDuration,
    () => {
      if (state.phase !== 'runup') return;
      ui.timedBar.classList.add('hidden');
      const shot = {
        ...state.lockedShot,
        timedFinish: state.timedFinish,
        goldTrail: state.timedFinish === 'perfect',
      };
      executeKick(shot);
    },
    { shotType: state.shotType, stutter: false }
  );
}

function triggerPlayerStutter() {
  if (state.phase !== 'runup' || state.userRole !== 'shooter' || state.stuttered) return;
  if (state.runupElapsed / state.runupDuration > 0.72) return;
  state.stuttered = true;
  state.runupPauseTimer = 0.24;
  shooter.triggerStutter?.();
  audio.speak?.('stutter');
  showToast('ŞAŞIRTMA!', 0.9);

  // YZ kaleci şaşırtmaya kanıp erken atlayabilir
  if (settings.mode !== 'local2p' && settings.mode !== 'targets' && state.lockedShot) {
    state.aiKeeperPlan = decideAiKeeperDive(state.activeDifficulty, state.lockedShot, { stuttered: true });
    if (state.aiKeeperPlan.fooledByStutter && !state.aiKeeperDived) {
      state.aiKeeperDived = true;
      keeper.dive(state.aiKeeperPlan.dir, state.aiKeeperPlan.height, state.aiKeeperPlan.duration);
    }
  }
}

function triggerTimedFinishAttempt() {
  if (state.phase !== 'runup' || state.userRole !== 'shooter' || state.timedLocked) return;
  const prog = state.runupElapsed / Math.max(0.1, state.runupDuration);
  if (prog < 0.25) return; // Çok erken basmayı yoksay
  state.timedLocked = true;
  if (prog >= 0.70 && prog <= 0.90) {
    state.timedFinish = 'perfect';
    showToast('⚡ MÜKEMMEL ZAMANLAMA! +10% HIZ', 1.2);
  } else if (prog >= 0.55 && prog <= 0.96) {
    state.timedFinish = 'good';
    showToast('İYİ ZAMANLAMA!', 0.9);
  } else {
    state.timedFinish = 'bad';
    showToast('KÖTÜ ZAMANLAMA!', 0.9);
  }
}

function startAiRunup() {
  state.phase = 'runup';
  const cfg = getDifficulty(state.activeDifficulty);
  state.runupDuration = cfg.id === 'hard' ? 1.2 : cfg.id === 'easy' ? 1.55 : 1.35;
  state.runupElapsed = 0;
  state.runupFakeDone = false;
  state.runupPauseTimer = 0;
  audio.setCrowdIntensity(0.65);

  shooter.runUp(
    state.runupDuration,
    () => {
      if (state.phase !== 'runup') return;
      let plan = state.aiShotPlan;
      if (state.userKeeperDived && state.userKeeperDir && state.userDiveProgress < cfg.earlyDiveThreshold) {
        plan = adaptAiShotForEarlyDive(plan, state.activeDifficulty, state.userKeeperDir, GOAL);
        if (plan.readEarlyDive) showToast('Rakip hamleni gördü!', 1.1);
      }
      executeKick(plan);
    },
    { shotType: state.aiShotPlan?.shotType || 'normal', stutter: !!state.aiShotPlan?.hasFake }
  );
}

function executeKick(shot) {
  state.phase = 'flight';
  const kickInfo = ball.kick(shot);
  audio.kick(shot.power);
  ui.power.classList.add('hidden');
  ui.timedBar.classList.add('hidden');

  // Çim/su sıçraması + kamera sarsıntısı + hız göstergesi
  world.spawnTurfSpray?.(PENALTY_SPOT.clone(), new THREE.Vector3(0, 2.2, -4.5));
  if (shot.power > 0.72 || shot.timedFinish === 'perfect') {
    cameraRig.shake?.(shot.timedFinish === 'perfect' ? 0.38 : 0.22);
  }
  if (kickInfo && kickInfo.speedKmh) {
    showShotSpeed(kickInfo.speedKmh);
    if (state.userRole === 'shooter' && kickInfo.speedKmh > stats.maxSpeedKmh) {
      stats.maxSpeedKmh = kickInfo.speedKmh;
      saveStats();
    }
  }
}

function triggerKeeperDiveInput(screenX, height, isPlayer2 = false) {
  if (!isPlayer2 && state.userRole !== 'keeper') return;
  if (isPlayer2 && settings.mode !== 'local2p') return;
  if (state.userKeeperDived) return;
  if (state.phase !== 'aim' && state.phase !== 'runup' && state.phase !== 'flight') return;
  if (state.phase === 'flight' && ball.position.z < 1.2) return;

  const worldDir = screenXToWorldDir(screenX);

  // Online 1v1: atlayış yönünü sunucuya kilitle, şutörü bekle
  if (online.active && !isPlayer2) {
    if (online.picked || state.phase !== 'aim') return;
    online.picked = true;
    state.userKeeperDived = true;
    state.userKeeperDir = worldDir;
    state.userKeeperHeight = height;
    ui.keeperPad.querySelectorAll('.kp-btn').forEach((b) => {
      const match = Number(b.dataset.sx) === screenX && b.dataset.h === height;
      b.classList.toggle('chosen', match);
      b.disabled = true;
    });
    ui.onlineStatusText.textContent = online.opponentReady ? 'Başlıyor…' : '⏳ Penaltıcı bekleniyor…';
    getNetClient().commitDive({
      turnId: online.turnId,
      dir: worldDir,
      height,
    });
    return;
  }
  const cfg = getDifficulty(state.activeDifficulty);

  state.userKeeperDived = true;
  state.userKeeperDir = worldDir;
  state.userKeeperHeight = height;
  state.userDiveProgress = state.phase === 'aim'
    ? 0
    : state.phase === 'runup'
      ? state.runupElapsed / Math.max(0.1, state.runupDuration)
      : 1;

  keeper.dive(worldDir, height, isPlayer2 ? 0.52 : cfg.userDiveDuration);

  if (!isPlayer2) {
    ui.keeperPad.querySelectorAll('.kp-btn').forEach((b) => {
      const match = Number(b.dataset.sx) === screenX && b.dataset.h === height;
      b.classList.toggle('chosen', match);
      b.disabled = true;
    });
    if (state.phase === 'aim' || (state.phase === 'runup' && state.userDiveProgress < cfg.earlyDiveThreshold)) {
      showToast('Çok erken atladın!', 1.0);
    }
  }
}

function handleTargetHitCheck(x0, y0) {
  let hitTarget = null;
  let bestDist = Infinity;
  for (const t of targetItems) {
    if (t.hit) continue;
    const d = Math.hypot(x0 - t.x, y0 - t.y);
    if (d <= t.r + ball.radius * 1.3 && d < bestDist) {
      bestDist = d;
      hitTarget = t;
    }
  }

  state.targetShotsLeft = Math.max(0, state.targetShotsLeft - 1);

  if (hitTarget) {
    hitTarget.hit = true;
    hitTarget.burstTimer = 0.45;
    state.targetCombo++;
    const earned = hitTarget.pts * state.targetCombo;
    state.targetScore += earned;
    state.userScore++;
    state.userResults.push(true);

    world.triggerGoalEffects?.(new THREE.Vector3(x0, y0, 0));
    audio.pyroPop?.();
    audio.goalCheer();
    cameraRig.shake?.(0.35);
    audio.speak?.(hitTarget.pts >= 300 ? 'topCorner' : 'goal');
    showBanner('goal', `+${earned} PUAN!`, `${hitTarget.label} (KOMBO x${state.targetCombo})`);

    // Tüm hedefler vurulduysa yenile + bonus!
    if (targetItems.every((t) => t.hit)) {
      state.targetScore += 500;
      showToast('TÜM HEDEFLER! +500 BONUS!', 1.8);
      setTimeout(() => { if (settings.mode === 'targets') resetTargets(); }, 600);
    }
  } else {
    state.targetCombo = 0;
    state.targetScore += 50;
    state.userResults.push(true);
    audio.goalCheer();
    showBanner('goal', 'GOL! (+50)', 'Hedefi ıskaladın — kombo sıfırlandı');
  }
  updateScoreboard();
}

function resolveKick(outcome, info = {}) {
  if (state.kickResolved) return;
  state.kickResolved = true;
  state.kickOutcome = outcome;
  state.phase = 'result';
  state.resultTimer = 2.15;
  audio.setTension?.(0.1);

  const isGoal = outcome === 'goal';
  const shotType = state.lockedShot?.shotType || state.aiShotPlan?.shotType || 'normal';

  // Hedef Vurma özel puanlama
  if (settings.mode === 'targets') {
    if (isGoal) {
      handleTargetHitCheck(info.x || 0, info.y || 1.2);
    } else {
      state.targetShotsLeft = Math.max(0, state.targetShotsLeft - 1);
      state.targetCombo = 0;
      state.userResults.push(false);
      showBanner(outcome === 'post' ? 'post' : 'miss', outcome === 'post' ? 'DİREK!' : 'AUT!', 'Kombo sıfırlandı');
      audio.missGroan();
      updateScoreboard();
    }
    state.shouldReplay = false;
    return;
  }

  // Normal / Seri / Kaleci / 2P / Turnuva sonuçları
  if (outcome === 'goal') {
    const isTopCorner = !!info.isTopCorner;
    const isPanenka = shotType === 'panenka';
    const sub = info.hitPost
      ? 'Direkten içeri!'
      : isPanenka
        ? 'Muhteşem Panenka!'
        : isTopCorner
          ? "Tam 90'a astı!"
          : state.userRole === 'shooter'
            ? 'Harika vuruş!'
            : 'Top ağlarda';
    showBanner('goal', 'GOL!', sub);
    audio.goalCheer();
    audio.pyroPop?.();
    audio.speak?.(isPanenka ? 'panenka' : isTopCorner ? 'topCorner' : 'goal');
    world.setCrowdExcitement(1.0);
    world.triggerGoalEffects?.(new THREE.Vector3(info.x || 0, info.y || 1.2, 0));
    cameraRig.shake?.(isTopCorner ? 0.42 : 0.25);
    shooter.celebrate(Math.floor(Math.random() * 3));
    keeper.disappointed();
    state.shouldReplay = true;
  } else if (outcome === 'save') {
    showBanner('save', 'KURTARIŞ!', state.userRole === 'keeper' ? 'Müthiş refleks!' : 'Kaleci izin vermedi');
    audio.speak?.('save');
    cameraRig.shake?.(0.28);
    if (state.userRole === 'keeper') {
      audio.goalCheer();
      world.setCrowdExcitement(0.95);
    } else {
      audio.missGroan();
      world.setCrowdExcitement(0.35);
    }
    keeper.celebrate();
    shooter.disappointed();
    state.shouldReplay = true;
  } else if (outcome === 'post') {
    showBanner('post', 'DİREK!', 'Direkten döndü!');
    audio.missGroan();
    audio.speak?.('post');
    cameraRig.shake?.(0.45);
    world.setCrowdExcitement(0.45);
    shooter.disappointed();
    keeper.celebrate();
    state.shouldReplay = false;
  } else {
    showBanner('miss', 'AUT!', 'Kale dışına gitti');
    audio.missGroan();
    audio.speak?.('miss');
    world.setCrowdExcitement(0.25);
    shooter.disappointed();
    keeper.celebrate();
    state.shouldReplay = false;
  }

  // Online 1v1: sonucu sunucuya bildir (skor sunucudan onTurnScored ile gelir)
  if (online.active) {
    getNetClient().reportResult(online.turnId, outcome);
    return;
  }

  // Kalıcı istatistikler
  if (settings.mode !== 'local2p') {
    if (state.userRole === 'shooter') {
      stats.totalShots++;
      if (isGoal) {
        stats.totalGoals++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
      } else {
        stats.currentStreak = 0;
      }
    } else {
      stats.totalFaced++;
      if (!isGoal) stats.totalSaves++;
    }
    saveStats();
  }

  // Skor tablosunu güncelle
  if (settings.mode === 'shooter') {
    state.userResults.push(isGoal);
    if (isGoal) state.userScore++;
  } else if (settings.mode === 'keeper') {
    const stopped = !isGoal;
    state.userResults.push(stopped);
    if (stopped) state.userScore++;
  } else if (settings.mode === 'local2p') {
    state.userResults.push(isGoal);
    state.aiResults.push(!isGoal);
    if (isGoal) state.userScore++;
    else state.aiScore++;
  } else {
    if (state.userRole === 'shooter') {
      state.userResults.push(isGoal);
      if (isGoal) state.userScore++;
    } else {
      state.aiResults.push(isGoal);
      if (isGoal) state.aiScore++;
    }
  }

  updateScoreboard();
}

// ============ OTOMATİK TEKRAR (INSTANT REPLAY) ============
function recordReplayFrame() {
  if (state.replayFrames.length >= 360) state.replayFrames.shift();
  state.replayFrames.push({
    ballPos: ball.position.clone(),
    ballQuat: ball.mesh.quaternion.clone(),
    shooterPos: shooter.group.position.clone(),
    shooterRotY: shooter.group.rotation.y,
    keeperPos: keeper.group.position.clone(),
    keeperRotY: keeper.group.rotation.y,
  });
}

function startReplay() {
  if (state.replayFrames.length < 20) {
    advanceTurn();
    return;
  }
  state.phase = 'replay';
  // Son ~95 kare (~1.5 sn: vuruş anından hemen önce + uçuş + gol/kurtarış)
  const startIdx = Math.max(0, state.replayFrames.length - 95);
  state.replayIndex = startIdx;
  state.replayTimer = 2.35;
  state.replayPrevCam = settings.cameraId;

  const altCam = settings.cameraId === 'behindGoal' ? 'cinematic' : 'behindGoal';
  cameraRig.setMode(altCam);
  ball.clearTrail();
  hideBanner();
  ui.replayHud.classList.remove('hidden');
}

function stopReplayAndAdvance() {
  if (state.phase !== 'replay') return;
  ui.replayHud.classList.add('hidden');
  if (state.replayPrevCam) {
    cameraRig.setMode(state.replayPrevCam);
    state.replayPrevCam = null;
  }
  advanceTurn();
}

// ============ MAÇ SONU & TURNUVA KONTROLÜ ============
function checkMatchEnd() {
  if (settings.mode === 'shooter') {
    if (state.userResults.length >= 5) {
      const won = state.userScore >= 3;
      finishMatch(
        won ? '🏆' : '⚽',
        won ? 'TEBRİKLER!' : 'DAHA İYİSİNİ YAPABİLİRSİN',
        `${state.userScore} / 5 GOL`,
        `Zorluk: ${getDifficulty(state.activeDifficulty).label}`,
        false
      );
      return true;
    }
    return false;
  }

  if (settings.mode === 'keeper') {
    if (state.userResults.length >= 5) {
      const won = state.userScore >= 3;
      finishMatch(
        won ? '🧤' : '😬',
        won ? 'DUVAR GİBİSİN!' : 'RAKİP ÜSTÜN GELDİ',
        `${state.userScore} / 5 KURTARIŞ`,
        `Zorluk: ${getDifficulty(state.activeDifficulty).label}`,
        false
      );
      return true;
    }
    return false;
  }

  if (settings.mode === 'targets') {
    if (state.targetShotsLeft <= 0) {
      const isRecord = state.targetScore > stats.bestTargetScore;
      if (isRecord) {
        stats.bestTargetScore = state.targetScore;
        saveStats();
      }
      finishMatch(
        isRecord ? '🌟' : '🎪',
        isRecord ? 'YENİ REKOR!' : 'HEDEF VURMA BİTTİ',
        `${state.targetScore} PUAN`,
        `İsabet: ${state.userScore} / 10 · Rekor: ${stats.bestTargetScore} puan`,
        false
      );
      return true;
    }
    return false;
  }

  if (settings.mode === 'local2p') {
    if (state.userResults.length >= 5) {
      const p1Won = state.userScore > state.aiScore;
      finishMatch(
        p1Won ? '🎯' : '🧤',
        p1Won ? 'P1 (PENALTICI) KAZANDI!' : 'P2 (KALECİ) KAZANDI!',
        `${state.userScore} - ${state.aiScore}`,
        '2 Kişilik Lokal düello tamamlandı!',
        false
      );
      return true;
    }
    return false;
  }

  // Seri Penaltı & Turnuva
  const uN = state.userResults.length;
  const aN = state.aiResults.length;
  let matchOver = false;
  let won = false;

  if (!state.suddenDeath) {
    const uRem = 5 - uN;
    const aRem = 5 - aN;
    if (state.userScore > state.aiScore + aRem) { matchOver = true; won = true; }
    else if (state.aiScore > state.userScore + uRem) { matchOver = true; won = false; }
    else if (uN >= 5 && aN >= 5) {
      if (state.userScore === state.aiScore) {
        state.suddenDeath = true;
        showToast('EŞİTLİK! ANİ ÖLÜM BAŞLIYOR!', 2.0);
        return false;
      }
      matchOver = true;
      won = state.userScore > state.aiScore;
    }
  } else if (uN === aN && state.userScore !== state.aiScore) {
    matchOver = true;
    won = state.userScore > state.aiScore;
  }

  if (!matchOver) return false;

  if (settings.mode === 'tournament') {
    const stageInfo = TOURNAMENT_STAGES[state.tournamentStage];
    if (won && state.tournamentStage < TOURNAMENT_STAGES.length - 1) {
      finishMatch(
        '🎉',
        `${stageInfo.stage.toUpperCase()} GEÇİLDİ!`,
        `${state.userScore} - ${state.aiScore}`,
        `${stageInfo.opponent} elendi! Sıradaki: ${TOURNAMENT_STAGES[state.tournamentStage + 1].stage}`,
        true
      );
      return true;
    }
    if (won) {
      // ŞAMPİYON!
      stats.trophies++;
      saveStats();
      world.triggerGoalEffects?.(new THREE.Vector3(0, 1.5, 0));
      audio.pyroPop?.();
      audio.goalCheer();
      audio.speak?.('champion');
      finishMatch(
        '🏆',
        'TURNUVA ŞAMPİYONU!',
        `${state.userScore} - ${state.aiScore}`,
        `Finalde ${stageInfo.opponent} takımını yenerek kupayı kaldırdın! (Toplam Kupa: ${stats.trophies})`,
        false
      );
      return true;
    }
    finishMatch(
      '😔',
      `${stageInfo.stage.toUpperCase()}'DE ELENDİN`,
      `${state.userScore} - ${state.aiScore}`,
      `${stageInfo.opponent} üstün geldi. Tekrar dene!`,
      false
    );
    return true;
  }

  finishMatch(
    won ? '🏆' : '😔',
    won ? (state.suddenDeath ? 'ANİ ÖLÜMÜ KAZANDIN!' : 'SERİYİ KAZANDIN!') : 'SERİYİ KAYBETTİN',
    `${state.userScore} - ${state.aiScore}`,
    won ? 'Tebrikler, penaltı serisinin galibi sensin!' : 'Rakip penaltı serisinde üstün geldi.',
    false
  );
  return true;
}

function finishMatch(icon, title, scoreText, detail, hasNextStage) {
  state.phase = 'ended';
  hideBanner();
  ui.keeperPad.classList.add('hidden');
  ui.power.classList.add('hidden');
  ui.shotBar.classList.add('hidden');
  ui.timedBar.classList.add('hidden');
  ui.reticle.classList.add('hidden');
  ui.replayHud.classList.add('hidden');
  ui.turnInfo.textContent = '';
  ui.hint.textContent = '';

  ui.endIcon.textContent = icon;
  ui.endTitle.textContent = title;
  ui.endScore.textContent = scoreText;
  ui.endDetail.textContent = detail;
  ui.btnNextStage.classList.toggle('hidden', !hasNextStage);
  ui.btnRematch.classList.toggle('hidden', !online.active);
  ui.btnLeaveOnline.classList.toggle('hidden', !online.active);
  ui.btnAgain.classList.toggle('hidden', hasNextStage || online.active);
  ui.btnEndMenu.classList.toggle('hidden', online.active);
  ui.end.classList.remove('hidden');
  audio.setCrowdIntensity(0.4);
  audio.setTension?.(0);
}

function advanceTurn() {
  if (online.active) {
    advanceOnlineAfterTurn();
    return;
  }
  if (checkMatchEnd()) return;
  if (settings.mode === 'series' || settings.mode === 'tournament') {
    state.userRole = state.userRole === 'shooter' ? 'keeper' : 'shooter';
  }
  state.roundIndex++;
  if (state.roundIndex % 2 === 0) rollWind();
  prepareTurn();
}

function setPaused(val) {
  if (state.phase === 'menu' || state.phase === 'ended') return;
  state.paused = val;
  ui.pause.classList.toggle('hidden', !val);
  audio.setCrowdIntensity(val ? 0.1 : 0.4);
  if (val) audio.setTension?.(0);
}

function returnToMenu() {
  if (online.active && netClient) {
    netClient.leaveRoom();
  }
  online.active = false;
  online.code = '';
  state.phase = 'menu';
  state.paused = false;
  targetGroup.visible = false;
  keeper.group.visible = true;
  ui.pause.classList.add('hidden');
  ui.end.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.onlineLobby.classList.add('hidden');
  ui.onlineTimerBar.classList.add('hidden');
  ui.emoteBar.classList.add('hidden');
  ui.netHudPing.classList.add('hidden');
  ui.menu.classList.remove('hidden');
  hideBanner();
  ball.reset(PENALTY_SPOT);
  shooter.reset();
  keeper.reset();
  audio.setCrowdIntensity(0.15);
  audio.setTension?.(0);
  world.setCrowdExcitement(0.1);
}

// ============ GİRDİ (FARE, KLAVYE, BUTONLAR) ============
function updateAimFromPointer(clientX, clientY) {
  if (state.phase !== 'aim' || state.userRole !== 'shooter') return;
  const rect = ui.canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  const hit = raycaster.ray.intersectPlane(goalPlane, tmpVec);
  const maxX = GOAL.halfWidth + 0.55;
  const maxY = GOAL.height + 0.55;

  if (hit && Math.abs(hit.x) < 16 && hit.y > -2 && hit.y < 10) {
    state.aimX = Math.max(-maxX, Math.min(maxX, hit.x));
    state.aimY = Math.max(0.15, Math.min(maxY, hit.y));
  } else {
    const sign = getCameraRightX();
    state.aimX = Math.max(-maxX, Math.min(maxX, ndcX * maxX * sign));
    state.aimY = Math.max(0.15, Math.min(maxY, (ndcY * 0.5 + 0.5) * maxY));
  }
}

ui.canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!state.paused && state.phase === 'runup' && state.userRole === 'shooter') {
    triggerPlayerStutter();
  }
});

ui.canvas.addEventListener('pointermove', (e) => {
  if (state.paused) return;
  if (online.active && state.phase === 'aim' && state.userRole === 'keeper' && !online.picked) {
    const rect = ui.canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const xPos = Math.max(-1, Math.min(1, nx * getCameraRightX()));
    keeper.shuffle(xPos);
    getNetClient().sendKeeperPos(xPos);
    return;
  }
  updateAimFromPointer(e.clientX, e.clientY);
});

ui.canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (state.paused) return;
  if (e.button === 2) {
    triggerPlayerStutter();
    return;
  }
  if (e.button !== 0) return;

  if (state.phase === 'replay') {
    stopReplayAndAdvance();
    return;
  }
  if (state.phase === 'runup' && state.userRole === 'shooter') {
    triggerTimedFinishAttempt();
    return;
  }
  if (state.phase === 'aim' && state.userRole === 'shooter') {
    updateAimFromPointer(e.clientX, e.clientY);
    state.charging = true;
    state.power = 0.05;
    state.powerDir = 1;
  }
});

window.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return;
  if (state.charging && state.phase === 'aim' && state.userRole === 'shooter' && !state.paused) {
    triggerUserShot();
  }
});

window.addEventListener('keydown', (e) => {
  audio.unlock();
  const code = e.code;

  if (code === 'Escape') {
    if (!ui.onlineLobby.classList.contains('hidden')) {
      closeOnlineLobby();
      return;
    }
    if (!ui.statsModal.classList.contains('hidden')) {
      ui.statsModal.classList.add('hidden');
      return;
    }
    if (state.phase !== 'menu' && state.phase !== 'ended') {
      setPaused(!state.paused);
    }
    return;
  }
  // Input alanlarında yazarken kısayolları engelle
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (code === 'KeyM') {
    settings.muted = !settings.muted;
    localStorage.setItem(STORAGE_MUTE, settings.muted ? '1' : '0');
    audio.setMuted(settings.muted);
    updateAudioButtons();
    return;
  }
  if (code === 'KeyC' && !state.paused && state.phase !== 'replay') {
    cycleCamera();
    return;
  }

  if (state.paused || state.phase === 'menu' || state.phase === 'ended') return;

  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
    e.preventDefault();
  }

  keys.add(code);

  // Tekrarı geç
  if (state.phase === 'replay' && (code === 'Space' || code === 'Enter')) {
    stopReplayAndAdvance();
    return;
  }

  // Şut tipi kısayolları (1-4)
  if (state.phase === 'aim' && state.userRole === 'shooter') {
    if (code === 'Digit1') setShotType('normal');
    else if (code === 'Digit2') setShotType('finesse');
    else if (code === 'Digit3') setShotType('panenka');
    else if (code === 'Digit4') setShotType('trivela');
  }

  // Koşu sırasında Şaşırtma (Shift) & Zamanlı Vuruş (Space)
  if (state.phase === 'runup' && state.userRole === 'shooter') {
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      triggerPlayerStutter();
      return;
    }
    if (code === 'Space') {
      triggerTimedFinishAttempt();
      return;
    }
  }

  // Penaltıcı: Boşluk ile güç doldur
  if (code === 'Space' && state.phase === 'aim' && state.userRole === 'shooter' && !state.charging) {
    state.charging = true;
    state.power = 0.05;
    state.powerDir = 1;
    return;
  }

  // 2 Kişilik Lokal: P2 Kaleci (J=sol, K=orta, L=sağ, I=yüksek modifiye)
  if (settings.mode === 'local2p' && !state.userKeeperDived) {
    const p2High = keys.has('KeyI');
    const h = p2High ? 'high' : 'low';
    if (code === 'KeyJ') { triggerKeeperDiveInput(-1, h, true); return; }
    if (code === 'KeyK') { triggerKeeperDiveInput(0, h, true); return; }
    if (code === 'KeyL') { triggerKeeperDiveInput(1, h, true); return; }
  }

  // Tek kişilik Kaleci: A/←, S/↓, D/→, W/↑ (yüksek)
  if (state.userRole === 'keeper' && !state.userKeeperDived) {
    const highMod = keys.has('KeyW') || keys.has('ArrowUp') || e.shiftKey;
    const height = highMod ? 'high' : 'low';
    if (code === 'KeyA' || code === 'ArrowLeft') triggerKeeperDiveInput(-1, height, false);
    else if (code === 'KeyD' || code === 'ArrowRight') triggerKeeperDiveInput(1, height, false);
    else if (code === 'KeyS' || code === 'ArrowDown') triggerKeeperDiveInput(0, height, false);
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Space' && state.charging && state.phase === 'aim' && state.userRole === 'shooter' && !state.paused) {
    triggerUserShot();
  }
});

// Kaleci ekran butonları
ui.keeperPad.querySelectorAll('.kp-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.unlock();
    if (state.paused) return;
    triggerKeeperDiveInput(Number(btn.dataset.sx), btn.dataset.h, false);
  });
});

// Menü etkileşimleri
ui.modeGrid.querySelectorAll('.mode-card').forEach((card) => {
  card.addEventListener('click', () => {
    settings.mode = card.dataset.mode;
    localStorage.setItem(STORAGE_MODE, settings.mode);
    syncMenuUI();
  });
});

ui.diffSeg.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.difficulty = btn.dataset.diff;
    localStorage.setItem(STORAGE_DIFF, settings.difficulty);
    syncMenuUI();
  });
});

ui.timeSeg.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.timeOfDay = btn.dataset.time;
    saveEnv();
    applyEnvironment();
    syncMenuUI();
  });
});

ui.weatherSeg.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.weather = btn.dataset.weather;
    saveEnv();
    applyEnvironment();
    syncMenuUI();
  });
});

ui.jerseyInput.addEventListener('change', () => {
  const n = Math.max(1, Math.min(99, parseInt(ui.jerseyInput.value, 10) || 10));
  settings.jerseyNumber = n;
  saveKit();
  applyTeamKits();
  syncMenuUI();
});

function toggleAnnouncer() {
  audio.unlock();
  settings.announcer = !settings.announcer;
  audio.setAnnouncerEnabled?.(settings.announcer);
  saveEnv();
  updateAudioButtons();
}

ui.btnAnnouncer.addEventListener('click', toggleAnnouncer);
ui.btnMenuAnnouncer.addEventListener('click', toggleAnnouncer);
ui.btnStats.addEventListener('click', openStatsModal);
ui.btnCloseStats.addEventListener('click', () => ui.statsModal.classList.add('hidden'));
ui.btnResetStats.addEventListener('click', () => {
  stats = { ...DEFAULT_STATS };
  saveStats();
  openStatsModal();
});
ui.btnSkipReplay.addEventListener('click', stopReplayAndAdvance);

ui.btnStart.addEventListener('click', () => {
  if (settings.mode === 'online') openOnlineLobby();
  else startMatch(false);
});

// Online Lobi etkileşimleri
ui.netNameInput.addEventListener('input', () => {
  online.playerName = ui.netNameInput.value.trim().slice(0, 14) || 'Oyuncu';
  localStorage.setItem(STORAGE_NAME, online.playerName);
});

ui.btnCreateRoom.addEventListener('click', () => {
  audio.unlock();
  const name = ui.netNameInput.value.trim().slice(0, 14) || 'Oyuncu';
  online.playerName = name;
  localStorage.setItem(STORAGE_NAME, name);
  showLobbyError('');
  getNetClient().createRoom({
    name,
    kitIndex: getSelectedKitIndex(),
    jerseyNumber: settings.jerseyNumber,
    timeOfDay: settings.timeOfDay,
    weather: settings.weather,
  });
});

ui.btnJoinRoom.addEventListener('click', () => {
  audio.unlock();
  const code = ui.joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    showLobbyError('4 karakterli oda kodunu gir (ör. K7M4).');
    return;
  }
  const name = ui.netNameInput.value.trim().slice(0, 14) || 'Oyuncu';
  online.playerName = name;
  localStorage.setItem(STORAGE_NAME, name);
  showLobbyError('');
  getNetClient().joinRoom(code, {
    name,
    kitIndex: getSelectedKitIndex(),
    jerseyNumber: settings.jerseyNumber,
  });
});

ui.joinCodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ui.btnJoinRoom.click();
});

ui.btnCopyInvite.addEventListener('click', async () => {
  if (!online.code) return;
  const url = `${window.location.origin}/?oda=${online.code}`;
  try {
    await navigator.clipboard.writeText(url);
    ui.btnCopyInvite.textContent = '✅ LİNK KOPYALANDI!';
    setTimeout(() => { ui.btnCopyInvite.textContent = '📋 DAVET LİNKİNİ KOPYALA'; }, 2000);
  } catch {
    prompt('Davet linkini kopyala:', url);
  }
});

ui.btnCancelRoom.addEventListener('click', () => {
  if (netClient) netClient.leaveRoom();
  online.code = '';
  ui.lobbyWaiting.classList.add('hidden');
  ui.lobbyMain.classList.remove('hidden');
});

ui.btnCloseLobby.addEventListener('click', closeOnlineLobby);

ui.emoteBar.querySelectorAll('.em-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!online.active) return;
    const emoji = btn.dataset.emoji;
    getNetClient().sendEmote(emoji);
    showEmotePopup(online.playerName || 'Sen', emoji);
  });
});

ui.btnRematch.addEventListener('click', () => {
  if (!online.active || online.rematchRequested) return;
  online.rematchRequested = true;
  ui.btnRematch.textContent = '⏳ RÖVANŞ BEKLENİYOR (1/2)';
  getNetClient().requestRematch();
});

ui.btnLeaveOnline.addEventListener('click', returnToMenu);
ui.btnNextStage.addEventListener('click', () => {
  state.tournamentStage = Math.min(TOURNAMENT_STAGES.length - 1, state.tournamentStage + 1);
  startMatch(true);
});
ui.btnMute.addEventListener('click', () => {
  audio.unlock();
  settings.muted = !settings.muted;
  localStorage.setItem(STORAGE_MUTE, settings.muted ? '1' : '0');
  audio.setMuted(settings.muted);
  updateAudioButtons();
});
ui.btnPause.addEventListener('click', () => setPaused(true));
ui.btnResume.addEventListener('click', () => setPaused(false));
ui.btnRestart.addEventListener('click', () => startMatch(settings.mode === 'tournament'));
ui.btnMenu.addEventListener('click', returnToMenu);
ui.btnAgain.addEventListener('click', () => startMatch(false));
ui.btnEndMenu.addEventListener('click', returnToMenu);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============ YAKIN TEMAS AĞIR ÇEKİM ============
function checkCloseCallSlowMo() {
  if (state.slowMoTriggered || state.kickResolved) return;
  const p = ball.position;
  if (p.z > 4.2 || p.z < -0.2) return;

  let close = false;
  if (p.z < 2.2) {
    const distLeft = Math.hypot(p.x + GOAL.halfWidth, Math.max(0, p.y - GOAL.height));
    const distRight = Math.hypot(p.x - GOAL.halfWidth, Math.max(0, p.y - GOAL.height));
    const distBar = Math.abs(p.y - GOAL.height);
    if (distLeft < 0.45 || distRight < 0.45 || (Math.abs(p.x) < GOAL.halfWidth + 0.3 && distBar < 0.32)) {
      close = true;
    }
  }
  if (!close && keeper.group.visible && keeper.getHandColliders) {
    const cols = keeper.getHandColliders();
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c && c.center && c.center.distanceTo(p) < (c.radius || 0.16) + 0.55) {
        close = true;
        break;
      }
    }
  }
  if (close) {
    state.slowMoTriggered = true;
    state.slowMoTimer = 0.55;
    state.timeScale = 0.35;
    ui.slowmo.classList.remove('hidden');
  }
}

// ============ ANA OYUN DÖNGÜSÜ ============
let lastTime = performance.now();

function tick(now) {
  requestAnimationFrame(tick);
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (state.toastTimer > 0) {
    state.toastTimer -= rawDt;
    if (state.toastTimer <= 0) ui.toast.classList.add('hidden');
  }
  if (state.speedTimer > 0) {
    state.speedTimer -= rawDt;
    if (state.speedTimer <= 0) ui.speedBadge.classList.add('hidden');
  }
  if (online.emoteTimer > 0) {
    online.emoteTimer -= rawDt;
    if (online.emoteTimer <= 0) ui.emoteFloat.classList.add('hidden');
  }

  // Online 15s seçim sayacı
  if (online.active && state.phase === 'aim' && online.deadlineMs > 0) {
    const remMs = Math.max(0, online.deadlineMs - Date.now());
    const remSec = Math.ceil(remMs / 1000);
    const pct = Math.max(0, Math.min(100, (remMs / 15000) * 100));
    ui.onlineTimerSec.textContent = `${remSec}s`;
    ui.onlineTimerFill.style.width = `${pct}%`;
    ui.onlineTimerFill.classList.toggle('urgent', remSec <= 4);
  }

  if (state.paused) {
    renderer.render(scene, camera);
    return;
  }

  if (state.slowMoTimer > 0) {
    state.slowMoTimer -= rawDt;
    if (state.slowMoTimer <= 0) {
      state.timeScale = 1;
      ui.slowmo.classList.add('hidden');
    }
  } else {
    state.timeScale += (1 - state.timeScale) * Math.min(1, rawDt * 8);
  }

  const dt = rawDt * state.timeScale;
  const cfg = getDifficulty(state.activeDifficulty);

  if (state.phase === 'replay') {
    // Otomatik ağır çekim tekrar (0.35×)
    state.replayTimer -= rawDt;
    state.replayIndex += rawDt * 60 * 0.35;
    const idx = Math.min(state.replayFrames.length - 1, Math.floor(state.replayIndex));
    const frame = state.replayFrames[idx];
    if (frame) {
      ball.setReplayPose(frame.ballPos, frame.ballQuat, true);
      shooter.group.position.copy(frame.shooterPos);
      shooter.group.rotation.y = frame.shooterRotY;
      keeper.group.position.copy(frame.keeperPos);
      keeper.group.rotation.y = frame.keeperRotY;
    }
    world.update(rawDt * 0.35);
    cameraRig.update(rawDt, {
      ball: ball.position,
      ballVel: ball.velocity,
      keeper: keeper.group,
      shooter: shooter.group,
      phase: 'flight',
      userRole: state.userRole,
      isReplay: true,
    });
    if (state.replayTimer <= 0 || idx >= state.replayFrames.length - 1) {
      stopReplayAndAdvance();
    }
    renderer.render(scene, camera);
    return;
  }

  if (state.phase === 'aim') {
    if (state.userRole === 'shooter') {
      const sign = getCameraRightX();
      const moveSpeed = cfg.aimSpeed;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) state.aimX -= moveSpeed * rawDt * sign;
      if (keys.has('ArrowRight') || keys.has('KeyD')) state.aimX += moveSpeed * rawDt * sign;
      if (keys.has('ArrowUp') || keys.has('KeyW')) state.aimY += moveSpeed * 0.7 * rawDt;
      if (keys.has('ArrowDown') || keys.has('KeyS')) state.aimY -= moveSpeed * 0.7 * rawDt;

      if (keys.has('KeyQ')) state.curl = Math.max(-1, state.curl - 1.6 * rawDt);
      if (keys.has('KeyE')) state.curl = Math.min(1, state.curl + 1.6 * rawDt);
      updateCurlUI();

      const maxX = GOAL.halfWidth + 0.55;
      const maxY = GOAL.height + 0.55;
      state.aimX = Math.max(-maxX, Math.min(maxX, state.aimX));
      state.aimY = Math.max(0.15, Math.min(maxY, state.aimY));

      if (state.charging) {
        state.power += state.powerDir * cfg.powerSpeed * rawDt;
        if (state.power >= 1) { state.power = 1; state.powerDir = -1; }
        else if (state.power <= 0.05) { state.power = 0.05; state.powerDir = 1; }
      }
      updatePowerUI();

      if (online.active) {
        // Online rakip kaleciyi canlı konumlandır
        keeper.shuffle(online.opponentKeeperX);
      } else if (settings.mode !== 'local2p' && settings.mode !== 'targets') {
        state.keeperShufflePhase += dt * 2.4;
        keeper.shuffle(Math.sin(state.keeperShufflePhase) * cfg.keeperShuffleAmp);
      }
    } else {
      updateKeeperPadLabels();
      if (!online.active) {
        state.aiShotReadyTimer -= rawDt;
        if (state.aiShotReadyTimer <= 0) startAiRunup();
      }
    }
  } else if (state.phase === 'runup') {
    // Tekrar kaydı
    state.replayRecordAccum += rawDt;
    if (state.replayRecordAccum >= 1 / 60) {
      state.replayRecordAccum = 0;
      recordReplayFrame();
    }

    if (state.userRole === 'shooter') {
      const prog = Math.min(1, state.runupElapsed / Math.max(0.1, state.runupDuration));
      ui.timedCursor.style.left = `${Math.round(prog * 100)}%`;
    } else {
      updateKeeperPadLabels();
      if (
        state.aiShotPlan &&
        state.aiShotPlan.hasFake &&
        !state.runupFakeDone &&
        state.runupElapsed / state.runupDuration >= state.aiShotPlan.fakeAt
      ) {
        state.runupFakeDone = true;
        state.runupPauseTimer = state.aiShotPlan.fakePause;
      }
    }

    if (state.runupPauseTimer > 0) {
      state.runupPauseTimer -= rawDt;
      keeper.update(dt);
      world.update(dt);
    } else {
      state.runupElapsed += dt;
      shooter.update(dt);
      keeper.update(dt);
      world.update(dt);
    }
  } else if (state.phase === 'flight') {
    state.replayRecordAccum += rawDt;
    if (state.replayRecordAccum >= 1 / 60) {
      state.replayRecordAccum = 0;
      recordReplayFrame();
    }

    if (online.active && online.execDive && !online.execDiveTriggered) {
      online.execDiveTimer += dt;
      if (online.execDiveTimer >= 0.06) {
        online.execDiveTriggered = true;
        keeper.dive(online.execDive.dir, online.execDive.height, 0.54);
      }
    } else if (!online.active && state.userRole === 'shooter' && state.aiKeeperPlan && !state.aiKeeperDived) {
      state.aiKeeperTimer += dt;
      if (state.aiKeeperTimer >= state.aiKeeperPlan.delay) {
        state.aiKeeperDived = true;
        keeper.dive(state.aiKeeperPlan.dir, state.aiKeeperPlan.height, state.aiKeeperPlan.duration);
      }
    }

    checkCloseCallSlowMo();

    ball.step(dt, {
      keeper: keeper.group.visible ? keeper : null,
      world,
      audio,
      onEvent: (type, info) => {
        if (type === 'goal') resolveKick('goal', info);
        else if (type === 'save') resolveKick('save', info);
        else if (type === 'post') cameraRig.shake?.(0.32);
        else if (type === 'out') resolveKick(info && info.hitPost ? 'post' : 'miss', info);
      },
    });

    if (!state.kickResolved && (ball.state.settled || ball.state.flightTime > 3.5)) {
      if (ball.state.inGoal) resolveKick('goal');
      else if (ball.state.saved) resolveKick('save');
      else if (ball.state.hitPost) resolveKick('post');
      else resolveKick('miss');
    }
  } else if (state.phase === 'result') {
    ball.step(dt, { keeper: keeper.group.visible ? keeper : null, world, audio });
    if (state.replayFrames.length < 360) {
      state.replayRecordAccum += rawDt;
      if (state.replayRecordAccum >= 1 / 60) {
        state.replayRecordAccum = 0;
        recordReplayFrame();
      }
    }
    state.resultTimer -= rawDt;
    if (state.resultTimer <= 0) {
      if (state.shouldReplay && state.replayFrames.length >= 25) {
        state.shouldReplay = false;
        startReplay();
      } else {
        advanceTurn();
      }
    }
  }

  if (state.phase !== 'runup') {
    shooter.update(dt);
    keeper.update(dt);
    world.update(dt);
  }

  // Kaleci baş takibi ve yere iniş çim sıçraması (v2)
  if (keeper.group.visible) {
    keeper.setBallTarget?.(ball.position);
    const landPos = keeper.consumeLandEvent?.();
    if (landPos) {
      world.spawnTurfSpray?.(landPos, new THREE.Vector3(0, 1.5, 0.8));
    }
  }

  updateTargets(rawDt, now * 0.001);

  const camPhase = state.phase === 'menu' || state.phase === 'ended' ? 'aim' : state.phase;
  cameraRig.update(rawDt, {
    ball: ball.position,
    ballVel: ball.velocity,
    keeper: keeper.group,
    shooter: shooter.group,
    phase: camPhase,
    userRole: state.userRole,
    isReplay: false,
  });

  updateReticleScreenPosition();
  renderer.render(scene, camera);
}

// ============ BAŞLATMA ============
audio.setMuted(settings.muted);
audio.setAnnouncerEnabled?.(settings.announcer);
cameraRig.setMode(settings.cameraId);
ball.setSkin(settings.ballSkin);
applyEnvironment();
buildStaticUI();
syncMenuUI();
applyTeamKits();
rollWind();
ball.reset(PENALTY_SPOT);
shooter.reset();
keeper.reset();
ui.loading.classList.add('hidden');
requestAnimationFrame(tick);

// Davet linki (?oda=XXXX) ile gelindiyse doğrudan Online Lobi'yi aç
const inviteCode = new URLSearchParams(window.location.search).get('oda');
if (inviteCode && inviteCode.trim().length === 4) {
  settings.mode = 'online';
  syncMenuUI();
  openOnlineLobby(inviteCode.trim().toUpperCase());
}
