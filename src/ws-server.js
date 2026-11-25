'use strict';

const { WebSocketServer, WebSocket } = require('ws');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
const DEFAULT_PICK_TIMEOUT_MS = 15000;
const GUEST_RESULT_FALLBACK_MS = 300;
const EXECUTE_SAFETY_TIMEOUT_MS = 15000;
const ROOM_IDLE_TTL_MS = 30 * 60 * 1000;
const IDLE_SWEEP_INTERVAL_MS = 60 * 1000;
const VALID_OUTCOMES = new Set(['goal', 'save', 'post', 'miss']);

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function generateRoomCode(rooms) {
  for (let attempt = 0; attempt < 64; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Oda kodu üretilemedi');
}

function clamp(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizePlayer(msg, defaultName) {
  const rawName = typeof msg.name === 'string' ? msg.name.trim() : '';
  const name = rawName.slice(0, 18) || defaultName;
  const kitIndex = Math.floor(clamp(msg.kitIndex, 0, 31, 0));
  const jerseyNumber = Math.floor(clamp(msg.jerseyNumber, 1, 99, 10));
  return { name, kitIndex, jerseyNumber };
}

function sanitizeEnv(msg) {
  const timeOfDay = typeof msg.timeOfDay === 'string' && msg.timeOfDay.trim()
    ? msg.timeOfDay.trim().slice(0, 24)
    : 'night';
  const weather = typeof msg.weather === 'string' && msg.weather.trim()
    ? msg.weather.trim().slice(0, 24)
    : 'clear';
  return { timeOfDay, weather };
}

function sanitizeShot(msg) {
  return {
    aimX: clamp(msg.aimX, -5, 5, 0),
    aimY: clamp(msg.aimY, 0, 4, 1.1),
    power: clamp(msg.power, 0.1, 1.2, 0.7),
    curl: clamp(msg.curl, -1.5, 1.5, 0),
    shotType: typeof msg.shotType === 'string' ? msg.shotType.slice(0, 20) : 'normal',
    timedQuality: typeof msg.timedQuality === 'string' ? msg.timedQuality.slice(0, 20) : 'good',
    stutter: Boolean(msg.stutter),
    speedMult: clamp(msg.speedMult, 1, 2.0, 1),
  };
}

const VALID_DIVE_DIRS = new Set(['left', 'center', 'right']);

function sanitizeDive(msg) {
  let dir = 'center';
  if (typeof msg.dir === 'string' && VALID_DIVE_DIRS.has(msg.dir)) {
    dir = msg.dir;
  } else if (typeof msg.dir === 'number' && Number.isFinite(msg.dir)) {
    dir = msg.dir < 0 ? 'left' : msg.dir > 0 ? 'right' : 'center';
  }
  const height = msg.height === 'high' ? 'high' : 'low';
  return { dir, height };
}

function randomWindX() {
  return Math.round((Math.random() * 4 - 2) * 100) / 100;
}

function evaluateMatchOver(scores, history) {
  const kHost = history.host.length;
  const kGuest = history.guest.length;
  const sHost = scores.host;
  const sGuest = scores.guest;

  if (kHost <= 5 && kGuest <= 5) {
    const remHost = 5 - kHost;
    const remGuest = 5 - kGuest;
    if (sHost > sGuest + remGuest) {
      return { matchOver: true, winnerSide: 'host' };
    }
    if (sGuest > sHost + remHost) {
      return { matchOver: true, winnerSide: 'guest' };
    }
    if (kHost === 5 && kGuest === 5 && sHost !== sGuest) {
      return { matchOver: true, winnerSide: sHost > sGuest ? 'host' : 'guest' };
    }
    return { matchOver: false, winnerSide: null };
  }

  // Sudden death: decided only after both sides complete the same round
  if (kHost === kGuest && sHost !== sGuest) {
    return { matchOver: true, winnerSide: sHost > sGuest ? 'host' : 'guest' };
  }
  return { matchOver: false, winnerSide: null };
}

function attachWebSocketServer(httpServer, options = {}) {
  const pickTimeoutMs = Number(options.pickTimeoutMs) > 0
    ? Number(options.pickTimeoutMs)
    : DEFAULT_PICK_TIMEOUT_MS;
  const guestFallbackMs = Number(options.guestFallbackMs) > 0
    ? Number(options.guestFallbackMs)
    : GUEST_RESULT_FALLBACK_MS;
  const executeSafetyMs = Number(options.executeSafetyMs) > 0
    ? Number(options.executeSafetyMs)
    : EXECUTE_SAFETY_TIMEOUT_MS;

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const rooms = new Map();
  const clientMeta = new WeakMap();

  function clearRoomTimers(room) {
    if (!room || !room.match) return;
    if (room.match.pickTimer) {
      clearTimeout(room.match.pickTimer);
      room.match.pickTimer = null;
    }
    if (room.match.guestResultTimer) {
      clearTimeout(room.match.guestResultTimer);
      room.match.guestResultTimer = null;
    }
    if (room.match.executeSafetyTimer) {
      clearTimeout(room.match.executeSafetyTimer);
      room.match.executeSafetyTimer = null;
    }
  }

  function broadcastRoom(room, payload) {
    if (room.host) sendJson(room.host.ws, payload);
    if (room.guest) sendJson(room.guest.ws, payload);
  }

  function getOpponentSlot(room, side) {
    return side === 'host' ? room.guest : room.host;
  }

  function buildTurnPayload(match) {
    return {
      turnId: match.turnId,
      round: match.round,
      shooterSide: match.shooterSide,
      windX: match.windX,
      deadlineMs: match.deadlineMs,
      scores: { host: match.scores.host, guest: match.scores.guest },
      history: {
        host: match.history.host.slice(),
        guest: match.history.guest.slice(),
      },
      suddenDeath: match.suddenDeath,
    };
  }

  function schedulePickTimeout(room) {
    clearRoomTimers(room);
    const match = room.match;
    if (!match || match.phase !== 'pick') return;
    const expectedTurnId = match.turnId;

    match.pickTimer = setTimeout(() => {
      if (!rooms.has(room.code) || !room.match) return;
      if (room.match.phase !== 'pick' || room.match.turnId !== expectedTurnId) return;

      if (!room.match.shot) {
        room.match.shot = {
          aimX: 0,
          aimY: 1.1,
          power: 0.65,
          curl: 0,
          shotType: 'normal',
          timedQuality: 'good',
          stutter: false,
        };
      }
      if (!room.match.dive) {
        room.match.dive = { dir: 'center', height: 'low' };
      }
      executeTurn(room);
    }, pickTimeoutMs);
  }

  function executeTurn(room) {
    const match = room.match;
    if (!match || match.phase !== 'pick') return;
    clearRoomTimers(room);

    match.phase = 'executing';
    match.resultAccepted = false;
    match.guestOutcome = null;
    room.lastActivity = Date.now();

    const payload = {
      type: 'execute_turn',
      turnId: match.turnId,
      shot: match.shot,
      dive: match.dive,
      windX: match.windX,
    };
    broadcastRoom(room, payload);

    const expectedTurnId = match.turnId;
    match.executeSafetyTimer = setTimeout(() => {
      if (!rooms.has(room.code) || !room.match) return;
      if (room.match.phase !== 'executing' || room.match.turnId !== expectedTurnId) return;
      finalizeTurnResult(room, room.match.guestOutcome || 'miss');
    }, executeSafetyMs);
  }

  function finalizeTurnResult(room, outcome) {
    const match = room.match;
    if (!match || match.phase !== 'executing' || match.resultAccepted) return;

    clearRoomTimers(room);
    match.resultAccepted = true;
    room.lastActivity = Date.now();

    const shooter = match.shooterSide;
    match.history[shooter].push(outcome);
    if (outcome === 'goal') {
      match.scores[shooter] += 1;
    }

    const { matchOver, winnerSide } = evaluateMatchOver(match.scores, match.history);
    const scoredTurnId = match.turnId;

    let nextTurn = null;
    if (matchOver) {
      match.phase = 'over';
      room.rematchReady.clear();
    } else {
      match.turnId += 1;
      match.shooterSide = shooter === 'host' ? 'guest' : 'host';
      match.round = Math.min(match.history.host.length, match.history.guest.length) + 1;
      match.suddenDeath = match.round > 5;
      match.windX = randomWindX();
      match.deadlineMs = Date.now() + pickTimeoutMs;
      match.shot = null;
      match.dive = null;
      match.phase = 'pick';
      match.resultAccepted = false;
      match.guestOutcome = null;
      nextTurn = buildTurnPayload(match);
    }

    broadcastRoom(room, {
      type: 'turn_scored',
      turnId: scoredTurnId,
      outcome,
      scores: { host: match.scores.host, guest: match.scores.guest },
      history: {
        host: match.history.host.slice(),
        guest: match.history.guest.slice(),
      },
      nextTurn,
      matchOver,
      winnerSide,
    });

    if (!matchOver) {
      schedulePickTimeout(room);
    }
  }

  function startMatch(room, firstShooter) {
    clearRoomTimers(room);
    room.firstShooter = firstShooter;
    room.rematchReady.clear();
    room.lastActivity = Date.now();

    const match = {
      turnId: 1,
      round: 1,
      shooterSide: firstShooter,
      windX: randomWindX(),
      deadlineMs: Date.now() + pickTimeoutMs,
      scores: { host: 0, guest: 0 },
      history: { host: [], guest: [] },
      suddenDeath: false,
      phase: 'pick',
      shot: null,
      dive: null,
      resultAccepted: false,
      guestOutcome: null,
      pickTimer: null,
      guestResultTimer: null,
      executeSafetyTimer: null,
    };
    room.match = match;

    const players = {
      host: { ...room.host.player },
      guest: { ...room.guest.player },
    };
    const turn = buildTurnPayload(match);

    sendJson(room.host.ws, {
      type: 'match_start',
      code: room.code,
      side: 'host',
      players,
      env: { ...room.env },
      turn,
    });
    sendJson(room.guest.ws, {
      type: 'match_start',
      code: room.code,
      side: 'guest',
      players,
      env: { ...room.env },
      turn,
    });

    schedulePickTimeout(room);
  }

  function removeClientFromRoom(ws, reasonMessage) {
    const meta = clientMeta.get(ws);
    if (!meta || !meta.roomCode) return;

    const room = rooms.get(meta.roomCode);
    const leavingSide = meta.side;
    meta.roomCode = null;
    meta.side = null;

    if (!room) return;
    clearRoomTimers(room);

    const opponent = getOpponentSlot(room, leavingSide);
    if (leavingSide === 'host') room.host = null;
    if (leavingSide === 'guest') room.guest = null;

    if (opponent && opponent.ws) {
      const oppMeta = clientMeta.get(opponent.ws);
      if (oppMeta) {
        oppMeta.roomCode = null;
        oppMeta.side = null;
      }
      sendJson(opponent.ws, {
        type: 'opponent_left',
        message: reasonMessage || 'Rakip bağlantıyı kesti',
      });
    }

    rooms.delete(room.code);
  }

  function handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    const meta = clientMeta.get(ws);
    if (!meta) return;

    switch (msg.type) {
      case 'admin_auth': {
        if (msg.key === 'emirgreyrat') {
          ws.isAdmin = true;
        }
        return;
      }

      case 'ping': {
        sendJson(ws, {
          type: 'pong',
          t: msg.t ?? Date.now(),
          onlineCount: wss.clients.size,
          roomCount: rooms.size,
        });
        return;
      }

      case 'create_room': {
        if (meta.roomCode) {
          removeClientFromRoom(ws, 'Rakip odadan ayrıldı');
        }
        let code;
        try {
          code = generateRoomCode(rooms);
        } catch (err) {
          sendJson(ws, { type: 'room_error', message: err.message || 'Oda oluşturulamadı' });
          return;
        }
        const player = sanitizePlayer(msg, 'Oyuncu 1');
        const env = sanitizeEnv(msg);
        const now = Date.now();
        const room = {
          code,
          host: { ws, player },
          guest: null,
          env,
          firstShooter: 'host',
          match: null,
          rematchReady: new Set(),
          createdAt: now,
          lastActivity: now,
        };
        rooms.set(code, room);
        meta.roomCode = code;
        meta.side = 'host';

        sendJson(ws, { type: 'room_created', code, side: 'host' });
        return;
      }

      case 'join_room': {
        const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        if (!code || !rooms.has(code)) {
          sendJson(ws, { type: 'room_error', message: 'Oda bulunamadı' });
          return;
        }
        const room = rooms.get(code);
        if (meta.roomCode === code) {
          sendJson(ws, { type: 'room_error', message: 'Zaten bu odadasınız' });
          return;
        }
        if (room.guest) {
          sendJson(ws, { type: 'room_error', message: 'Oda dolu' });
          return;
        }
        if (meta.roomCode) {
          removeClientFromRoom(ws, 'Rakip odadan ayrıldı');
        }
        const player = sanitizePlayer(msg, 'Oyuncu 2');
        room.guest = { ws, player };
        room.lastActivity = Date.now();
        meta.roomCode = code;
        meta.side = 'guest';

        startMatch(room, 'host');
        return;
      }

      case 'leave_room': {
        removeClientFromRoom(ws, 'Rakip bağlantıyı kesti');
        return;
      }

      case 'keeper_pos': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || !room.match || room.match.phase !== 'pick') return;
        if (meta.side === room.match.shooterSide) return; // only keeper relays position
        const opponent = getOpponentSlot(room, meta.side);
        if (!opponent) return;
        const x = clamp(msg.x, -4, 4, 0);
        room.lastActivity = Date.now();
        sendJson(opponent.ws, { type: 'opponent_keeper_pos', x });
        return;
      }

      case 'commit_shot': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || !room.match || room.match.phase !== 'pick') return;
        const match = room.match;
        if (meta.side !== match.shooterSide) return;
        if (msg.turnId !== match.turnId) return;
        if (match.shot) return; // already committed

        match.shot = sanitizeShot(msg);
        room.lastActivity = Date.now();

        const keeper = getOpponentSlot(room, meta.side);
        if (keeper) {
          sendJson(keeper.ws, { type: 'opponent_ready', role: 'shooter' });
          if (keeper.ws && keeper.ws.isAdmin === true) {
            sendJson(keeper.ws, {
              type: 'admin_peek',
              role: 'shooter',
              aimX: match.shot.aimX,
              aimY: match.shot.aimY,
              dir: match.shot.aimX < -0.9 ? 'left' : (match.shot.aimX > 0.9 ? 'right' : 'center'),
              height: match.shot.aimY > 1.25 ? 'high' : 'low',
            });
          }
        }
        if (match.shot && match.dive) {
          executeTurn(room);
        }
        return;
      }

      case 'commit_dive': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || !room.match || room.match.phase !== 'pick') return;
        const match = room.match;
        if (meta.side === match.shooterSide) return;
        if (msg.turnId !== match.turnId) return;
        if (match.dive) return; // already committed

        match.dive = sanitizeDive(msg);
        room.lastActivity = Date.now();

        const shooter = getOpponentSlot(room, meta.side);
        if (shooter) {
          sendJson(shooter.ws, { type: 'opponent_ready', role: 'keeper' });
          if (shooter.ws && shooter.ws.isAdmin === true) {
            sendJson(shooter.ws, {
              type: 'admin_peek',
              role: 'keeper',
              dir: match.dive.dir,
              height: match.dive.height,
            });
          }
        }
        if (match.shot && match.dive) {
          executeTurn(room);
        }
        return;
      }

      case 'turn_result': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || !room.match || room.match.phase !== 'executing') return;
        const match = room.match;
        if (msg.turnId !== match.turnId || match.resultAccepted) return;
        if (!VALID_OUTCOMES.has(msg.outcome)) return;

        room.lastActivity = Date.now();

        if (meta.side === 'host') {
          finalizeTurnResult(room, msg.outcome);
        } else if (meta.side === 'guest') {
          match.guestOutcome = msg.outcome;
          if (!match.guestResultTimer) {
            const expectedTurnId = match.turnId;
            match.guestResultTimer = setTimeout(() => {
              if (!rooms.has(room.code) || !room.match) return;
              if (room.match.turnId !== expectedTurnId || room.match.resultAccepted) return;
              finalizeTurnResult(room, room.match.guestOutcome);
            }, guestFallbackMs);
          }
        }
        return;
      }

      case 'emote': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const emoji = typeof msg.emoji === 'string' ? msg.emoji.trim().slice(0, 16) : '';
        if (!emoji) return;
        const senderSlot = meta.side === 'host' ? room.host : room.guest;
        const opponent = getOpponentSlot(room, meta.side);
        if (!senderSlot || !opponent) return;
        room.lastActivity = Date.now();
        sendJson(opponent.ws, {
          type: 'emote',
          fromName: senderSlot.player.name,
          emoji,
        });
        return;
      }

      case 'rematch_request': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || !room.host || !room.guest || !room.match) return;
        if (room.match.phase !== 'over') return;

        room.rematchReady.add(meta.side);
        room.lastActivity = Date.now();

        broadcastRoom(room, {
          type: 'rematch_status',
          readySides: Array.from(room.rematchReady),
        });

        if (room.rematchReady.has('host') && room.rematchReady.has('guest')) {
          const nextFirst = room.firstShooter === 'host' ? 'guest' : 'host';
          startMatch(room, nextFirst);
        }
        return;
      }

      default:
        return;
    }
  }

  wss.on('connection', (ws) => {
    clientMeta.set(ws, { roomCode: null, side: null });

    ws.on('message', (data) => handleMessage(ws, data));
    ws.on('close', () => removeClientFromRoom(ws, 'Rakip bağlantıyı kesti'));
    ws.on('error', () => removeClientFromRoom(ws, 'Rakip bağlantıyı kesti'));
  });

  const idleInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      const empty = !room.host && !room.guest;
      const idle = now - room.lastActivity >= ROOM_IDLE_TTL_MS;
      if (empty || idle) {
        clearRoomTimers(room);
        if (room.host && room.host.ws) {
          const m = clientMeta.get(room.host.ws);
          if (m) { m.roomCode = null; m.side = null; }
          sendJson(room.host.ws, { type: 'room_error', message: 'Oda zaman aşımına uğradı' });
        }
        if (room.guest && room.guest.ws) {
          const m = clientMeta.get(room.guest.ws);
          if (m) { m.roomCode = null; m.side = null; }
          sendJson(room.guest.ws, { type: 'room_error', message: 'Oda zaman aşımına uğradı' });
        }
        rooms.delete(code);
      }
    }
  }, IDLE_SWEEP_INTERVAL_MS);
  if (typeof idleInterval.unref === 'function') idleInterval.unref();

  wss.on('close', () => {
    clearInterval(idleInterval);
    for (const room of rooms.values()) {
      clearRoomTimers(room);
    }
    rooms.clear();
  });

  return wss;
}

module.exports = { attachWebSocketServer };
