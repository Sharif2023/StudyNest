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

const WS_URL = "ws://localhost:5173";

export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    me: null,

    peers: new Map(),
    localCamStream: null,
    localScreenStream: null,
    camError: false,

    streamsCb: () => { },
    participantsCb: () => { },
    chatCb: () => { },

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

    // local cam
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

    // peers - FIXED: Properly handle all peer streams
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
      arr.push({ 
        id: state.me, 
        name: displayName || "You", 
        hand: false, 
        self: true,
        // FIXED: Add proper state tracking for host
        state: 'connected'
      });
    }
    for (const [pid, p] of state.peers) {
      arr.push({ 
        id: pid, 
        name: p.name || "Student", 
        hand: !!p.hand, 
        self: false,
        state: p.pc && p.pc.connectionState === 'connected' ? 'connected' : 'joining'
      });
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

        (m.participants || []).forEach(p => {
          if (p.id === state.me) return;
          if (!state.peers.has(p.id)) state.peers.set(p.id, mkPeerShell(p.name));
        });

        emitParticipants(); 
        emitStreams();

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
        emitParticipants(); 
        emitStreams();

        const iAmInitiator = state.me < m.id;
        await createPeer(m.id, iAmInitiator);
        return;
      }

      if (m.type === "peer-left") {
        cleanupPeer(m.id);
        emitParticipants(); 
        emitStreams();
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

      // WebRTC signaling
      if (m.type === "offer") {
        const peer = await createPeer(m.from, false);
        const pc = peer.pc;
        const offer = new RTCSessionDescription(m.sdp);

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
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          },
        });
        console.log("🎥 local stream ready:", state.localCamStream.getTracks().map(t => t.kind));
        emitStreams();
      } catch (e) {
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
      const share = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true // FIXED: Include audio for screen share
      });
      state.localScreenStream = share;
      
      // FIXED: Handle screen share ended properly
      share.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          stopScreenInternal();
        });
      });
      
      emitStreams();
      return share;
    } catch (err) {
      console.warn("Screen share denied/cancelled", err);
      return null;
    }
  }

  async function stopScreenInternal() {
    if (state.localScreenStream) {
      try { 
        state.localScreenStream.getTracks().forEach(t => t.stop()); 
      } catch { }
      state.localScreenStream = null;
    }
    
    // FIXED: Properly stop screen sharing for all peers
    for (const [, p] of state.peers) {
      if (p.senders.screen) {
        try { 
          await p.senders.screen.replaceTrack(null); 
        } catch { }
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
      dc: null, 
      dcOpen: false, 
      dcQueue: [],
      tracks: { cam: null, screen: null },
      senders: { cam: null, screen: null },
      tx: { audio: null, video: null, screen: null },
      initiator: false,
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
    p.initiator = !!isInitiator;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    console.log("🟢 creating peer", peerId, "initiator:", isInitiator);

    pc.oniceconnectionstatechange = () => {
      console.log(peerId, "ICE", pc.iceConnectionState);
      emitParticipants(); // FIXED: Update participant state on connection changes
    };
    pc.onconnectionstatechange = () => {
      console.log(peerId, "PC", pc.connectionState);
      emitParticipants(); // FIXED: Update participant state on connection changes
    };

    // Fixed transceiver order
    p.tx.audio = pc.addTransceiver("audio", { direction: "sendrecv" });
    p.tx.video = pc.addTransceiver("video", { direction: "sendrecv" });
    p.tx.screen = pc.addTransceiver("video", { direction: "sendrecv" });

    // Attach local tracks
    const cam = await ensureLocalCam();
    if (cam) {
      const v = cam.getVideoTracks()[0] || null;
      const a = cam.getAudioTracks()[0] || null;
      
      // FIXED: Properly handle audio tracks
      if (a) {
        try { 
          await p.tx.audio.sender.replaceTrack(a); 
          a.enabled = true; // Ensure audio is enabled
        } catch (err) { 
          console.warn("attach audio failed", err); 
        }
      }
      if (v) {
        try { 
          await p.tx.video.sender.replaceTrack(v); 
          p.senders.cam = p.tx.video.sender; 
        } catch (err) { 
          console.warn("attach video failed", err); 
        }
      }
    }

    // FIXED: Improved track handling
    pc.ontrack = (e) => {
      const track = e.track;
      let stream = (e.streams && e.streams[0]) || new MediaStream([track]);

      console.log("📡 track from", peerId, track.kind, track.label, "mid:", e.transceiver.mid);

      const label = (track.label || "").toLowerCase();
      const isScreen = track.kind === "video" && (
        label.includes("screen") ||
        label.includes("window") ||
        (track.getSettings?.().displaySurface)
      );

      if (isScreen) {
        p.tracks.screen = stream;
      } else if (track.kind === "video") {
        p.tracks.cam = stream;
      } else if (track.kind === "audio") {
        // FIXED: Better audio track handling
        if (p.tracks.cam) {
          p.tracks.cam.addTrack(track);
        } else if (p.tracks.screen) {
          p.tracks.screen.addTrack(track);
        } else {
          p.tracks.cam = stream;
        }
      }

      track.onunmute = () => {
        console.log("🔊 track unmuted", track.kind, peerId);
        emitStreams();
      };
      
      track.onended = () => {
        console.log("🔚 track ended", track.kind, peerId);
        if (isScreen) {
          p.tracks.screen = null;
        } else if (track.kind === "video") {
          p.tracks.cam = null;
        }
        emitStreams();
      };

      emitStreams();
    };

    // Data channel
    if (isInitiator) {
      wireDC(peerId, pc.createDataChannel("chat", { ordered: true }));
    }
    pc.ondatachannel = (ev) => wireDC(peerId, ev.channel);

    // ICE
    pc.onicecandidate = (ev) => { 
      if (ev.candidate) {
        sendWS({ type: "ice", to: peerId, candidate: ev.candidate }); 
      }
    };

    // Negotiation
    pc.onnegotiationneeded = async () => {
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

    // Initial handshake
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

    emitParticipants(); 
    emitStreams();
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
      return await ensureLocalCam();
    },

    toggleHand(up) { sendWS({ type: "hand", up: !!up }); },

    // FIXED: Proper mic control
    setMic(on) { 
      if (state.localCamStream) {
        state.localCamStream.getAudioTracks().forEach(t => {
          t.enabled = !!on;
          console.log("🎤 Mic", on ? "enabled" : "disabled");
        });
      }
    },
    
    setCam(on) { 
      if (state.localCamStream) {
        state.localCamStream.getVideoTracks().forEach(t => {
          t.enabled = !!on;
          console.log("📷 Camera", on ? "enabled" : "disabled");
        });
      }
    },

    sendChat(payload) {
      const msg = { type: "chat", ...payload, self: undefined };

      for (const [, p] of state.peers) {
        if (p.dcOpen) {
          try { p.dc.send(JSON.stringify(msg)); } catch { }
        } else {
          p.dcQueue?.push?.(JSON.stringify(msg));
        }
      }

      sendWS(msg);
      emitChat({ ...payload, self: true });
    },

    async startShare() {
      const screenStream = await ensureLocalScreen();
      if (!screenStream) throw new Error("Screen share cancelled");

      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0];

      for (const [, p] of state.peers) {
        if (p.tx?.screen?.sender) {
          try {
            // FIXED: Replace track for screen sharing
            await p.tx.screen.sender.replaceTrack(videoTrack);
            p.senders.screen = p.tx.screen.sender;
          } catch (err) {
            console.warn("replaceTrack(screen) failed", err);
          }
        }
      }

      emitStreams();
    },

    async stopShare() { 
      await stopScreenInternal(); 
    },

    subscribeStreams,
    subscribeParticipants,
    onChat,

    onShareEnded(cb) { 
      // FIXED: Proper share ended callback
      if (cb && state.localScreenStream) {
        state.localScreenStream.getTracks().forEach(track => {
          track.addEventListener("ended", cb);
        });
      }
    },
  };
}