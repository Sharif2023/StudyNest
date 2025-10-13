// =========================
// FILE: src/realtime/useWebRTC.js
// =========================

/*
Key upgrades
- Perfect Negotiation pattern (robust against glare)
- Deterministic screen/cam classification (via MID / hints)
- Renegotiate on screen start/stop
- Track lifecycle cleanups
- Speaking detection via WebAudio
- Lightweight stats hook
- Screen tiles only when a live screen video track exists

Mic/connection robustness:
- Audio-first capture so mic works even if camera fails or is absent
- Graceful AV->audio-only fallback
- ICE candidates are queued until remoteDescription is set
- **NEW:** Force an initial offer after binding tracks (some browsers miss negotiationneeded)
*/

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

// TIP: do NOT share a port with your dev server (e.g. Vite on 5173).
// If your ws-server also runs on 5173, move it (e.g. 5174) and update this URL.
const WS_URL = "ws://localhost:5173";

export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    wsTimer: null,
    me: null,

    // id -> { pc, dc, name, tracks, senders, tx, polite, makingOffer, ignoreOffer, iceQueue }
    peers: new Map(),

    // Local media
    localMicStream: null,     // audio (always try to have this)
    localCamStream: null,     // optional (video)
    localScreenStream: null,  // optional (screen)
    camDenied: false,         // remember if camera previously failed

    // Desired UI states
    desiredMicOn: true,

    // Emitters
    streamsCb: () => {},
    participantsCb: () => {},
    chatCb: () => {},
    speakingCb: () => {},
    statsCb: () => {},

    // VAD
    audioCtx: null,
    speakingIds: new Set(),
  };

  /* ================= subscriptions ================= */
  function subscribeStreams(cb) { state.streamsCb = cb; emitStreams(); }
  function subscribeParticipants(cb) { state.participantsCb = cb; emitParticipants(); }
  function subscribeSpeaking(cb) { state.speakingCb = cb; }
  function subscribeStats(cb) { state.statsCb = cb; }
  function onChat(cb) { state.chatCb = cb; }

  /* ================= emitters ================= */
  const hasLiveVideo = (stream) => {
    try { return !!(stream && stream.getVideoTracks && stream.getVideoTracks().some(t => t.readyState === "live")); }
    catch { return false; }
  };

  function emitStreams() {
    const list = [];

    // local cam tile (mic-only stream doesn’t produce a tile)
    if (state.localCamStream) {
      list.push({
        id: (state.me || "me") + "::cam",
        stream: state.localCamStream,
        name: displayName || "You",
        self: true,
        type: "cam",
      });
    }

    if (hasLiveVideo(state.localScreenStream)) {
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
        list.push({ id: pid + "::cam", stream: p.tracks.cam, name: p.name || "Student", self: false, type: "cam" });
      }
      if (hasLiveVideo(p.tracks.screen)) {
        list.push({ id: pid + "::screen", stream: p.tracks.screen, name: (p.name || "Student") + " (screen)", self: false, type: "screen" });
      }
    }

    state.streamsCb(list);
  }

  function emitParticipants() {
    const arr = [];
    if (state.me) {
      arr.push({ id: state.me, name: displayName || "You", hand: false, self: true, state: "connected" });
    }
    for (const [pid, p] of state.peers) {
      const connected = p.pc && p.pc.connectionState === "connected";
      arr.push({ id: pid, name: p.name || "Student", hand: !!p.hand, self: false, state: connected ? "connected" : "joining" });
    }
    state.participantsCb(arr);
  }

  const emitSpeaking = () => state.speakingCb(Array.from(state.speakingIds));
  const emitStatsForPeer = (pid, stats) => state.statsCb(pid, stats);

  /* ================= WS (signaling) ================= */
  function startWS() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;
    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
      sendWS({ type: "join", roomId, name: displayName || "Student" });
      state.wsTimer && clearInterval(state.wsTimer);
      state.wsTimer = setInterval(() => sendWS({ type: "ping" }), 15000);
    };

    state.ws.onclose = () => {
      state.wsTimer && clearInterval(state.wsTimer);
      setTimeout(startWS, 1500);
    };

    state.ws.onmessage = async (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }

      if (m.type === "joined") {
        state.me = m.clientId;
        (m.participants || []).forEach(p => {
          if (p.id !== state.me && !state.peers.has(p.id)) state.peers.set(p.id, newPeerShell(p.name));
        });
        for (const [pid] of state.peers) { await ensurePeer(pid); }
        emitParticipants(); emitStreams();
        return;
      }

      if (m.type === "peer-joined") {
        if (!state.peers.has(m.id)) state.peers.set(m.id, newPeerShell(m.name));
        await ensurePeer(m.id);
        emitParticipants(); emitStreams();
        return;
      }

      if (m.type === "peer-left") {
        cleanupPeer(m.id);
        emitParticipants(); emitStreams();
        return;
      }

      if (m.type === "hand") {
        const p = state.peers.get(m.id); if (p) { p.hand = !!m.up; emitParticipants(); }
        return;
      }

      if (m.type === "chat") {
        state.chatCb?.({ author: m.author, text: m.text, ts: m.ts, self: false });
        return;
      }

      // Perfect Negotiation + ICE buffering
      if (m.type === "offer" || m.type === "answer" || m.type === "ice") {
        const peer = await ensurePeer(m.from);
        const pc = peer.pc;

        if (m.type === "offer") {
          const offer = new RTCSessionDescription(m.sdp);
          const offerCollision = (peer.makingOffer || pc.signalingState !== "stable");
          peer.ignoreOffer = !peer.polite && offerCollision;
          if (peer.ignoreOffer) return;

          await pc.setRemoteDescription(offer);
          await ensureLocalMediaReady(); // ensure at least audio is attached
          await pc.setLocalDescription(await pc.createAnswer());
          sendWS({ type: "answer", to: m.from, sdp: pc.localDescription });

          flushQueuedIce(peer);
          return;
        }

        if (m.type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
            flushQueuedIce(peer);
          }
          return;
        }

        if (m.type === "ice") {
          if (!pc.remoteDescription) {
            peer.iceQueue.push(m.candidate);
          } else {
            try { await pc.addIceCandidate(m.candidate); } catch (e) { console.warn("addIceCandidate failed", e); }
          }
          return;
        }
      }
    };
  }

  function sendWS(obj) {
    try { state.ws?.readyState === 1 && state.ws.send(JSON.stringify(obj)); } catch {}
  }

  /* ================= Local media ================= */

  async function ensureLocalMic() {
    if (state.localMicStream) return state.localMicStream;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      mic.getAudioTracks().forEach(t => (t.enabled = !!state.desiredMicOn));
      try { hookSpeakingDetection(mic); } catch {}
      state.localMicStream = mic;
      return mic;
    } catch (e) {
      console.warn("getUserMedia(audio) failed", e);
      return null;
    }
  }

  async function ensureLocalCam() {
    if (state.camDenied) return state.localCamStream;
    if (state.localCamStream) return state.localCamStream;

    try {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      state.localCamStream = cam;
      emitStreams();
      return cam;
    } catch (e) {
      console.warn("getUserMedia(video) failed; staying audio-only", e);
      state.camDenied = true;
      return null;
    }
  }

  async function ensureLocalMediaReady() {
    await ensureLocalMic();
    await ensureLocalCam();
    for (const [, p] of state.peers) {
      await bindLocalTracksToPeer(p);
    }
  }

  async function ensureLocalScreen() {
    try {
      const share = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });
      const v = share.getVideoTracks()[0];
      try { v && (v.contentHint = "text"); } catch {}

      share.getTracks().forEach(t => t.addEventListener("ended", () => stopScreenInternal(true)));
      state.localScreenStream = share;
      emitStreams();
      if (v) waitTrackLive(v, emitStreams);
      return share;
    } catch (err) {
      console.warn("getDisplayMedia denied", err);
      return null;
    }
  }

  /* ================= Peers ================= */
  function newPeerShell(name) {
    return {
      name,
      hand: false,
      pc: null,
      dc: null,
      dcOpen: false,
      dcQueue: [],
      tracks: { cam: null, screen: null },
      senders: { cam: null, screen: null },
      tx: {},
      polite: false,
      makingOffer: false,
      ignoreOffer: false,
      iceQueue: [],
    };
  }

  function cleanupPeer(pid) {
    const p = state.peers.get(pid); if (!p) return;
    try { p.dc?.close?.(); } catch {}
    try { p.pc?.close?.(); } catch {}
    state.peers.delete(pid);
  }

  async function ensurePeer(pid) {
    let p = state.peers.get(pid);
    if (!p) { p = newPeerShell("Student"); state.peers.set(pid, p); }
    if (p.pc) return p;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    // polite = my id lexicographically larger than peer id
    p.polite = state.me && pid && (state.me < pid ? false : true);

    // fixed MID order: 0=audio, 1=cam, 2=screen
    p.tx.audio  = pc.addTransceiver("audio", { direction: "sendrecv" });
    p.tx.video  = pc.addTransceiver("video", { direction: "sendrecv" });
    p.tx.screen = pc.addTransceiver("video", { direction: "sendrecv" });

    await ensureLocalMediaReady();
    await bindLocalTracksToPeer(p);

    // --- IMPORTANT: kick the first offer explicitly (negotiationneeded can be flaky)
    queueMicrotask(async () => {
      try {
        if (pc.signalingState === "stable") {
          p.makingOffer = true;
          await pc.setLocalDescription(await pc.createOffer());
          sendWS({ type: "offer", to: pid, sdp: pc.localDescription });
        }
      } catch (err) {
        console.warn("initial offer failed", err);
      } finally {
        p.makingOffer = false;
      }
    });

    // Perfect Negotiation wires
    pc.onnegotiationneeded = async () => {
      try {
        p.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        sendWS({ type: "offer", to: pid, sdp: pc.localDescription });
      } catch (err) {
        console.warn("negotiationneeded error", err);
      } finally {
        p.makingOffer = false;
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendWS({ type: "ice", to: pid, candidate: ev.candidate });
    };

    pc.onconnectionstatechange = () => { emitParticipants(); };
    pc.oniceconnectionstatechange = () => { emitParticipants(); };

    pc.ondatachannel = (ev) => wireDC(pid, ev.channel);

    pc.ontrack = (e) => {
      const track = e.track;
      const stream = (e.streams && e.streams[0]) || new MediaStream([track]);
      const tr = e.transceiver;
      const mid = tr && typeof tr.mid === "string" ? tr.mid : null;
      const settings = (track.getSettings && track.getSettings()) || {};
      const label = (track.label || "").toLowerCase();

      let classify = null;
      if (track.kind === "video") {
        if (mid === "2") classify = "screen";
        else if (mid === "1") classify = "cam";
        if (!classify) {
          const ds = settings.displaySurface;
          if (ds === "monitor" || ds === "window" || ds === "application") classify = "screen";
          else if (label.includes("screen") || label.includes("window")) classify = "screen";
        }
        if (!classify) classify = p.tracks.cam ? "screen" : "cam";
      }

      if (classify === "screen") p.tracks.screen = stream;
      else if (track.kind === "video") p.tracks.cam = stream;
      else if (track.kind === "audio") {
        if (p.tracks.screen) p.tracks.screen.addTrack(track);
        else if (p.tracks.cam) p.tracks.cam.addTrack(track);
        else p.tracks.cam = stream;
      }

      // remote audio → speaking detection
      if (track.kind === "audio") {
        try { hookSpeakingDetection(stream, pid); } catch {}
      }

      track.onended = () => {
        if (classify === "screen") { p.tracks.screen = null; emitStreams(); }
        else if (track.kind === "video") { p.tracks.cam = null; emitStreams(); }
      };
      track.onmute = () => emitStreams();
      track.onunmute = () => emitStreams();

      emitStreams();
    };

    // proactively create DC on one side
    try { wireDC(pid, pc.createDataChannel("chat", { ordered: true })); } catch {}

    p.pc = pc;
    state.peers.set(pid, p);
    return p;
  }

  async function bindLocalTracksToPeer(p) {
    // AUDIO first (from mic stream)
    const a = state.localMicStream?.getAudioTracks?.()[0] || null;
    if (a) {
      try { await p.tx.audio.sender.replaceTrack(a); } catch {}
    }

    // CAMERA video (if exists)
    const v = state.localCamStream?.getVideoTracks?.()[0] || null;
    if (v) {
      try { await p.tx.video.sender.replaceTrack(v); p.senders.cam = p.tx.video.sender; } catch {}
    }

    // SCREEN video (if exists)
    const s = state.localScreenStream?.getVideoTracks?.()[0] || null;
    if (s) {
      try { await p.tx.screen.sender.replaceTrack(s); p.senders.screen = p.tx.screen.sender; } catch {}
    }
  }

  function flushQueuedIce(peer) {
    if (!peer || !peer.pc || !peer.iceQueue || !peer.iceQueue.length) return;
    const q = peer.iceQueue.splice(0, peer.iceQueue.length);
    q.forEach(async (cand) => {
      try { await peer.pc.addIceCandidate(cand); } catch (e) { console.warn("flush addIceCandidate failed", e); }
    });
  }

  function wireDC(pid, dc) {
    const p = state.peers.get(pid) || newPeerShell("Student");
    p.dc = dc; p.dcOpen = dc.readyState === "open"; p.dcQueue ||= [];
    dc.onopen = () => {
      p.dcOpen = true;
      while (p.dcQueue.length) {
        try { dc.send(p.dcQueue.shift()); } catch { break; }
      }
    };
    dc.onclose = () => { p.dcOpen = false; };
    dc.onerror = () => { p.dcOpen = false; };
    dc.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "chat") state.chatCb?.({ author: m.author, text: m.text, ts: m.ts, self: false });
    };
    state.peers.set(pid, p);
  }

  /* ================= Share control ================= */
  async function stopScreenInternal(/* fromEndedEvent = false */) {
    if (state.localScreenStream) {
      try { state.localScreenStream.getTracks().forEach(t => t.stop()); } catch {}
      state.localScreenStream = null;
    }
    for (const [, p] of state.peers) {
      if (p.tx?.screen?.sender) { try { await p.tx.screen.sender.replaceTrack(null); } catch {} }
    }
    emitStreams();

    // Force renegotiation on all peers so they drop the screen m-line
    for (const [pid, p] of state.peers) {
      try {
        p.makingOffer = true;
        await p.pc.setLocalDescription(await p.pc.createOffer());
        sendWS({ type: "offer", to: pid, sdp: p.pc.localDescription });
      } catch (err) {
        console.warn("renegotiate(stopShare) failed", err);
      } finally {
        p.makingOffer = false;
      }
    }
  }

  /* ================= Speaking detection ================= */
  function hookSpeakingDetection(stream, pid) {
    if (!stream) return;
    if (!state.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      state.audioCtx = new AC();
    }
    const src = state.audioCtx.createMediaStreamSource(stream);
    const analyser = state.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false; let last = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const now = performance.now();
      const active = avg > 20;
      if (active) { state.speakingIds.add(pid || state.me); speaking = true; last = now; }
      else if (speaking && now - last > 600) { state.speakingIds.delete(pid || state.me); speaking = false; }
      emitSpeaking();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function waitTrackLive(track, cb) {
    if (!track) return;
    if (track.readyState === "live") return cb();
    const handler = () => {
      if (track.readyState === "live") { cb(); track.removeEventListener("unmute", handler); }
    };
    track.addEventListener("unmute", handler);
  }

  /* ================= Device changes ================= */
  try {
    navigator.mediaDevices?.addEventListener?.("devicechange", async () => {
      if (state.desiredMicOn) {
        await ensureLocalMic();
        for (const [, p] of state.peers) { await bindLocalTracksToPeer(p); }
      }
    });
  } catch {}

  /* ================= Public API ================= */
  return {
    async connect() {
      startWS();
      try {
        await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: roomId, display_name: displayName || "Student" }),
        });
      } catch {}

      await ensureLocalMediaReady();

      // stats loop (optional)
      setInterval(async () => {
        for (const [pid, p] of state.peers) {
          try {
            const stats = await p.pc.getStats();
            let rtt = null, bytes = 0, ts = 0;
            stats.forEach(report => {
              if (report.type === "candidate-pair" && report.selected) { rtt = report.currentRoundTripTime; }
              if (report.type === "outbound-rtp" && report.kind === "video") { bytes = report.bytesSent; ts = report.timestamp; }
            });
            emitStatsForPeer(pid, { rtt, bytes, ts });
          } catch {}
        }
      }, 2000);
    },

    disconnect() {
      try { state.ws?.close(); } catch {}
      for (const [pid] of state.peers) cleanupPeer(pid);
      try { state.localMicStream?.getTracks().forEach(t => t.stop()); } catch {}
      try { state.localCamStream?.getTracks().forEach(t => t.stop()); } catch {}
      try { state.localScreenStream?.getTracks().forEach(t => t.stop()); } catch {}
      state.localMicStream = null;
      state.localCamStream = null;
      state.localScreenStream = null;
      state.camDenied = false;
      emitStreams(); emitParticipants();
      try {
        fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: roomId }),
        });
      } catch {}
    },

    async getLocalStream() {
      await ensureLocalMediaReady();
      return state.localCamStream || state.localMicStream || null;
    },

    toggleHand(up) { sendWS({ type: "hand", up: !!up }); },

    setMic(on) {
      state.desiredMicOn = !!on;
      try { state.localMicStream?.getAudioTracks?.().forEach(t => (t.enabled = !!on)); } catch {}
      try { state.localCamStream?.getAudioTracks?.().forEach(t => (t.enabled = !!on)); } catch {}
      const hasAudio =
        (state.localMicStream && state.localMicStream.getAudioTracks().length > 0) ||
        (state.localCamStream && state.localCamStream.getAudioTracks().length > 0);
      if (on && !hasAudio) {
        ensureLocalMic().then(async () => {
          for (const [, p] of state.peers) { await bindLocalTracksToPeer(p); }
        });
      }
    },

    setCam(on) {
      if (state.localCamStream) {
        state.localCamStream.getVideoTracks().forEach(t => t.enabled = !!on);
      }
    },

    sendChat(payload) {
      const msg = { type: "chat", ...payload, self: undefined };
      for (const [, p] of state.peers) {
        if (p.dcOpen) { try { p.dc.send(JSON.stringify(msg)); } catch {} }
        else { p.dcQueue?.push?.(JSON.stringify(msg)); }
      }
      sendWS(msg);
      state.chatCb?.({ ...payload, self: true });
    },

    async startShare() {
      const screen = await ensureLocalScreen();
      if (!screen) throw new Error("share-cancelled");
      const v = screen.getVideoTracks()[0];

      for (const [, p] of state.peers) {
        try { await p.tx.screen.sender.replaceTrack(v); p.senders.screen = p.tx.screen.sender; }
        catch (e) { console.warn("screen replaceTrack", e); }
      }
      emitStreams();

      for (const [pid, p] of state.peers) {
        try {
          p.makingOffer = true;
          await p.pc.setLocalDescription(await p.pc.createOffer());
          sendWS({ type: "offer", to: pid, sdp: p.pc.localDescription });
        } catch {}
        finally { p.makingOffer = false; }
      }
    },

    async stopShare() { await stopScreenInternal(false); },

    subscribeStreams,
    subscribeParticipants,
    onChat,
    subscribeSpeaking,
    subscribeStats,

    onShareEnded(cb) {
      if (cb && state.localScreenStream) {
        state.localScreenStream.getTracks().forEach(t => t.addEventListener("ended", cb));
      }
    },
  };
}
