// src/realtime/useWebRTC.js

const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: "turn:relay1.expressturn.com:3478",
    username: "efree",
    credential: "turnpassword",
  },
];

// If you test across devices, consider using your LAN IP here (e.g. ws://192.168.1.10:3001)
const WS_URL = "ws://localhost:3001";

/**
 * Mesh P2P for Study Rooms (stable)
 * - Deterministic initiator (lexicographic clientId) to avoid dueling offers
 * - Perfect negotiation (polite/unpolite) to avoid glare
 * - Fixed m-line order via pre-added transceivers: [audio, camVideo, screenVideo]
 * - Always attach local tracks BEFORE sending any offer
 * - Screen share via replaceTrack (no add/remove churn)
 * - Robust DataChannel (P2P + WS broadcast fallback)
 * - Verbose logs for ICE/track debugging
 */
export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    me: null,

    peers: new Map(), // id -> Peer
    localCamStream: null,
    localScreenStream: null,
    camError: false,

    streamsCb: () => {},
    participantsCb: () => {},
    chatCb: () => {},

    // perfect-negotiation flags
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

    // local cam (show a placeholder card even if null)
    list.push({
      id: (state.me || "me") + "::cam",
      stream: state.localCamStream || null,
      name: displayName || "You",
      self: true,
      type: "cam",
    });

    if (state.localScreenStream) {
      list.push({
        id: (state.me || "me") + "::screen",
        stream: state.localScreenStream,
        name: (displayName || "You") + " (screen)",
        self: true,
        type: "screen",
      });
    }

    // peers (always push a cam entry so the UI opens a card immediately)
    for (const [pid, p] of state.peers) {
      list.push({
        id: pid + "::cam",
        stream: p.tracks.cam || null,
        name: p.name || "Student",
        self: false,
        type: "cam",
      });
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

        // placeholders for existing peers
        (m.participants || []).forEach(p => {
          if (p.id === state.me) return;
          if (!state.peers.has(p.id)) state.peers.set(p.id, mkPeerShell(p.name));
        });

        emitParticipants(); emitStreams();

        // Deterministic initiator: only the lexicographically smaller id initiates
        for (const [pid] of state.peers) {
          const iAmInitiator = state.me < pid;
          await createPeer(pid, iAmInitiator);
        }
        return;
      }

      if (m.type === "peer-joined") {
        if (!state.peers.has(m.id)) {
          state.peers.set(m.id, mkPeerShell(m.name));
        }
        emitParticipants(); emitStreams();

        const iAmInitiator = state.me < m.id;
        await createPeer(m.id, iAmInitiator);
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
        emitChat({ author: m.author, text: m.text, ts: m.ts, self: false });
        return;
      }

      // ---- WebRTC signaling ----
      if (m.type === "offer") {
        const peer = await createPeer(m.from, false);
        const pc = peer.pc;
        const offer = new RTCSessionDescription(m.sdp);

        // polite: true if THEIR id is greater than mine => they were initiator
        const polite = m.from > state.me;

        const isStable = pc.signalingState === "stable" || pc.signalingState === "have-local-offer";
        state.ignoreOffer = !polite && (state.makingOffer || !isStable);
        if (state.ignoreOffer) return;

        console.log("📩 offer from", m.from, "polite:", polite);
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
        console.log("📩 answer from", m.from);
        await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
        return;
      }

      if (m.type === "ice") {
        const peer = state.peers.get(m.from);
        if (!peer?.pc) return;
        try {
          await peer.pc.addIceCandidate(m.candidate);
        } catch (err) {
          console.warn("addIceCandidate failed", err);
        }
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
        console.log("🎥 local stream ready:", state.localCamStream.getTracks().map(t => t.kind));
        emitStreams();
      } catch (e) {
        // join without local media
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
      const share = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const vTrack = share.getVideoTracks()[0];
      state.localScreenStream = new MediaStream([vTrack]);
      vTrack.addEventListener("ended", () => stopScreenInternal());
      emitStreams();
      return vTrack;
    } catch (err) {
      console.warn("Screen share denied/cancelled", err);
      return null;
    }
  }

  async function stopScreenInternal() {
    if (state.localScreenStream) {
      try { state.localScreenStream.getTracks().forEach(t => t.stop()); } catch {}
      state.localScreenStream = null;
    }
    for (const [, p] of state.peers) {
      if (p.senders.screen) {
        try { await p.senders.screen.replaceTrack(null); } catch {}
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
      // flag: am I initiator against this peer?
      initiator: false,
    };
  }

  function cleanupPeer(peerId) {
    const p = state.peers.get(peerId);
    if (!p) return;
    try { p.dc?.close?.(); } catch {}
    try { p.pc?.close?.(); } catch {}
    state.peers.delete(peerId);
  }

  async function createPeer(peerId, isInitiator) {
    let p = state.peers.get(peerId);
    if (!p) { p = mkPeerShell("Student"); state.peers.set(peerId, p); }
    if (p.pc) return p;
    p.initiator = !!isInitiator;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    console.log("🟢 creating peer", peerId, "initiator:", isInitiator);

    // Helpful logs
    pc.oniceconnectionstatechange = () => console.log(peerId, "ICE", pc.iceConnectionState);
    pc.onconnectionstatechange = () => console.log(peerId, "PC", pc.connectionState);

    // ------ lock m-line order with transceivers up-front ------
    // Fixed order for EVERYONE: [audio, cam, screen]
    p.tx.audio  = pc.addTransceiver("audio", { direction: "sendrecv" });
    p.tx.video  = pc.addTransceiver("video", { direction: "sendrecv" });
    p.tx.screen = pc.addTransceiver("video", { direction: "sendrecv" });

    // Attach local tracks BEFORE any offer can be created
    const cam = await ensureLocalCam(); // ensures tracks exist
    if (cam) {
      const v = cam.getVideoTracks()[0] || null;
      const a = cam.getAudioTracks()[0] || null;
      if (a) {
        try { await p.tx.audio.sender.replaceTrack(a); } catch (err) { console.warn("attach audio failed", err); }
      }
      if (v) {
        try { await p.tx.video.sender.replaceTrack(v); p.senders.cam = p.tx.video.sender; } catch (err) { console.warn("attach video failed", err); }
      }
    }

    // ---- remote tracks ----
    pc.ontrack = (e) => {
      const track = e.track;
      // ⬇️ IMPORTANT: event.streams may be empty with transceivers+replaceTrack
      let stream = (e.streams && e.streams[0]) || null;
      if (!stream) stream = new MediaStream([track]); // guarantee a stream

      console.log("📡 track from", peerId, track.kind, track.label, "streams[]:", e.streams?.length || 0);

      const label = (track.label || "").toLowerCase();
      const isScreen =
        track.kind === "video" && (
          label.includes("screen") ||
          label.includes("window") ||
          (track.getSettings?.().displaySurface)
        );

      if (track.kind === "audio") {
        // merge audio into whichever video stream we already have
        if (p.tracks.cam)       p.tracks.cam.addTrack(track);
        else if (p.tracks.screen) p.tracks.screen.addTrack(track);
        else                    p.tracks.cam = stream;   // audio-first case
      } else {
        if (isScreen) p.tracks.screen = stream;
        else          p.tracks.cam = stream;
      }

      // in case the track starts muted, refresh when it becomes live
      track.onunmute = () => emitStreams();
      emitStreams();
    };

    // ---- data channel (both sides) ----
    if (isInitiator) {
      wireDC(peerId, pc.createDataChannel("chat", { ordered: true }));
    }
    pc.ondatachannel = (ev) => wireDC(peerId, ev.channel);

    // ---- ICE / conn state ----
    pc.onicecandidate = (ev) => { if (ev.candidate) sendWS({ type: "ice", to: peerId, candidate: ev.candidate }); };

    // ---- negotiation (perfect negotiation) ----
    pc.onnegotiationneeded = async () => {
      // only deterministic initiator should create offers
      if (!p.initiator) return;
      try {
        await ensureLocalCam();
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

    // initial handshake (only the initiator sends the first offer)
    if (isInitiator) {
      try {
        await ensureLocalCam();
        state.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWS({ type: "offer", to: peerId, sdp: pc.localDescription });
      } catch (err) {
        console.warn("initial offer failed", err);
      } finally {
        state.makingOffer = false;
      }
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
      // We still let the page call getLocalStream() for local preview,
      // but even if it doesn't, we’ll ensure tracks before any offer above.
      ensureWS();

      // presence (best-effort)
      try {
        await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: roomId, display_name: displayName || "Student" }),
        });
      } catch {}

      if (!window.__studynestLeaveHook) {
        window.addEventListener("beforeunload", () => {
          try {
            navigator.sendBeacon(
              "http://localhost/StudyNest/study-nest/src/api/meetings.php/leave",
              new Blob([JSON.stringify({ id: roomId })], { type: "application/json" })
            );
          } catch {}
        });
        window.__studynestLeaveHook = true;
      }
    },

    disconnect() {
      try { state.ws?.close(); } catch {}
      for (const [pid] of state.peers) cleanupPeer(pid);
      try { state.localCamStream?.getTracks().forEach(t => t.stop()); } catch {}
      try { state.localScreenStream?.getTracks().forEach(t => t.stop()); } catch {}
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
          body: JSON.stringify({ id: roomId } ),
        });
      } catch {}
    },

    async getLocalStream() {
      // for local self-preview; OK if null
      return await ensureLocalCam();
    },

    toggleHand(up) { sendWS({ type: "hand", up: !!up }); },

    setMic(on) { state.localCamStream?.getAudioTracks().forEach(t => (t.enabled = !!on)); },
    setCam(on) { state.localCamStream?.getVideoTracks().forEach(t => (t.enabled = !!on)); },

    // Chat: P2P + WS broadcast fallback (guaranteed 2-way)
    sendChat(payload) {
      const msg = { type: "chat", ...payload, self: undefined };

      // P2P path
      for (const [, p] of state.peers) {
        if (p.dcOpen) {
          try { p.dc.send(JSON.stringify(msg)); } catch {}
        } else {
          p.dcQueue?.push?.(JSON.stringify(msg));
        }
      }

      // WS broadcast path (ensures delivery if DC not open yet / after reload)
      sendWS(msg);

      // Local echo
      emitChat({ ...payload, self: true });
    },

    // Screen share via replaceTrack
    async startShare() {
      const vTrack = await ensureLocalScreen(); // Get the screen share track
      if (!vTrack) throw new Error("Screen share cancelled");

      for (const [, p] of state.peers) {
        if (p.tx?.screen?.sender) {
          try {
            await p.tx.screen.sender.replaceTrack(vTrack);
            p.senders.screen = p.tx.screen.sender;
          } catch (err) {
            console.warn("replaceTrack(screen) failed", err);
          }
        } else {
          console.warn("Sender not available for peer:", p);
        }
      }

      emitStreams();
    },

    async stopShare() { await stopScreenInternal(); },

    subscribeStreams,
    subscribeParticipants,
    onChat,

    onShareEnded(cb) { cb && cb(); },
  };
}
