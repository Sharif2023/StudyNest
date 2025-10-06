import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useWebRTC } from "../realtime/useWebRTC";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/* ====================== Lobby ====================== */
export function RoomsLobby() {
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState("");

  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const COLLAPSED_W = 72;
  const EXPANDED_W = 248;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php", {
          credentials: "include",
        });
        const j = await r.json();
        if (j.ok) setRooms(j.rooms || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  async function create() {
    const finalTitle = title.trim() || "Quick Study Room";
    try {
      const res = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: finalTitle, course: "CSE220" }),
      });
      const j = await res.json();
      if (j.ok && j.id) {
        setTitle("");
        navigate(`/rooms/${j.id}`, { state: { title: finalTitle } });
      }
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl"
      style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}
    >
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-white">Study Rooms</h1>
            <p className="text-sm text-white/70 hidden sm:block">Meet on video, chat, and collaborate live.</p>
          </div>
        </div>
      </header>

      {/* Create */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Create a room: e.g., CSE220 Quiz Review"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => navigate("/rooms/newform")}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Start room
          </button>
        </div>
      </section>

      {/* List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {rooms.length === 0 ? (
          <EmptyRooms />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <li key={r.id}>
                <RoomCard room={r} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Footer />
    </main>
  );
}

function RoomCard({ room }) {
  const title = room.course_title || room.title;
  return (
    <article className="flex flex-col h-full rounded-2xl bg-white shadow-md ring-1 ring-zinc-200/50 p-4">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 grid place-items-center">
        {room.course_thumbnail ? (
          <img src={room.course_thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.94-.94 2.56-.27 2.56 1.06v11.38c0 1.33-1.62 2-2.56 1.06z" />
          </svg>
        )}
      </div>

      <h3 className="mt-3 truncate text-lg font-semibold text-zinc-900" title={title}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-500 font-medium">
        {room.course || "—"} • {timeAgo(room.created_at)}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
        <span className="rounded-full bg-zinc-100/70 px-2 py-0.5 text-zinc-500 font-medium">{room.participants} online</span>
        <Link to={`/rooms/${room.id}`} className="rounded-xl border border-zinc-200 px-3 py-1 font-semibold text-zinc-600 hover:bg-zinc-50">
          Join
        </Link>
      </div>
    </article>
  );
}

function EmptyRooms() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CamIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No active rooms</h3>
        <p className="mt-1 text-sm text-zinc-600">Create one above to start studying together.</p>
      </div>
    </div>
  );
}

/* ====================== Study Room ====================== */
export function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [hand, setHand] = useState(false);
  const [anon, setAnon] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const localVideoRef = useRef(null);
  const [streams, setStreams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [room, setRoom] = useState(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php?id=${roomId}`, { credentials: "include" });
        const j = await r.json();
        if (j.ok) setRoom(j.room);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [roomId]);

  const isCreator = room?.created_by != null;
  const roomTitle = state?.title || room?.title || `Room • ${roomId}`;

  const displayName =
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.name ||
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.name ||
    "Student";

  const rtc = useMemo(() => useWebRTC(roomId, displayName), [roomId, displayName]);
  useEffect(() => { rtc.setMic?.(mic); }, [mic, rtc]);
  useEffect(() => { rtc.setCam?.(cam); }, [cam, rtc]);

  useEffect(() => {
    let stream;
    let cancelled = false;
    (async () => {
      try {
        stream = await rtc.getLocalStream();
        if (!cancelled && localVideoRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.warn("getUserMedia failed", e);
        setCam(false);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [rtc]);

  useEffect(() => {
    rtc.subscribeStreams(setStreams);
    rtc.subscribeParticipants(setParticipants);
    rtc.onChat((m) => {
      setChat((prev) => [...prev, { id: uid(), author: m.author, text: m.text, ts: m.ts, self: !!m.self }]);
    });
    (async () => {
      const stream = await rtc.getLocalStream();
      rtc.connect();
    })();
    return () => rtc.disconnect();
  }, [rtc]);

  async function endMeeting() {
    try {
      setEnding(true);
      const res = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: roomId }),
      });
      const j = await res.json();
      if (j.ok) navigate("/rooms", { replace: true });
      else alert(j.error || "Failed to end meeting");
    } finally {
      setEnding(false);
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

  useEffect(() => {
    rtc.onShareEnded?.(() => setSharing(false));
  }, [rtc]);

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-zinc-200">
          <div className="flex items-center gap-3">
            <Link to="/rooms" className="rounded-md p-2 hover:bg-zinc-800" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-sm font-semibold truncate max-w-[60vw]">{roomTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyInvite} className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800">
              Copy invite
            </button>
            {isCreator && (
              <button
                onClick={endMeeting}
                disabled={ending}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {ending ? "Ending…" : "End meeting"}
              </button>
            )}
            <Link to="/home" className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800">
              Leave
            </Link>
          </div>
        </div>
      </div>

      {/* Layout: video grid + sidebar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-4 lg:grid-cols-3">
        {/* Video grid */}
        <section className="lg:col-span-2">
          <div
            className="grid gap-4 sm:gap-6"
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))` }}
          >
            {streams.length === 0 ? (
              <div className="aspect-video rounded-2xl bg-zinc-900/80 grid place-items-center text-zinc-500">
                Waiting for participants…
              </div>
            ) : (
              streams.map((s) => (
                <div
                  key={s.id}
                  className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700 shadow-lg transition-all duration-300"
                >
                  {s.stream ? (
                    <video
                      autoPlay
                      playsInline
                      muted={s.self}
                      className="h-full w-full object-cover"
                      ref={(el) => {
                        if (el && el.srcObject !== s.stream) {
                          el.srcObject = s.stream;
                          const p = el.play();
                          if (p && typeof p.catch === "function") p.catch(() => {});
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-zinc-500 bg-zinc-800/60">
                      <div className="text-center">
                        <UserIcon className="h-12 w-12 mx-auto" />
                        <div className="mt-2 text-xs font-medium text-zinc-300">Joining…</div>
                      </div>
                    </div>
                  )}

                  <div className="absolute left-2 bottom-2 flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                    <span className="font-semibold">
                      {s.self ? (s.type === "screen" ? "You (screen)" : "You") : s.name || "Student"}
                    </span>
                    {s.self && s.type !== "screen" && !mic && (
                      <span className="rounded bg-white/20 px-1">muted</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ToggleButton on={mic} onClick={() => setMic((s) => !s)} label={mic ? "Mute" : "Unmute"}>
              {mic ? <MicIcon /> : <MicOffIcon />}
            </ToggleButton>
            <ToggleButton on={cam} onClick={() => setCam((s) => !s)} label={cam ? "Camera off" : "Camera on"}>
              {cam ? <CamIcon /> : <CamOffIcon />}
            </ToggleButton>
            <ToggleButton on={sharing} onClick={toggleShare} label={sharing ? "Stop sharing" : "Share screen"}>
              <ScreenIcon />
            </ToggleButton>
            <button
              onClick={() => {
                setHand((s) => {
                  rtc.toggleHand(!s);
                  return !s;
                });
              }}
              className={
                "rounded-xl px-3 py-2 text-sm font-semibold " +
                (hand
                  ? "bg-amber-500 text-black"
                  : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800")
              }
            >
              ✋ Raise hand
            </button>
          </div>
        </section>

        {/* Sidebar: chat & participants */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Chat</h3>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={anon}
                  onChange={(e) => setAnon(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 text-emerald-500 bg-zinc-900"
                />
                Anonymous
              </label>
            </div>
            <ul className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
              {chat.map((m) => (
                <li
                  key={m.id}
                  className={
                    "rounded-xl px-3 py-2 text-sm " +
                    (m.self ? "bg-emerald-600 text-white ml-8" : "bg-zinc-800 text-zinc-200 mr-8")
                  }
                >
                  <div className="text-[10px] opacity-70">
                    {m.author} • {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="break-words">{m.text}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type a message"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button onClick={send} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Send
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-100">Participants</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Dot />
                  {p.self ? "You" : p.name || "Student"}
                  {p.self && hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
                  {!p.self && p.hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ============ Optional: /rooms/new auto-redirect ============ */
export function NewRoomRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const id = uid();
    navigate(`/rooms/${id}`, { replace: true, state: { title: "Quick Study Room" } });
  }, [navigate]);
  return null;
}

/* ====================== UI Components ====================== */
function ToggleButton({ on, onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
        (on ? "bg-zinc-800 text-zinc-100" : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800")
      }
      aria-label={label}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />;
}

/* ====================== Icons ====================== */
function ArrowLeft(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
}
function CamIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H3A2 2 0 0 0 1 7v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z" /></svg>;
}
function CamOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-8 w-8" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-3.44-3.44A2 2 0 0 1 15 21H3a2 2 0 0 1-2-2V7c0-.35.06-.68.17-1L.7 3.5 2.1 2.1l1.9 1.9H15a2 2 0 0 1 2 2v6.17l2-2V7l4 4v2l-3.17-3.17L2.1 3.5z" /></svg>;
}
function MicIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19h2v3h-2z" /></svg>;
}
function MicOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-4.02-4.02A7 7 0 0 1 5 11h2a5 5 0 0 0 6.94 4.57L12 13.63V5a3 3 0 0 1 5.8-1.2l1.6 1.6-1.4 1.4L16.8 5.2A1 1 0 0 0 15 6v5.63l-2-2V5a1 1 0 0 0-2 0v6.63l-7.5-7.5zM11 19h2v3h-2z" /></svg>;
}
function ScreenIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M3 4h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7v2h3v2H7v-2h3v-2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>;
}
function UserIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-12 w-12" {...props}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" /></svg>;
}

/* ====================== Utils ====================== */
function uid() { return Math.random().toString(36).slice(2, 9); }
function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  const u = [[60, "s"], [60, "m"], [24, "h"], [7, "d"]];
  let n = d, l = "s";
  for (const [k, t] of u) { if (n < k) { l = t; break; } n = Math.floor(n / k); l = t; }
  return `${Math.max(1, Math.floor(n))}${l} ago`;
}
