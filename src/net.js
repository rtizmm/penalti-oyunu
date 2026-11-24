const PING_INTERVAL_MS = 4000;
const KEEPER_THROTTLE_MS = 66; // ~15Hz

function resolveDefaultWsUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return 'ws://localhost:5188/ws';
}

export function createNetClient(handlers = {}) {
  let ws = null;
  let pingTimer = null;
  let keeperThrottleTimer = null;
  let lastKeeperSendAt = 0;
  let pendingKeeperX = null;

  function clearTimers() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (keeperThrottleTimer) {
      clearTimeout(keeperThrottleTimer);
      keeperThrottleTimer = null;
    }
    pendingKeeperX = null;
  }

  function send(payload) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function sendPing() {
    send({ type: 'ping', t: Date.now() });
  }

  function handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'pong': {
        const sentAt = typeof msg.t === 'number' ? msg.t : Date.now();
        const pingMs = Math.max(0, Date.now() - sentAt);
        handlers.onStats?.({
          onlineCount: Number(msg.onlineCount) || 0,
          roomCount: Number(msg.roomCount) || 0,
          pingMs,
        });
        break;
      }
      case 'room_created':
        handlers.onRoomCreated?.(msg);
        break;
      case 'room_error':
        handlers.onRoomError?.(msg);
        break;
      case 'match_start':
        handlers.onMatchStart?.(msg);
        break;
      case 'opponent_keeper_pos':
        handlers.onOpponentKeeperPos?.(msg);
        break;
      case 'opponent_ready':
        handlers.onOpponentReady?.(msg);
        break;
      case 'execute_turn':
        handlers.onExecuteTurn?.(msg);
        break;
      case 'turn_scored':
        handlers.onTurnScored?.(msg);
        break;
      case 'emote':
        handlers.onEmote?.(msg);
        break;
      case 'rematch_status':
        handlers.onRematchStatus?.(msg);
        break;
      case 'opponent_left':
        handlers.onOpponentLeft?.(msg);
        break;
      default:
        break;
    }
  }

  function disconnect() {
    clearTimers();
    if (ws) {
      const prev = ws;
      ws = null;
      prev.onopen = null;
      prev.onmessage = null;
      prev.onerror = null;
      prev.onclose = null;
      try {
        if (prev.readyState === 0 || prev.readyState === 1) {
          prev.close();
        }
      } catch {
        // ignore
      }
    }
  }

  function connect(serverUrl) {
    disconnect();
    const url = serverUrl || resolveDefaultWsUrl();
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      if (ws !== socket) return;
      sendPing();
      pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
      handlers.onOpen?.();
    };

    socket.onmessage = (event) => {
      if (ws !== socket) return;
      handleMessage(event.data);
    };

    socket.onerror = (err) => {
      if (ws !== socket) return;
      handlers.onError?.(err);
    };

    socket.onclose = (ev) => {
      if (ws !== socket) return;
      clearTimers();
      ws = null;
      handlers.onClose?.(ev);
    };
  }

  function isConnected() {
    return Boolean(ws && ws.readyState === 1);
  }

  function createRoom(opts = {}) {
    return send({
      type: 'create_room',
      name: opts.name,
      kitIndex: opts.kitIndex,
      jerseyNumber: opts.jerseyNumber,
      timeOfDay: opts.timeOfDay,
      weather: opts.weather,
    });
  }

  function joinRoom(code, opts = {}) {
    return send({
      type: 'join_room',
      code,
      name: opts.name,
      kitIndex: opts.kitIndex,
      jerseyNumber: opts.jerseyNumber,
    });
  }

  function leaveRoom() {
    return send({ type: 'leave_room' });
  }

  function sendKeeperPos(x) {
    if (!isConnected()) return false;
    const now = Date.now();
    const elapsed = now - lastKeeperSendAt;
    if (elapsed >= KEEPER_THROTTLE_MS) {
      lastKeeperSendAt = now;
      pendingKeeperX = null;
      if (keeperThrottleTimer) {
        clearTimeout(keeperThrottleTimer);
        keeperThrottleTimer = null;
      }
      return send({ type: 'keeper_pos', x });
    }
    pendingKeeperX = x;
    if (!keeperThrottleTimer) {
      keeperThrottleTimer = setTimeout(() => {
        keeperThrottleTimer = null;
        if (pendingKeeperX !== null && isConnected()) {
          lastKeeperSendAt = Date.now();
          const val = pendingKeeperX;
          pendingKeeperX = null;
          send({ type: 'keeper_pos', x: val });
        }
      }, KEEPER_THROTTLE_MS - elapsed);
    }
    return true;
  }

  function commitShot(data = {}) {
    return send({
      type: 'commit_shot',
      turnId: data.turnId,
      aimX: data.aimX,
      aimY: data.aimY,
      power: data.power,
      curl: data.curl,
      shotType: data.shotType,
      timedQuality: data.timedQuality,
      stutter: data.stutter,
    });
  }

  function commitDive(data = {}) {
    return send({
      type: 'commit_dive',
      turnId: data.turnId,
      dir: data.dir,
      height: data.height,
    });
  }

  function reportResult(turnId, outcome) {
    return send({ type: 'turn_result', turnId, outcome });
  }

  function sendEmote(emoji) {
    return send({ type: 'emote', emoji });
  }

  function requestRematch() {
    return send({ type: 'rematch_request' });
  }

  return {
    connect,
    disconnect,
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    sendKeeperPos,
    commitShot,
    commitDive,
    reportResult,
    sendEmote,
    requestRematch,
  };
}
