// src/realtime/useWebRTC.js

// Simple signaling + presence for StudyNest
// cd study-nest/src/realtime
// npm i
// npm start

// Minimal P2P mesh WebRTC with WS signaling.
// Works fine up to ~6 peers. For bigger rooms, move to an SFU later.

const STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

const WS_URL = 'ws://localhost:3001';

export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    me: null,                      // my clientId from server
    peers: new Map(),              // peerId -> { pc, stream, dc, name, hand }
    streamsCb: () => {},
    participantsCb: () => {},
    chatCb: () => {},
    localStream: null
  };

  // ---- Subscriptions ----
  function subscribeStreams(cb) { state.streamsCb = cb; }
  function subscribeParticipants(cb) { state.participantsCb = cb; }
  function onChat(cb) { state.chatCb = cb; }

  // ---- Emitters ----
  function emitChat(msg) { state.chatCb?.(msg); }

  function emitStreams() {
    const list = [];
    // Always include self if stream available
    if (state.localStream) {
      list.push({ id: state.me || 'me', stream: state.localStream, name: displayName });
    }
    for (const [id, p] of state.peers.entries()) {
      list.push({ id, stream: p.stream || null, name: p.name || 'Student' });
    }
    state.streamsCb(list);
  }

  function emitParticipants() {
    const list = [];
    if (state.me) {
      list.push({ id: state.me, name: displayName, hand: false }); // self
    }
    for (const [id, p] of state.peers.entries()) {
      list.push({ id, name: p.name || 'Student', hand: !!p.hand });
    }
    state.participantsCb(list);
  }

  // ---- WS handling ----
  function ensureWS() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;
    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
      state.ws.send(JSON.stringify({ type: 'join', roomId, name: displayName || 'Student' }));
    };

    state.ws.onmessage = async (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }

      if (m.type === 'joined') {
        state.me = m.clientId;
        // Seed existing participants (placeholders without streams yet)
        (m.participants || []).forEach(p => {
          if (p.id === state.me) return;
          if (!state.peers.has(p.id)) state.peers.set(p.id, { name: p.name });
        });
        emitParticipants(); emitStreams();

        // Initiate offers
        for (const [pid] of state.peers.entries()) {
          await createPeer(pid, true);
        }
        return;
      }

      if (m.type === 'peer-joined') {
        if (!state.peers.has(m.id)) state.peers.set(m.id, { name: m.name });
        emitParticipants(); emitStreams();
        createPeer(m.id, true);
        return;
      }

      if (m.type === 'peer-left') {
        const p = state.peers.get(m.id);
        if (p?.pc) try { p.pc.close(); } catch {}
        state.peers.delete(m.id);
        emitParticipants(); emitStreams();
        return;
      }

      if (m.type === 'hand') {
        const p = state.peers.get(m.id);
        if (p) { p.hand = m.up; emitParticipants(); }
        return;
      }

      if (m.type === 'offer') {
        await createPeer(m.from, false);
        const peer = state.peers.get(m.from);
        await peer.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
        const ans = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(ans);
        sendWS({ type: 'answer', to: m.from, sdp: peer.pc.localDescription });
        return;
      }

      if (m.type === 'answer') {
        const peer = state.peers.get(m.from);
        if (!peer?.pc) return;
        await peer.pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
        return;
      }

      if (m.type === 'ice') {
        const peer = state.peers.get(m.from);
        if (!peer?.pc) return;
        try { await peer.pc.addIceCandidate(m.candidate); } catch {}
        return;
      }
    };
  }

  function sendWS(obj) {
    if (state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(obj));
    }
  }

  // ---- Local Media ----
  async function getLocal(kind) {
    if (kind === 'screen') {
      return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }
    if (!state.localStream) {
      state.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      emitStreams();
    }
    return state.localStream;
  }

  // ---- Peer ----
  async function createPeer(peerId, isInitiator) {
    let peer = state.peers.get(peerId) || {};
    if (peer.pc) return peer;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    // Add local tracks
    const local = await getLocal('cam');
    local.getTracks().forEach(t => pc.addTrack(t, local));

    pc.ontrack = (e) => {
      peer.stream = e.streams[0];
      state.peers.set(peerId, peer);
      emitStreams();
    };

    // DataChannel
    let dc;
    if (isInitiator) {
      dc = pc.createDataChannel('chat');
      wireDC(peerId, dc);
    } else {
      pc.ondatachannel = (ev) => wireDC(peerId, ev.channel);
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendWS({ type: 'ice', to: peerId, candidate: ev.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        try { pc.close(); } catch {}
        state.peers.delete(peerId);
        emitParticipants(); emitStreams();
      }
    };

    peer.pc = pc;
    peer.dc = dc || null;
    state.peers.set(peerId, peer);

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWS({ type: 'offer', to: peerId, sdp: pc.localDescription });
    }

    emitParticipants(); emitStreams();
    return peer;
  }

  function wireDC(peerId, dc) {
    const peer = state.peers.get(peerId) || {};
    peer.dc = dc;
    state.peers.set(peerId, peer);

    dc.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'chat') emitChat(m);
    };
  }

  // ---- Public API ----
  return {
    async connect() {
      ensureWS();
      // optional REST call to bump DB participant count
      try {
        await fetch('http://localhost/StudyNest/study-nest/src/api/meetings.php/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: roomId, display_name: displayName || 'Student' })
        });
      } catch {}
    },

    disconnect() {
      state.ws?.close();
      state.peers.forEach(p => { try { p.pc.close(); } catch {} });
      state.peers.clear();
      emitStreams(); emitParticipants();
    },

    sendChat(payload) { // {text, author, ts}
      const msg = JSON.stringify({ type: 'chat', ...payload });
      for (const [, p] of state.peers.entries()) {
        try { p.dc?.readyState === 'open' && p.dc.send(msg); } catch {}
      }
      emitChat(payload);
    },

    async getLocalStream() { return await getLocal('cam'); },
    toggleHand(up) { sendWS({ type: 'hand', up: !!up }); },

    // mic/cam toggles
    setMic(on) {
      const s = state.localStream; if (!s) return;
      s.getAudioTracks().forEach(t => (t.enabled = !!on));
    },
    setCam(on) {
      const s = state.localStream; if (!s) return;
      s.getVideoTracks().forEach(t => (t.enabled = !!on));
    },

    async startShare() {
      const share = await getLocal('screen');
      for (const [, p] of state.peers.entries()) {
        const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(share.getVideoTracks()[0]);
      }
      state.localStream = share;
      emitStreams();

      const vt = share.getVideoTracks()[0];
      vt.addEventListener('ended', async () => {
        const cam = await getLocal('cam');
        for (const [, p] of state.peers.entries()) {
          const sender = p.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(cam.getVideoTracks()[0]);
        }
        state.localStream = cam;
        emitStreams();
      });
    },

    subscribeStreams,
    subscribeParticipants,
    onChat,
  };
}
