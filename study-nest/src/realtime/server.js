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
    participants.push({ id: cid, name: u.name || 'Student', hand: !!u.hand });
  }
  return { participants };
}

wss.on('connection', (ws) => {
  let clientId = uuidv4();
  let roomId = null;

  ws.on('message', (msg) => {
    let m; try { m = JSON.parse(msg); } catch { return; }

    // {type:'join', roomId, name}
    if (m.type === 'join') {
      roomId = m.roomId;
      if (!rooms.has(roomId)) rooms.set(roomId, { clients: new Map(), users: new Map(), meta: {} });
      const room = rooms.get(roomId);
      room.clients.set(clientId, ws);
      room.users.set(clientId, { name: m.name || 'Student', hand: false, joinedAt: Date.now() });

      // Send snapshot to this client
      send(ws, 'joined', { clientId, ...roomSnapshot(roomId) });
      // Notify others
      broadcast(roomId, clientId, 'peer-joined', { id: clientId, name: m.name || 'Student' });
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
    room.clients.delete(clientId);
    room.users.delete(clientId);
    broadcast(roomId, clientId, 'peer-left', { id: clientId });
    if (room.clients.size === 0) rooms.delete(roomId);
  });
});

console.log('StudyNest signaling server on ws://localhost:' + PORT);
