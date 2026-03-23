const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = 5173;
const wss = new WebSocket.Server({ port: PORT });

/**
 * State: { roomId: { clients: Map<clientId, ws>, meta: {title}, users: Map<clientId, {name, hand, joinedAt}> } }
 */
const rooms = new Map();

function send(ws, type, payload) {
  try { ws.send(JSON.stringify({ type, ...payload })); } catch { }
}
function broadcast(roomId, exceptId, type, payload) {
  const room = rooms.get(roomId); if (!room) return;
  for (const [cid, socket] of room.clients.entries()) {
    if (cid === exceptId) continue;
    send(socket, type, payload);
  }
}
function roomSnapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { participants: [] };
  const participants = [];
  for (const [cid, u] of room.users.entries()) {
    participants.push({ id: cid, stableId: u.stableId, name: u.name || 'Student', hand: !!u.hand });
  }
  return { participants };
}

wss.on('connection', (ws) => {
  let clientId = uuidv4();
  let roomId = null;

  ws.on('message', (msg) => {
    let m; try { m = JSON.parse(msg); } catch { return; }

    // {type:'join', roomId, name, stableId?} — stableId dedupes same user reconnecting (Meet-style)
    if (m.type === 'join') {
      roomId = m.roomId;
      const stableKey =
        m.stableId != null && String(m.stableId).trim() !== ''
          ? String(m.stableId).trim()
          : clientId;
      if (!rooms.has(roomId)) rooms.set(roomId, { clients: new Map(), users: new Map(), meta: {} });
      const room = rooms.get(roomId);

      // Evict older socket for the same stable identity so roster stays one row per person
      for (const [cid, oldWs] of [...room.clients.entries()]) {
        const u = room.users.get(cid);
        if (!u || u.stableId !== stableKey) continue;
        room.clients.delete(cid);
        room.users.delete(cid);
        broadcast(roomId, clientId, 'peer-left', { id: cid });
        try {
          oldWs.close(4000, 'replaced');
        } catch { }
      }

      room.clients.set(clientId, ws);
      room.users.set(clientId, {
        name: m.name || 'Student',
        hand: false,
        joinedAt: Date.now(),
        stableId: stableKey,
      });

      send(ws, 'joined', { clientId, stableId: stableKey, ...roomSnapshot(roomId) });
      broadcast(roomId, clientId, 'peer-joined', { id: clientId, stableId: stableKey, name: m.name || 'Student' });
      return;
    }

    // Explicit leave so peers drop the tile immediately (before TCP teardown)
    if (m.type === 'leave-room') {
      const room = rooms.get(roomId);
      if (!room) return;
      const had = room.clients.has(clientId);
      room.clients.delete(clientId);
      room.users.delete(clientId);
      if (had) broadcast(roomId, clientId, 'peer-left', { id: clientId });
      if (room.clients.size === 0) rooms.delete(roomId);
      roomId = null;
      try {
        ws.close(1000, 'leave');
      } catch { }
      return;
    }

    // WebRTC relay: offer/answer/ice
    // {type:'offer', to, sdp}
    // {type:'answer', to, sdp}
    // {type:'ice', to, candidate}
    if (['offer', 'answer', 'ice'].includes(m.type)) {
      const room = rooms.get(roomId); if (!room) return;
      const dest = room.clients.get(m.to);
      if (dest) send(dest, m.type, { from: clientId, ...m });
      return;
    }

    // Datachannel meta: hand toggle
    if (m.type === 'hand') {
      const room = rooms.get(roomId); if (!room) return;
      const u = room.users.get(clientId); if (!u) return;
      u.hand = !!m.up;
      broadcast(roomId, null, 'hand', { id: clientId, up: !!m.up });
      return;
    }

    // Chat broadcast
    if (m.type === 'chat') {
      if (m.to) {
        const room = rooms.get(roomId);
        const dest = room && room.clients.get(m.to);
        if (dest) send(dest, 'chat', { ...m, from: clientId });
        return;
      }
      broadcast(roomId, clientId, 'chat', { ...m, from: clientId });
      return;
    }

    // Whiteboard forwarding
    if (m.type === 'wb-forward' && m.payload) {
      const payload = { ...m.payload, from: clientId };
      // If targeted sync response, send to individual
      if (payload.type === 'wb-sync-response' && payload.to) {
        const room = rooms.get(roomId);
        const dest = room && room.clients.get(payload.to);
        if (dest) send(dest, 'wb-forward', payload);
        return;
      }
      // Otherwise broadcast
      broadcast(roomId, clientId, 'wb-forward', payload);
      return;
    }

    // Host / client signals meeting finished — everyone in the room should leave UI
    if (m.type === 'meeting-ended') {
      const rid = m.roomId || roomId;
      if (!rid) return;
      broadcast(rid, null, 'meeting-ended', { roomId: rid });
      return;
    }

    // Presence ping
    if (m.type === 'ping') {
      send(ws, 'pong', { t: Date.now() });
      return;
    }
  });

  ws.on('close', () => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const had = room.clients.has(clientId);
    room.clients.delete(clientId);
    room.users.delete(clientId);
    if (had) broadcast(roomId, clientId, 'peer-left', { id: clientId });
    if (room.clients.size === 0) rooms.delete(roomId);
    roomId = null;
  });
});

console.log('StudyNest signaling server on ws://localhost:' + PORT);
