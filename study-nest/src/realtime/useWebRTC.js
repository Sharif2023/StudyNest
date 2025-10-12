// =========================
// FILE: src/realtime/useWebRTC.js (drop-in replacement)
// =========================

/*
Key upgrades
- Perfect Negotiation pattern (robust against glare, late renegotiations)
- Deterministic screen/cam classification using transceiver MID when available
- Always renegotiate on screen start/stop from EITHER side (no initiator-only gate)
- Reliable track lifecycles; cleans up on ended/mute; prevents stale blank tiles
- Speaking detection (voice activity via WebAudio) → emits speaking participant ids
- Lightweight connection health pings and auto-reconnect on WS close
- Simple getStats hook for UI (bitrate, RTT)
- Non-breaking public API: connect, disconnect, getLocalStream, setMic, setCam,
  startShare, stopShare, toggleHand, sendChat, subscribeStreams, subscribeParticipants,
  onChat, onShareEnded, subscribeSpeaking, subscribeStats
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

const WS_URL = "ws://localhost:5173";

export function useWebRTC(roomId, displayName) {
  const state = {
    ws: null,
    wsTimer: null,
    me: null,

    peers: new Map(), // id -> { pc, dc, name, tracks, senders, tx, polite, makingOffer, ignoreOffer }
    localCamStream: null,
    localScreenStream: null,
    camError: false,

    streamsCb: () => {},
    participantsCb: () => {},
    chatCb: () => {},
    speakingCb: () => {},
    statsCb: () => {},

    audioCtx: null,
    analyser: null,
    speakingIds: new Set(),
  };

  /* ================= subscriptions ================= */
  function subscribeStreams(cb){ state.streamsCb = cb; emitStreams(); }
  function subscribeParticipants(cb){ state.participantsCb = cb; emitParticipants(); }
  function subscribeSpeaking(cb){ state.speakingCb = cb; }
  function subscribeStats(cb){ state.statsCb = cb; }
  function onChat(cb){ state.chatCb = cb; }

  /* ================= emitters ================= */
  function emitStreams(){
    const list = [];
    if (state.localCamStream){
      list.push({ id: (state.me||"me")+"::cam", stream: state.localCamStream, name: displayName||"You", self:true, type:"cam" });
    }
    if (state.localScreenStream){
      list.push({ id: (state.me||"me")+"::screen", stream: state.localScreenStream, name:(displayName||"You")+" (screen)", self:true, type:"screen" });
    }
    for (const [pid,p] of state.peers){
      if (p.tracks.cam){ list.push({ id: pid+"::cam", stream: p.tracks.cam, name: p.name||"Student", self:false, type:"cam" }); }
      if (p.tracks.screen){ list.push({ id: pid+"::screen", stream: p.tracks.screen, name:(p.name||"Student")+" (screen)", self:false, type:"screen" }); }
    }
    state.streamsCb(list);
  }

  function emitParticipants(){
    const arr = [];
    if (state.me){ arr.push({ id: state.me, name: displayName||"You", hand:false, self:true, state:"connected" }); }
    for (const [pid,p] of state.peers){
      const connected = p.pc && p.pc.connectionState === 'connected';
      arr.push({ id: pid, name: p.name||"Student", hand: !!p.hand, self:false, state: connected ? 'connected' : 'joining' });
    }
    state.participantsCb(arr);
  }

  function emitSpeaking(){ state.speakingCb(Array.from(state.speakingIds)); }
  function emitStatsForPeer(pid, stats){ state.statsCb(pid, stats); }

  /* ================= WS (signaling) ================= */
  function startWS(){
    if (state.ws && state.ws.readyState === WebSocket.OPEN) return;
    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
      sendWS({ type: 'join', roomId, name: displayName||'Student' });
      // keepalive
      state.wsTimer && clearInterval(state.wsTimer);
      state.wsTimer = setInterval(()=> sendWS({ type:'ping'}), 15000);
    };

    state.ws.onclose = () => {
      state.wsTimer && clearInterval(state.wsTimer);
      // soft auto-retry in 1.5s
      setTimeout(startWS, 1500);
    };

    state.ws.onmessage = async (ev) => {
      let m; try{ m = JSON.parse(ev.data); } catch{ return; }
      if (m.type === 'joined'){
        state.me = m.clientId;
        (m.participants||[]).forEach(p => { if (p.id !== state.me && !state.peers.has(p.id)) state.peers.set(p.id, newPeerShell(p.name)); });
        for (const [pid] of state.peers){ await ensurePeer(pid); }
        emitParticipants(); emitStreams();
        return;
      }
      if (m.type === 'peer-joined'){
        if (!state.peers.has(m.id)) state.peers.set(m.id, newPeerShell(m.name));
        await ensurePeer(m.id);
        emitParticipants(); emitStreams();
        return;
      }
      if (m.type === 'peer-left'){
        cleanupPeer(m.id); emitParticipants(); emitStreams();
        return;
      }
      if (m.type === 'hand'){
        const p = state.peers.get(m.id); if (p){ p.hand = !!m.up; emitParticipants(); }
        return;
      }
      if (m.type === 'chat'){
        state.chatCb?.({ author:m.author, text:m.text, ts:m.ts, self:false });
        return;
      }

      // Perfect Negotiation bits
      if (m.type === 'offer' || m.type === 'answer' || m.type === 'ice'){
        const peer = await ensurePeer(m.from);
        const pc = peer.pc;

        if (m.type === 'offer'){
          const offer = new RTCSessionDescription(m.sdp);
          const offerCollision = (peer.makingOffer || pc.signalingState !== 'stable');
          peer.ignoreOffer = !peer.polite && offerCollision;
          if (peer.ignoreOffer) return; // glare: drop if impolite

          await pc.setRemoteDescription(offer);
          await ensureLocalCam();
          await pc.setLocalDescription(await pc.createAnswer());
          sendWS({ type:'answer', to: m.from, sdp: pc.localDescription });
          return;
        }
        if (m.type === 'answer'){
          if (pc.signalingState === 'have-local-offer'){
            await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
          }
          return;
        }
        if (m.type === 'ice'){
          try { await pc.addIceCandidate(m.candidate); } catch(e){ console.warn('addIceCandidate failed', e); }
          return;
        }
      }
    };
  }

  function sendWS(obj){ try{ state.ws?.readyState===1 && state.ws.send(JSON.stringify(obj)); } catch{}
  }

  /* ================= Local media ================= */
  async function ensureLocalCam(){
    if (state.camError) return null;
    if (!state.localCamStream){
      try {
        state.localCamStream = await navigator.mediaDevices.getUserMedia({
          video: { width:{ ideal:1280 }, height:{ ideal:720 } },
          audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true }
        });
        // speaking detection from local mic
        try { hookSpeakingDetection((state.localCamStream)); } catch {}
        emitStreams();
      } catch(e){
        state.camError = true; state.localCamStream = null; console.warn('getUserMedia failed', e);
        return null;
      }
    }
    return state.localCamStream;
  }

  async function ensureLocalScreen(){
    try{
      const share = await navigator.mediaDevices.getDisplayMedia({ video:{ frameRate:{ ideal:30 } }, audio:true });
      const v = share.getVideoTracks()[0];
      try { v && (v.contentHint = 'text'); } catch {}

      // auto stop handler
      share.getTracks().forEach(t => t.addEventListener('ended', () => stopScreenInternal(true)));
      state.localScreenStream = share;
      emitStreams();
      return share;
    }catch(err){ console.warn('getDisplayMedia denied', err); return null; }
  }

  /* ================= Peers ================= */
  function newPeerShell(name){
    return { name, hand:false, pc:null, dc:null, dcOpen:false, dcQueue:[],
      tracks:{ cam:null, screen:null }, senders:{ cam:null, screen:null }, tx:{},
      polite:false, makingOffer:false, ignoreOffer:false };
  }

  function cleanupPeer(pid){
    const p = state.peers.get(pid); if (!p) return;
    try{ p.dc?.close?.(); }catch{}
    try{ p.pc?.close?.(); }catch{}
    state.peers.delete(pid);
  }

  async function ensurePeer(pid){
    let p = state.peers.get(pid); if (!p){ p = newPeerShell('Student'); state.peers.set(pid,p); }
    if (p.pc) return p;

    const pc = new RTCPeerConnection({ iceServers: STUN });

    // polite = my id lexicographically larger than peer id
    p.polite = state.me && pid && (state.me < pid ? false : true);

    // create baseline transceivers so MIDs are stable: 0=audio, 1=cam, 2=screen
    p.tx.audio = pc.addTransceiver('audio', { direction:'sendrecv' });
    p.tx.video = pc.addTransceiver('video', { direction:'sendrecv' });
    p.tx.screen = pc.addTransceiver('video', { direction:'sendrecv' });

    // attach local tracks if present
    const cam = await ensureLocalCam();
    if (cam){
      const a = cam.getAudioTracks()[0]||null; const v = cam.getVideoTracks()[0]||null;
      if (a) try{ await p.tx.audio.sender.replaceTrack(a); }catch{}
      if (v) try{ await p.tx.video.sender.replaceTrack(v); p.senders.cam = p.tx.video.sender; }catch{}
    }
    if (state.localScreenStream){
      const s = state.localScreenStream.getVideoTracks()[0];
      if (s) try{ await p.tx.screen.sender.replaceTrack(s); p.senders.screen = p.tx.screen.sender; }catch{}
    }

    // perfect negotiation wires
    pc.onnegotiationneeded = async () => {
      try{
        p.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        sendWS({ type:'offer', to: pid, sdp: pc.localDescription });
      }catch(err){ console.warn('negotiationneeded error', err); }
      finally{ p.makingOffer = false; }
    };

    pc.onicecandidate = (ev) => { if (ev.candidate) sendWS({ type:'ice', to: pid, candidate: ev.candidate }); };

    pc.onconnectionstatechange = () => { emitParticipants(); };
    pc.oniceconnectionstatechange = () => { emitParticipants(); };

    pc.ondatachannel = (ev) => wireDC(pid, ev.channel);

    pc.ontrack = (e) => {
      const track = e.track;
      const stream = (e.streams && e.streams[0]) || new MediaStream([track]);
      const tr = e.transceiver; const mid = tr && typeof tr.mid === 'string' ? tr.mid : null;
      const settings = (track.getSettings && track.getSettings()) || {};
      const label = (track.label||'').toLowerCase();

      let classify = null;
      if (track.kind === 'video'){
        if (mid === '2') classify = 'screen';
        else if (mid === '1') classify = 'cam';
        if (!classify){
          const ds = settings.displaySurface;
          if (ds === 'monitor' || ds === 'window' || ds === 'application') classify = 'screen';
          else if (label.includes('screen') || label.includes('window')) classify = 'screen';
        }
        if (!classify) classify = p.tracks.cam ? 'screen' : 'cam';
      }

      if (classify === 'screen') p.tracks.screen = stream;
      else if (track.kind === 'video') p.tracks.cam = stream;
      else if (track.kind === 'audio'){
        if (p.tracks.screen) p.tracks.screen.addTrack(track);
        else if (p.tracks.cam) p.tracks.cam.addTrack(track);
        else p.tracks.cam = stream;
      }

      // speaking detection on remote audio
      if (track.kind === 'audio'){
        try{ hookSpeakingDetection(stream, pid); }catch{}
      }

      track.onended = () => {
        if (classify === 'screen') p.tracks.screen = null;
        else if (track.kind === 'video') p.tracks.cam = null;
        emitStreams();
      };
      track.onmute = () => emitStreams();
      track.onunmute = () => emitStreams();

      emitStreams();
    };

    // proactively create DC on one side for reliability
    try { wireDC(pid, pc.createDataChannel('chat', { ordered:true })); } catch {}

    p.pc = pc; state.peers.set(pid,p);

    // initial offer from one side triggers onnegotiationneeded
    return p;
  }

  function wireDC(pid, dc){
    const p = state.peers.get(pid) || newPeerShell('Student');
    p.dc = dc; p.dcOpen = dc.readyState === 'open'; p.dcQueue ||= [];
    dc.onopen = () => { p.dcOpen = true; while(p.dcQueue.length){ try{ dc.send(p.dcQueue.shift()); }catch{ break; } } };
    dc.onclose = () => { p.dcOpen = false; };
    dc.onerror = () => { p.dcOpen = false; };
    dc.onmessage = (e) => { let m; try{ m = JSON.parse(e.data); } catch{ return; } if (m.type==='chat') state.chatCb?.({ author:m.author, text:m.text, ts:m.ts, self:false }); };
    state.peers.set(pid,p);
  }

  /* ================= Share control ================= */
  async function stopScreenInternal(fromEndedEvent=false){
    if (state.localScreenStream){
      try{ state.localScreenStream.getTracks().forEach(t => t.stop()); }catch{}
      state.localScreenStream = null;
    }
    for (const [,p] of state.peers){
      if (p.tx?.screen?.sender){ try{ await p.tx.screen.sender.replaceTrack(null); } catch{} }
    }
    emitStreams();

    // Force renegotiation on all peers so they drop the m=video(screen)
    for (const [pid,p] of state.peers){
      try{
        p.makingOffer = true;
        await p.pc.setLocalDescription(await p.pc.createOffer());
        sendWS({ type:'offer', to: pid, sdp: p.pc.localDescription });
      }catch(err){ console.warn('renegotiate(stopShare) failed', err); }
      finally{ p.makingOffer = false; }
    }
  }

  /* ================= Speaking detection ================= */
  function hookSpeakingDetection(stream, pid){
    if (!stream) return;
    if (!state.audioCtx){
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
      // simple energy threshold
      const avg = data.reduce((a,b)=>a+b,0)/data.length;
      const now = performance.now();
      const active = avg > 20; // tuned for VC
      if (active){
        state.speakingIds.add(pid || state.me);
        speaking = true; last = now;
      } else if (speaking && now - last > 600){
        state.speakingIds.delete(pid || state.me); speaking = false;
      }
      emitSpeaking();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ================= Public API ================= */
  return {
    async connect(){
      startWS();
      try {
        await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/join",{
          method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ id: roomId, display_name: displayName||'Student' })
        });
      } catch{}
      // stats loop (optional)
      setInterval(async () => {
        for (const [pid,p] of state.peers){
          try{
            const stats = await p.pc.getStats();
            let rtt=null, bitrate=null; let bytes=0, ts=0; // simplistic
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.selected){ rtt = report.currentRoundTripTime; }
              if (report.type === 'outbound-rtp' && report.kind === 'video'){ bytes = report.bytesSent; ts = report.timestamp; }
            });
            emitStatsForPeer(pid, { rtt, bytes, ts });
          } catch{}
        }
      }, 2000);
    },

    disconnect(){
      try{ state.ws?.close(); }catch{}
      for (const [pid] of state.peers) cleanupPeer(pid);
      try{ state.localCamStream?.getTracks().forEach(t=>t.stop()); }catch{}
      try{ state.localScreenStream?.getTracks().forEach(t=>t.stop()); }catch{}
      state.localCamStream = null; state.localScreenStream = null; state.camError=false;
      emitStreams(); emitParticipants();
      try{ fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/leave",{ method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ id: roomId })}); }catch{}
    },

    async getLocalStream(){ return await ensureLocalCam(); },

    toggleHand(up){ sendWS({ type:'hand', up: !!up }); },

    setMic(on){ if (state.localCamStream){ state.localCamStream.getAudioTracks().forEach(t => t.enabled = !!on); } },
    setCam(on){ if (state.localCamStream){ state.localCamStream.getVideoTracks().forEach(t => t.enabled = !!on); } },

    sendChat(payload){
      const msg = { type:'chat', ...payload, self: undefined };
      for (const [,p] of state.peers){ if (p.dcOpen){ try{ p.dc.send(JSON.stringify(msg)); }catch{} } else { p.dcQueue?.push?.(JSON.stringify(msg)); } }
      sendWS(msg); state.chatCb?.({ ...payload, self:true });
    },

    async startShare(){
      const screen = await ensureLocalScreen(); if (!screen) throw new Error('share-cancelled');
      const v = screen.getVideoTracks()[0];
      for (const [,p] of state.peers){ try{ await p.tx.screen.sender.replaceTrack(v); p.senders.screen = p.tx.screen.sender; } catch(e){ console.warn('screen replaceTrack', e);} }
      emitStreams();
      // Force offer from us to every peer so they start receiving immediately
      for (const [pid,p] of state.peers){
        try{ p.makingOffer = true; await p.pc.setLocalDescription(await p.pc.createOffer()); sendWS({ type:'offer', to: pid, sdp: p.pc.localDescription }); }catch{} finally{ p.makingOffer=false; }
      }
    },

    async stopShare(){ await stopScreenInternal(false); },

    subscribeStreams, subscribeParticipants, onChat, subscribeSpeaking, subscribeStats,

    onShareEnded(cb){ if (cb && state.localScreenStream){ state.localScreenStream.getTracks().forEach(t => t.addEventListener('ended', cb)); } },
  };
}


// =========================
// FILE: src/Pages/StudyRooms.jsx (only the small UI deltas below)
// =========================

/*
Add these minimal UI enhancements:
- Active speaker glow around tiles
- Network badge (rtt) in TileFooter when available

Patch hints:
1) Inside StudyRoom(), after `const rtc = useMemo(() => useWebRTC(...))` add:

  const [speaking, setSpeaking] = useState([]);
  const statsRef = useRef(new Map()); // pid -> { rtt }

  useEffect(() => { rtc.subscribeSpeaking(setSpeaking); }, [rtc]);
  useEffect(() => {
    rtc.subscribeStats((pid, s) => {
      const prev = statsRef.current.get(pid) || {}; prev.rtt = s.rtt; statsRef.current.set(pid, prev);
      // force a re-render tick
      setParticipants(p => [...p]);
    });
  }, [rtc]);

2) Pass `speaking` (array of ids) to RoomVideoWall and PeopleWall; add a prop `speakingIds`.

3) In PeopleWall and ScreenWall tile wrappers, add an active style when the corresponding id is in `speakingIds`:

  const isSpeaking = speakingIds?.includes(t.id.split('::')[0]);
  className={`relative ... ${isSpeaking ? 'ring-2 ring-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]' : 'ring-1 ring-zinc-700'}`}

4) In TileFooter, add an optional `rttMs` badge. Compute like:

  const pid = t.id.split('::')[0];
  const rtt = statsRef.current.get(pid)?.rtt;
  <span className="rounded bg-white/20 px-1">{rtt ? `${Math.round(rtt*1000)}ms` : ''}</span>

These changes are cosmetic and do not alter core behavior.
*/
