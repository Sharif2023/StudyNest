// src/realtime/useWebRTC.js

const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

const WS_URL = "ws://localhost:3001";

/**
 * Mesh P2P for Study Rooms
 * - Pre-creates transceivers to lock SDP m-line order
 * - Cam optional (gracefully degrades if NotReadableError)
 * - Screen share via replaceTrack (no renegotiation churn)
 * - Glare-safe negotiation
 * - DataChannel chat with WS fallback
 */
export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    me: null,

    peers: new Map(), // id -> Peer
    localCamStream: null,
    localScreenStream: null,
    camError: false,

    streamsCb: () => { },
    participantsCb: () => { },
    chatCb: () => { },

    // negotiation guards
    makingOffer: false,
    ignoreOffer: false,
  };

  /* ---------------- subscriptions ---------------- */
  function subscribeStreams(cb) {
    state.streamsCb = cb;
    emitStreams();
  }
  function subscribeParticipants(cb) {
    state.participantsCb = cb;
    emitParticipants();
  }
  function onChat(cb) {
    state.chatCb = cb;
  }

  /* ---------------- emitters ---------------- */
  function emitStreams() {
    const list = [];

    if (state.localCamStream) {
      list.push({
        id: (state.me || "me") + "::cam",
        stream: state.localCamStream,
        name: displayName || "You",
        self: true,
        type: "cam",
      });
    }
    if (state.localScreenStream) {
      list.push({
        id: (state.me || "me") + "::screen",
        stream: state.localScreenStream,
        name: (displayName || "You") + " (screen)",
        self: true,
        type: "screen",
      });
    }

    for (const [pid, p] of state.peers) {
      if (p.tracks.cam) {
        list.push({
          id: pid + "::cam",
          stream: p.tracks.cam,
          name: p.name || "Student",
          self: false,
          type: "cam",
        });
      }
      if (p.tracks.screen) {
        list.push({
          id: pid + "::screen",
          stream: p.tracks.screen,
          name: (p.name || "Student") + " (screen)",
          self: false,
          type: "screen",
        });
      }
    }

    state.streamsCb(list);
  }

  function emitParticipants() {
    const arr = [];
    if (state.me) {
      arr.push({ id: state.me, name: displayName || "You", hand: false, self: true });
    }
    for (const [pid, p] of state.peers) {
      // dedupe + stable
      arr.push({ id: pid, name: p.name || "Student", hand: !!p.hand, self: false });
    }
    state.participantsCb(arr);
  }

  function emitChat(msg) {
    state.chatCb?.(msg);
  }

  /* ---------------- signaling (WS) ---------------- */
  function ensureWS() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;

    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
      sendWS({ type: "join", roomId, name: displayName || "Student" });
    };

    state.ws.onmessage = async (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }

      if (m.type === "joined") {
        state.me = m.clientId;

        // add placeholders for existing peers
        (m.participants || []).forEach(p => {
          if (p.id === state.me) return;
          if (!state.peers.has(p.id)) state.peers.set(p.id, mkPeerShell(p.name));
        });

        emitParticipants(); emitStreams();

        // create peer connections as initiator
        for (const [pid] of state.peers) {
          await createPeer(pid, true);
        }
        return;
      }

      if (m.type === "peer-joined") {
        if (!state.peers.has(m.id)) {
          state.peers.set(m.id, mkPeerShell(m.name));
        }
        emitParticipants(); emitStreams();
        await createPeer(m.id, true);
        return;
      }

      if (m.type === "peer-left") {
        cleanupPeer(m.id);
        emitParticipants(); emitStreams();
        return;
      }

      if (m.type === "hand") {
        const p = state.peers.get(m.id);
        if (p) { p.hand = m.up; emitParticipants(); }
        return;
      }

      if (m.type === "chat") {
        // From WS → show as remote
        emitChat({ author: m.author, text: m.text, ts: m.ts, self: false });
        return;
      }

      // ---- WebRTC signaling ----
      if (m.type === "offer") {
        const peer = await createPeer(m.from, false);
        const pc = peer.pc;

        const offer = new RTCSessionDescription(m.sdp);

        const polite = state.me && m.to === state.me ? true : true; // we’ll be polite by default
        const isStable = pc.signalingState === "stable" || pc.signalingState === "have-local-offer";

        state.ignoreOffer = !polite && (state.makingOffer || !isStable);
        if (state.ignoreOffer) return;

        await pc.setRemoteDescription(offer);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        sendWS({ type: "answer", to: m.from, sdp: pc.localDescription });
        return;
      }

      if (m.type === "answer") {
        const peer = state.peers.get(m.from);
        if (!peer?.pc) return;
        const pc = peer.pc;
        if (pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
        return;
      }

      if (m.type === "ice") {
        const peer = state.peers.get(m.from);
        if (!peer?.pc) return;
        try { await peer.pc.addIceCandidate(m.candidate); } catch { }
        return;
      }
    };
  }

  function sendWS(obj) {
    if (state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(obj));
    }
  }

  /* ---------------- local media ---------------- */
  async function ensureLocalCam() {
    if (state.camError) return null;
    if (!state.localCamStream) {
      try {
        state.localCamStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        emitStreams();
      } catch (e) {
        // Don’t keep retrying — join without cam/mic
        state.camError = true;
        state.localCamStream = null;
        console.warn("ensureLocalCam: NotReadable/denied → joining without local media", e);
        return null;
      }
    }
    return state.localCamStream;
  }

  async function ensureLocalScreen() {
    try {
      // Keep it simple; most browsers don’t allow audio here reliably
      const share = await navigator.mediaDevices.getDisplayMedia({ video: true /*, audio: false*/ });
      state.localScreenStream = share;

      // reset when user stops from the browser UI
      const vt = share.getVideoTracks()[0];
      if (vt) vt.addEventListener("ended", () => stopScreenInternal());

      emitStreams();
      return share;
    } catch (err) {
      console.warn("Screen share denied/cancelled", err);
      return null;
    }
  }

  async function stopScreenInternal() {
    if (state.localScreenStream) {
      try { state.localScreenStream.getTracks().forEach(t => t.stop()); } catch { }
      state.localScreenStream = null;
    }

    for (const [, p] of state.peers) {
      if (p.senders.screen) {
        try {
          // Instead of removing: replace with a dummy/disabled track
          const silence = new MediaStreamTrackGenerator("video").track;
          p.senders.screen.replaceTrack(silence);
        } catch (err) {
          console.warn("Failed to null out screen sender", err);
        }
      }
    }
    emitStreams();
  }

  /* ---------------- peers ---------------- */
  function mkPeerShell(name) {
    return {
      name,
      hand: false,
      pc: null,
      dc: null, dcOpen: false, dcQueue: [],
      tracks: { cam: null, screen: null },
      senders: { cam: null, screen: null },

      // transceivers for stable m-line order
      tx: { audio: null, video: null, screen: null },
    };
  }

  function cleanupPeer(peerId) {
    const p = state.peers.get(peerId);
    if (!p) return;
    try { p.dc?.close?.(); } catch { }
    try { p.pc?.close?.(); } catch { }
    state.peers.delete(peerId);
  }

  async function createPeer(peerId, isInitiator) {
    let p = state.peers.get(peerId);
    if (!p) { p = mkPeerShell("Student"); state.peers.set(peerId, p); }
    if (p.pc) return p;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    // ------ lock m-line order with transceivers up-front ------
    // 1) main cam/mic
    p.tx.video = pc.addTransceiver("video", { direction: "sendrecv" });
    p.tx.audio = pc.addTransceiver("audio", { direction: "sendrecv" });
    // 2) dedicated "screen" video m-line (sendrecv lets remote show/hide too)
    p.tx.screen = pc.addTransceiver("video", { direction: "sendrecv" });

    // Attach local media (if available)
    const cam = state.localCamStream || (state.camError ? null : await ensureLocalCam());
    if (cam) {
      const v = cam.getVideoTracks()[0] || null;
      const a = cam.getAudioTracks()[0] || null;
      if (v) { await p.tx.video.sender.replaceTrack(v); p.senders.cam = p.tx.video.sender; }
      if (a) { await p.tx.audio.sender.replaceTrack(a); }
    }

    // ---- remote tracks ----
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      const track = e.track;

      const label = (track.label || "").toLowerCase();
      const settings = typeof track.getSettings === "function" ? track.getSettings() : {};
      const isScreen = track.kind === "video" && (
        label.includes("screen") || label.includes("window") || settings.displaySurface
      );

      if (track.kind === "video" && isScreen) {
        p.tracks.screen = stream;
      } else if (track.kind === "video") {
        p.tracks.cam = stream;
      }
      state.peers.set(peerId, p);
      emitStreams();
    };

    // ---- data channel ----
    if (isInitiator) {
      wireDC(peerId, pc.createDataChannel("chat"));
    } else {
      pc.ondatachannel = (ev) => wireDC(peerId, ev.channel);
    }

    // ---- ICE / conn state ----
    pc.onicecandidate = (ev) => { if (ev.candidate) sendWS({ type: "ice", to: peerId, candidate: ev.candidate }); };
    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanupPeer(peerId);
        emitParticipants(); emitStreams();
      }
    };

    // ---- negotiation (glare-safe) ----
    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWS({ type: "offer", to: peerId, sdp: pc.localDescription });
      } catch (err) {
        console.warn("negotiationneeded error", err);
      } finally {
        state.makingOffer = false;
      }
    };

    p.pc = pc;
    state.peers.set(peerId, p);

    // initial handshake
    if (isInitiator) {
      state.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWS({ type: "offer", to: peerId, sdp: pc.localDescription });
      state.makingOffer = false;
    }

    emitParticipants(); emitStreams();
    return p;
  }

  function wireDC(peerId, dc) {
    const p = state.peers.get(peerId) || mkPeerShell("Student");
    p.dc = dc;
    p.dcOpen = dc.readyState === "open";
    p.dcQueue ??= [];

    dc.onopen = () => {
      p.dcOpen = true;
      while (p.dcQueue.length) {
        try { dc.send(p.dcQueue.shift()); } catch { break; }
      }
    };
    dc.onclose = () => (p.dcOpen = false);
    dc.onerror = () => (p.dcOpen = false);

    dc.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "chat") emitChat({ author: m.author, text: m.text, ts: m.ts, self: false });
    };

    state.peers.set(peerId, p);
  }

  /* ---------------- public API ---------------- */
  return {
    async connect() {
      ensureWS();

      // optional presence hit
      try {
        await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: roomId, display_name: displayName || "Student" }),
        });
      } catch { }

      if (!window.__studynestLeaveHook) {
        window.addEventListener("beforeunload", () => {
          try {
            navigator.sendBeacon(
              "http://localhost/StudyNest/study-nest/src/api/meetings.php/leave",
              new Blob([JSON.stringify({ id: roomId })], { type: "application/json" })
            );
          } catch { }
        });
        window.__studynestLeaveHook = true;
      }
    },

    disconnect() {
      try { state.ws?.close(); } catch { }
      for (const [pid] of state.peers) cleanupPeer(pid);
      try { state.localCamStream?.getTracks().forEach(t => t.stop()); } catch { }
      try { state.localScreenStream?.getTracks().forEach(t => t.stop()); } catch { }
      state.localCamStream = null;
      state.localScreenStream = null;
      state.camError = false;
      emitStreams();
      emitParticipants();
      try {
        fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: roomId }),
        });
      } catch { }
    },

    async getLocalStream() {
      // for local self-preview; OK if null
      return await ensureLocalCam();
    },

    toggleHand(up) { sendWS({ type: "hand", up: !!up }); },

    setMic(on) { state.localCamStream?.getAudioTracks().forEach(t => (t.enabled = !!on)); },
    setCam(on) { state.localCamStream?.getVideoTracks().forEach(t => (t.enabled = !!on)); },

    // Chat: P2P + WS broadcast for reliability
    sendChat(payload) {
      const msg = { type: "chat", ...payload, self: undefined };
      for (const [, p] of state.peers) {
        if (p.dcOpen) {
          try { p.dc.send(JSON.stringify(msg)); } catch { }
        } else {
          p.dcQueue?.push?.(JSON.stringify(msg));
        }
      }
      sendWS(msg);                      // ensure remote delivery
      emitChat({ ...payload, self: true }); // local echo
    },

    // Screen share via replaceTrack (no add/remove m-line churn)
    async startShare() {
      const share = await ensureLocalScreen();
      if (!share) throw new Error("share-cancelled");
      const vTrack = share.getVideoTracks()[0];
      if (!vTrack) throw new Error("no-screen-video-track");

      for (const [, p] of state.peers) {
        if (!p.pc) continue;
        try {
          await p.tx.screen.sender.replaceTrack(vTrack);
          p.senders.screen = p.tx.screen.sender;
        } catch (err) {
          console.warn("replaceTrack(screen) failed for peer", err);
        }
      }
      emitStreams();
      return share;
    },

    async stopShare() { stopScreenInternal(); },

    subscribeStreams,
    subscribeParticipants,
    onChat,

    onShareEnded(cb) { cb && cb(); },
  };
}
