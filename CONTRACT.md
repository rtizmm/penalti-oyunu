# Penaltı Oyunu — Shared Contract v3 (Online 1v1 Multiplayer)

All v2 contracts remain valid and unchanged. This section adds **Online 1v1 WebSocket Multiplayer** + cloud deploy config.

## Additional ownership (never edit a file you do not own)
| File | Owner |
|---|---|
| `src/ws-server.js`, `src/net.js`, `render.yaml`, `Dockerfile`, `.gitignore` | **net** |
| `server.js`, `package.json`, `index.html`, `style.css`, `src/main.js`, `src/ball.js`, `src/ai.js`, `README.md` | **game** |
| `src/scene.js`, `src/cameras.js`, `src/audio.js` | **world** |
| `src/characters.js` | **players-2** |

## src/ws-server.js (net)
- Dependency: `ws` (installed in `package.json` via `npm.cmd install ws` by `net` — Note: `game` does NOT touch `package.json` during v3 so `net` can safely run `npm.cmd install ws`).
- Exports `attachWebSocketServer(httpServer)` (CommonJS `module.exports = { attachWebSocketServer }` since `server.js` is CommonJS!).
- Listens on path `/ws` on the given Node `http.Server`.
- Also handles `GET /health`? No, `server.js` handles HTTP routes; `ws-server.js` attaches `WebSocketServer({ server: httpServer, path: '/ws' })`.
- Room lifecycle:
  - 4-char uppercase alphanumeric room code (avoiding ambiguous `0/O/1/I`), auto-cleaned when empty or after 30 min idle.
  - Tracks total connected clients & active rooms; responds to `{ type: 'ping', t }` with `{ type: 'pong', t, onlineCount, roomCount }`.
  - Client → Server messages:
    - `{ type: 'create_room', name, kitIndex, jerseyNumber, timeOfDay, weather }`
    - `{ type: 'join_room', code, name, kitIndex, jerseyNumber }`
    - `{ type: 'keeper_pos', x }` — relayed immediately to opponent during `pick` phase (throttled ~15Hz client-side)
    - `{ type: 'commit_shot', turnId, aimX, aimY, power, curl, shotType, timedQuality, stutter }`
    - `{ type: 'commit_dive', turnId, dir, height }`
    - `{ type: 'turn_result', turnId, outcome }` (`outcome`: `'goal'|'save'|'post'|'miss'`) — accepted once per `turnId` from host (or first reporter after 300ms fallback)
    - `{ type: 'emote', emoji }` — relayed to opponent
    - `{ type: 'rematch_request' }` — when both request, resets match swapping first shooter
    - `{ type: 'leave_room' }`
  - Server → Client messages:
    - `{ type: 'room_created', code, side: 'host' }`
    - `{ type: 'room_error', message }` (Turkish user-friendly error: `"Oda bulunamadı"`, `"Oda dolu"`, etc.)
    - `{ type: 'match_start', code, side: 'host'|'guest', players: { host: { name, kitIndex, jerseyNumber }, guest: { name, kitIndex, jerseyNumber } }, env: { timeOfDay, weather }, turn }`
      where `turn = { turnId, round, shooterSide: 'host'|'guest', windX, deadlineMs, scores: { host: 0, guest: 0 }, history: { host: [], guest: [] }, suddenDeath: false }`
    - `{ type: 'opponent_keeper_pos', x }`
    - `{ type: 'opponent_ready', role: 'shooter'|'keeper' }` (NEVER leaks aim or dive before both commit!)
    - `{ type: 'execute_turn', turnId, shot, dive, windX }` (sent once BOTH committed, or after 15s turn timeout auto-commits missing side)
    - `{ type: 'turn_scored', turnId, outcome, scores, history, nextTurn, matchOver, winnerSide }`
      (after 5 alternating kicks each, if mathematically decided or after sudden-death round win, `matchOver: true`, `winnerSide: 'host'|'guest'`)
    - `{ type: 'emote', fromName, emoji }`
    - `{ type: 'rematch_status', readySides: [...] }`
    - `{ type: 'opponent_left', message }`

## src/net.js (net) — Browser ES module
```js
export function createNetClient(handlers)
// handlers = { onOpen, onClose, onError, onStats({ onlineCount, roomCount, pingMs }),
//              onRoomCreated, onRoomError, onMatchStart, onOpponentKeeperPos,
//              onOpponentReady, onExecuteTurn, onTurnScored, onEmote,
//              onRematchStatus, onOpponentLeft }
// Auto-selects ws:// or wss:// based on window.location.protocol + window.location.host + '/ws'
// Also accepts optional custom serverUrl override if passed.
// Returns:
{
  connect(serverUrl?), disconnect(), isConnected(),
  createRoom(opts), joinRoom(code, opts), leaveRoom(),
  sendKeeperPos(x), commitShot(data), commitDive(data),
  reportResult(turnId, outcome), sendEmote(emoji), requestRematch(),
}
```

## Cloud Deploy Files (net)
- `render.yaml`: Render free-tier Web Service (`env: node`, `buildCommand: npm install`, `startCommand: node server.js`, `healthCheckPath: /`).
- `Dockerfile`: lightweight `node:22-alpine` container exposing `5188` (`PORT` env supported).
- `.gitignore`: `node_modules/`, `.DS_Store`, `*.log`.
