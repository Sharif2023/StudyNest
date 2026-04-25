import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { createWebRTCClient } from "../realtime/useWebRTC";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import WhiteboardModal from "../Components/WhiteboardModal";
import apiClient from "../apiConfig";
import {
  Video,
  PlayCircle,
  Database,
  ChevronRight,
  Plus,
  ArrowRight,
  LogOut,
  Sparkles,
  X,
  Users,
  MessageSquare,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  Settings,
  Shield,
  UserPlus,
  Info,
  Share2,
  Save,
  Download,
  Trash2,
  Cloud,
  Check,
  Loader2,
  Clock,
  Maximize2,
  Minimize2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useRecording } from "../hooks/useRecording";
import { SaveRecordingModal } from "../Components/StudyRooms/SaveRecordingModal";
import { RoomCard, EmptyRooms } from "../Components/StudyRooms/LobbyComponents";
import { RoomVideoWall } from "../Components/StudyRooms/VideoWall";

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  MINIMIZE_KEY,
  HOST_ROOMS_KEY,
  readHostRooms,
  rememberHostRoom,
  uid,
  timeAgo
} from "../Components/StudyRooms/RoomUtils";

import {
  ToggleButton,
  Dot,
  ArrowLeft as ArrowLeftIcon,
  CamIcon,
  CamOffIcon,
  MicIcon,
  MicOffIcon,
  ScreenIcon,
  UserIcon
} from "../Components/StudyRooms/RoomUIComponents";

import {
  ChatPanel,
  ParticipantsPanel,
  RoomControls
} from "../Components/StudyRooms/RoomSections";

/* ====================== Rooms Lobby ====================== */
export function RoomsLobby() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [navOpen, setNavOpen] = useState(window.innerWidth >= 1024);
  const SIDEBAR_WIDTH_COLLAPSED = 80;
  const SIDEBAR_WIDTH_EXPANDED = 280;
  const sidebarWidth = navOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await apiClient.get("meetings.php");
        if (res.data.ok) {
          setRooms(res.data.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();

    const handleRefresh = () => fetchRooms();
    window.addEventListener("studynest:rooms-refresh", handleRefresh);
    return () => window.removeEventListener("studynest:rooms-refresh", handleRefresh);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090e] flex flex-col selection:bg-cyan-500/30 selection:text-white relative">
      <Header sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} navOpen={navOpen} />
      <div className="flex flex-1 overflow-hidden relative">
        <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={sidebarWidth} />
        <main 
          style={{ paddingLeft: window.innerWidth < 1024 ? 0 : sidebarWidth }}
          className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar relative z-10 transition-all duration-300"
        >
          <div className="mx-auto max-w-7xl">
            {/* Hero Section */}
            <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Study Lobbies</span>
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-none"
                >
                  LIVE STUDY<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">SESSIONS.</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-400 text-lg font-medium max-w-xl leading-relaxed"
                >
                  Join real-time synchronization rooms to study together, share resources, and help each other succeed.
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/rooms/newform")}
                className="group relative px-8 py-5 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest text-xs overflow-hidden shadow-2xl shadow-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                  Initialize Room
                </span>
              </motion.button>
            </div>

            {/* Rooms Grid */}
            {loading ? (
              <div className="grid place-items-center py-32">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
              </div>
            ) : rooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rooms.map((room, idx) => (
                  <RoomCard key={room.id} room={room} index={idx} />
                ))}
              </div>
            ) : (
              <EmptyRooms navigate={navigate} />
            )}
          </div>
        </main>
        
        {/* Background Decorations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse-slow" />
        </div>
      </div>
      <Footer />
    </div>
  );
}

/* ====================== Study Room ====================== */
export function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const params = new URLSearchParams(search);
  const isEmbed = params.get("embed") === "1";
  const [boardOpen, setBoardOpen] = useState(false);

  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [hand, setHand] = useState(false);
  const [anon, setAnon] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [streams, setStreams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [room, setRoom] = useState(null);
  const [ending, setEnding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const meetingNavigatedRef = useRef(false);
  const exitMeetingToHomeRef = useRef(() => {});

  useEffect(() => {
    meetingNavigatedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("meetings.php", { params: { id: roomId } });
        const j = res.data;
        if (j.ok) setRoom(j.room);
      } catch (e) {
        console.warn("Room fetch failed:", e);
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (room && room.status === "live") {
      localStorage.setItem("activeRoom", JSON.stringify(room));
    }
    return () => {
      const endedRoom = localStorage.getItem("endedRoom");
      if (!endedRoom && room && room.status === "live") {
        localStorage.setItem("activeRoom", JSON.stringify(room));
      }
    };
  }, [room]);

  const currentUser =
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.id ||
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.id;

  const [isHost, setIsHost] = useState(false);

  const meetingStableId = useMemo(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("studynest.auth") || "null");
      const prof = JSON.parse(localStorage.getItem("studynest.profile") || "null");
      const uid_val = auth?.id ?? prof?.id;
      if (uid_val != null && uid_val !== "") return `u:${String(uid_val)}`;
    } catch { }
    try {
      let g = sessionStorage.getItem("studynest.meetingGuestId");
      if (!g) {
        g = `g:${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12))}${Date.now().toString(36)}`;
        sessionStorage.setItem("studynest.meetingGuestId", g);
      }
      return g;
    } catch {
      return `g:${Math.random().toString(36).slice(2, 12)}`;
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let host = false;
    if (state?.createdThisSession) {
      host = true;
      rememberHostRoom(roomId);
    }
    if (currentUser != null && room?.created_by != null && String(room.created_by) === String(currentUser)) {
      host = true;
      rememberHostRoom(roomId);
    }
    if (!host && readHostRooms().includes(roomId)) host = true;
    setIsHost(host);
  }, [roomId, room, currentUser, state?.createdThisSession]);

  const roomTitle = state?.title || room?.title || `Room • ${roomId}`;

  const displayName =
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.name ||
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.name ||
    "Student";

  const {
    recording,
    showSaveOptions,
    uploading,
    startRecording,
    stopRecording,
    saveToDevice,
    uploadToCloudinary,
    cancelSave,
  } = useRecording(roomId, displayName, room, state);

  const rtc = useMemo(
    () => createWebRTCClient(roomId, displayName, meetingStableId),
    [roomId, displayName, meetingStableId]
  );

  useEffect(() => {
    exitMeetingToHomeRef.current = () => {
      if (meetingNavigatedRef.current) return;
      meetingNavigatedRef.current = true;
      localStorage.setItem("endedRoom", "true");
      localStorage.removeItem("activeRoom");
      if (isEmbed) {
        try {
          window.parent?.postMessage({ type: "studynest:meeting-ended", roomId }, "*");
        } catch { }
      }
      try { rtc.disconnect?.(); } catch { }
      navigate("/home", { replace: true });
    };
  }, [rtc, navigate, roomId, isEmbed]);

  useEffect(() => {
    if (!room || room.status !== "ended") return;
    exitMeetingToHomeRef.current();
  }, [room]);

  useEffect(() => {
    if (!roomId || room?.status === "ended") return;
    const iv = setInterval(async () => {
      try {
        const res = await apiClient.get("meetings.php", { params: { id: roomId } });
        const j = res.data;
        if (!j.ok || j.room?.status === "ended") exitMeetingToHomeRef.current();
      } catch { }
    }, 12000);
    return () => clearInterval(iv);
  }, [roomId, room?.status]);

  useEffect(() => { rtc.setMic?.(mic); }, [mic, rtc]);
  useEffect(() => { rtc.setCam?.(cam); }, [cam, rtc]);

  useEffect(() => {
    (async () => {
      try {
        await rtc.getLocalStream();
      } catch (e) {
        console.warn("getUserMedia failed", e);
        setCam(false);
      }
    })();
  }, [rtc]);

  const participantsRef = useRef(participants);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  useEffect(() => {
    rtc.subscribeStreams(setStreams);
    rtc.subscribeParticipants(setParticipants);
    rtc.onMeetingEnded(() => {
      exitMeetingToHomeRef.current();
    });
    rtc.onChat((m) => {
      const myId = participantsRef.current.find(p => p.self)?.id;
      if (m.to && myId && m.to !== myId) return;

      if (m.subtype === "chat-sync-request") {
         setChat(prev => {
            if (prev.length > 0) {
               rtc.sendChat({ subtype: "chat-sync-response", to: m.from, history: prev });
            }
            return prev;
         });
         return;
      }
      if (m.subtype === "chat-sync-response") {
         setChat(prev => prev.length === 0 && m.history ? m.history : prev);
         return;
      }
      setChat((prev) => {
        const mid = m.id || uid();
        if (prev.some((x) => x.id === mid)) return prev;
        return [...prev, { id: mid, author: m.author, text: m.text, ts: m.ts, self: !!m.self }];
      });
    });
    let chatSyncTimer = null;
    (async () => {
      const stream = await rtc.getLocalStream();
      rtc.connect();
      chatSyncTimer = setTimeout(() => {
        rtc.sendChat({ subtype: "chat-sync-request" });
        chatSyncTimer = null;
      }, 2000);
    })();
    return () => {
      if (chatSyncTimer != null) {
        clearTimeout(chatSyncTimer);
        chatSyncTimer = null;
      }
      const minId = localStorage.getItem(MINIMIZE_KEY);
      if (minId === roomId) {
        localStorage.removeItem(MINIMIZE_KEY);
        try { rtc.setMic?.(false); } catch { }
        return;
      }
      rtc.disconnect();
    };
  }, [rtc]);

  useEffect(() => {
    localStorage.removeItem("endedRoom");
  }, []);

  async function confirmFinishMeeting() {
    try {
      setEnding(true);
      const res = await apiClient.post("meetings.php/end", { id: roomId });
      const j = res.data;
      if (j.ok) {
        setFinishModalOpen(false);
        try { rtc.notifyMeetingEnded?.(); } catch { }
        try {
          const raw = localStorage.getItem(HOST_ROOMS_KEY) || "[]";
          const arr = JSON.parse(raw).filter((id) => id !== roomId);
          localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(arr));
        } catch { }
        window.dispatchEvent(new Event("studynest:rooms-refresh"));
        exitMeetingToHomeRef.current();
        return;
      }
      alert(j.error === "You Are Not Host" ? "Only the host can finish this session." : "Could not finish the session.");
    } catch (err) {
      console.error("End meeting failed", err);
      alert("Network error while finishing the session.");
    } finally {
      setEnding(false);
    }
  }

  async function handleLeaveRoom() {
    if (leaving) return;
    setLeaving(true);
    try {
      await apiClient.post("meetings.php/leave", { id: roomId });
    } catch (err) {
      console.error("Leave failed", err);
    } finally {
      localStorage.removeItem("activeRoom");
      window.dispatchEvent(new Event("studynest:rooms-refresh"));
      if (isEmbed) {
        window.parent?.postMessage({ type: "studynest:mini-leave" }, "*");
        try { rtc?.disconnect?.(); } catch { }
      } else {
        navigate("/home", { replace: true });
      }
      setLeaving(false);
    }
  }

  function send() {
    if (!msg.trim()) return;
    const payload = { type: "chat", text: msg.trim(), author: anon ? "Anonymous" : displayName, ts: new Date().toISOString(), self: true };
    rtc.sendChat(payload);
    setMsg("");
  }

  async function copyInvite() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Invite link copied");
    } catch {
      console.log(url);
    }
  }

  async function toggleShare() {
    try {
      if (!sharing) {
        await rtc.startShare();
        rtc.onShareEnded?.(() => setSharing(false));
        setSharing(true);
      } else {
        await rtc.stopShare();
        setSharing(false);
      }
    } catch (e) {
      if (String(e?.message || "").includes("share-cancelled")) return;
      console.warn("share toggle failed", e);
    }
  }

  async function toggleRecord() {
    if (recording) {
      stopRecording();
    } else {
      const success = await startRecording();
      if (!success) {
        alert("Could not start recording. Make sure there are active video streams.");
      }
    }
  }

  function toggleFullTile(tileId) {
    const el = document.getElementById(tileId);
    if (!el) return;
    const d = document;
    const fsEl = d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement || null;

    const enter = () => {
      const p = el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.mozRequestFullScreen?.() || el.msRequestFullscreen?.();
      if (p && typeof p.catch === "function") p.catch(() => { });
    };

    const exit = () => {
      const p = d.exitFullscreen?.() || d.webkitExitFullscreen?.() || d.mozCancelFullScreen?.() || d.msExitFullscreen?.();
      return p && typeof p.then === "function" ? p.then(() => { }).catch(() => { }) : Promise.resolve();
    };

    if (fsEl === el) {
      void exit();
      return;
    }

    void (async () => {
      if (fsEl && fsEl !== el) await exit();
      enter();
    })();
  }

  return (
    <main className="min-h-screen bg-[#08090e] flex flex-col selection:bg-black/50 selection:text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (room && room.status === "live") {
                  const active = { ...(room || {}), id: roomId, status: "live" };
                  localStorage.setItem("activeRoom", JSON.stringify(active));
                }
                localStorage.setItem(MINIMIZE_KEY, roomId);
                navigate(`/home?room=${roomId}`);
              }}
              className="rounded-xl p-2 hover:bg-white/5 transition-colors"
              aria-label="Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-black uppercase tracking-tighter truncate max-w-[60vw]">{roomTitle}</h1>
            {recording && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full shadow-lg">
                <div className="h-2 w-2 bg-white/5 rounded-full animate-pulse shadow-[0_0_8px_white]" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isEmbed && (
              <>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors shadow-sm"
                >
                  Invite link
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => setFinishModalOpen(true)}
                    disabled={ending}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:opacity-50"
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
                    <Sparkles className="relative h-3.5 w-3.5" />
                    <span className="relative">Finish session</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleLeaveRoom}
              disabled={leaving}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5 opacity-80" />
              {leaving ? "Leaving…" : "Leave"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <RoomVideoWall
              streams={streams}
              participants={participants}
              mic={mic}
              toggleFullTile={toggleFullTile}
            />
          </section>

          <aside className="space-y-6">
            <ChatPanel 
              chat={chat}
              msg={msg}
              setMsg={setMsg}
              send={send}
              anon={anon}
              setAnon={setAnon}
              displayName={displayName}
            />
            <ParticipantsPanel 
              participants={participants}
              hand={hand}
            />
          </aside>
        </div>
      </div>

      {/* Sticky Controls at Bottom */}
      <RoomControls 
        mic={mic}
        setMic={setMic}
        cam={cam}
        setCam={setCam}
        sharing={sharing}
        toggleShare={toggleShare}
        recording={recording}
        toggleRecord={toggleRecord}
        hand={hand}
        setHand={setHand}
        rtc={rtc}
        setBoardOpen={setBoardOpen}
      />

      {/* Save Recording Modal */}
      <SaveRecordingModal
        isOpen={showSaveOptions}
        onSaveToDevice={saveToDevice}
        onSaveToCloud={uploadToCloudinary}
        onCancel={cancelSave}
        uploading={uploading}
      />

      <AnimatePresence>
        {finishModalOpen && isHost && !isEmbed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-session-title"
            onClick={() => !ending && setFinishModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900/98 to-[#06070c] p-8 shadow-2xl shadow-black/60 ring-1 ring-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-600/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-violet-600/15 blur-3xl" />

              <button
                type="button"
                aria-label="Close"
                disabled={ending}
                onClick={() => setFinishModalOpen(false)}
                className="absolute right-5 top-5 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-fuchsia-900/40">
                <Sparkles className="h-7 w-7 text-white" />
              </div>

              <h2 id="finish-session-title" className="relative text-xl font-black uppercase tracking-tight text-white">
                Finish for everyone?
              </h2>
              <p className="relative mt-3 text-sm leading-relaxed text-slate-400">
                This ends the session in the lobby, closes all participant seats, and sends everyone back home. You can start a new room anytime.
              </p>

              <div className="relative mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={ending}
                  onClick={() => setFinishModalOpen(false)}
                  className="rounded-2xl border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={ending}
                  onClick={confirmFinishMeeting}
                  className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:opacity-50"
                >
                  {ending ? "Finishing…" : "Finish session"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhiteboardModal
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        rtc={rtc}
        roomId={roomId}
        me={participants.find(p => p.self) || { id: "me", name: "You" }}
        participants={participants}
      />

    </main>
  );
}

/* ============ /rooms/new — create a real meeting row then open room (host controls) ============ */
export function NewRoomRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const response = await apiClient.post("meetings.php", { title: "Quick Study Room" });
        const j = response.data;
        if (j.ok && j.id) {
          navigate(`/rooms/${j.id}`, { replace: true, state: { title: "Quick Study Room", createdThisSession: true } });
        } else {
          navigate("/rooms/newform", { replace: true });
        }
      } catch {
        navigate("/rooms/newform", { replace: true });
      }
    })();
  }, [navigate]);
  return (
    <div className="min-h-screen bg-[#08090e] grid place-items-center text-slate-500 text-xs font-bold uppercase tracking-widest">
      Starting room…
    </div>
  );
}
