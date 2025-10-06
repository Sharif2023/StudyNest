// ws-server.js
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 5173 });
const rooms = new Map(); // roomId -> Map(clientId -> {ws, name})

function send(ws, obj) {
  try { ws.readyState === 1 && ws.send(JSON.stringify(obj)); } catch {}
}

function broadcast(roomId, obj, exceptId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [cid, c] of room.entries()) {
    if (exceptId && cid === exceptId) continue;
    send(c.ws, obj);
  }
}

wss.on("connection", (ws) => {
  let roomId = null;
  let clientId = Math.random().toString(36).slice(2, 9);
  let name = "Student";

  ws.on("message", (buf) => {
    let m; try { m = JSON.parse(buf.toString()); } catch { return; }

    if (m.type === "join") {
      roomId = String(m.roomId);
      name = String(m.name || "Student");
      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);
      room.set(clientId, { ws, name });

      // tell the joiner about themselves + current peers
      send(ws, {
        type: "joined",
        clientId,
        participants: [...room.entries()].map(([id, v]) => ({ id, name: v.name })),
      });

      // notify others
      broadcast(roomId, { type: "peer-joined", id: clientId, name }, clientId);
      return;
    }

    if (!roomId) return;

    // forward signaling
    if (m.type === "offer" || m.type === "answer" || m.type === "ice") {
      const to = String(m.to);
      const room = rooms.get(roomId);
      const dest = room && room.get(to);
      if (dest) send(dest.ws, { ...m, from: clientId });
      return;
    }

    // reliable chat broadcast (everybody including sender’s peers)
    if (m.type === "chat") {
      broadcast(roomId, { ...m, from: clientId });
      return;
    }

    if (m.type === "hand") {
      broadcast(roomId, { type: "hand", id: clientId, up: !!m.up }, clientId);
      return;
    }
  });

  ws.on("close", () => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(clientId);
    broadcast(roomId, { type: "peer-left", id: clientId });
    if (room.size === 0) rooms.delete(roomId);
  });
});

console.log("WS signaling on ws://localhost:5173");
