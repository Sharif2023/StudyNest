import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const Badge = ({ children }) => (
  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800/60 border border-slate-700">
    {children}
  </span>
);

const Card = ({ className = "", children }) => (
  <div className={`bg-slate-900/60 backdrop-blur rounded-2xl border border-slate-800 shadow-sm ${className}`}>
    {children}
  </div>
);

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
    <div className="h-full bg-sky-500" style={{ width: `${value}%` }} />
  </div>
);

const formatTime = (t) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const mockCourses = [
  {
    id: 1,
    title: "Algorithms I: Greedy & DP",
    code: "CSE 220",
    instructor: "Dr. Rahman",
    viewers: 128,
    tags: ["Data Structures", "DP"],
    status: "live",
    startedAt: Date.now() - 12 * 60 * 1000,
    thumbnail:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1400&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Signals & Systems – LTI Review",
    code: "EEE 205",
    instructor: "Prof. Nabila",
    viewers: 76,
    tags: ["EEE"],
    status: "live",
    startedAt: Date.now() - 5 * 60 * 1000,
    thumbnail:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1400&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "DBMS Indexing & Query Plans",
    code: "CSE 310",
    instructor: "Dr. Hasan",
    tags: ["DBMS"],
    status: "upcoming",
    startAt: Date.now() + 24 * 60 * 1000,
    thumbnail:
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1400&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Calculus II: Series Masterclass",
    code: "MAT 202",
    instructor: "Dr. Shams",
    tags: ["Calculus"],
    status: "upcoming",
    startAt: Date.now() + 4 * 60 * 60 * 1000,
    thumbnail:
      "https://images.unsplash.com/photo-1529101091764-c3526daf38fe?q=80&w=1400&auto=format&fit=crop",
  },
];

const qaList = [
  {
    id: 11,
    course: "CSE 220",
    question: "Proof that activity selection is greedy-optimal?",
    votes: 12,
    answers: 3,
    tag: "Greedy",
  },
  {
    id: 12,
    course: "EEE 205",
    question: "Why does convolution flip one signal?",
    votes: 9,
    answers: 2,
    tag: "Signals",
  },
  {
    id: 13,
    course: "CSE 310",
    question: "Clustered vs Non-clustered index trade-offs",
    votes: 15,
    answers: 6,
    tag: "DBMS",
  },
];

const leaderboard = [
  { id: "s1", name: "Ayesha", points: 1280, streak: 17 },
  { id: "s2", name: "Siam", points: 1100, streak: 15 },
  { id: "s3", name: "Tanvir", points: 960, streak: 11 },
];

function CourseCard({ c }) {
  const isLive = c.status === "live";
  const progress = isLive
    ? Math.min(100, Math.floor(((Date.now() - c.startedAt) / (60 * 60 * 1000)) * 100))
    : 0;
  const timeLeftMs = c.startAt ? Math.max(0, c.startAt - Date.now()) : 0;
  const minutesLeft = Math.ceil(timeLeftMs / 60000);

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <img src={c.thumbnail} alt="" className="h-24 w-32 object-cover" />
        <div className="p-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold leading-tight">{c.title}</div>
              <div className="text-xs opacity-70">
                {c.code} • {c.instructor}
              </div>
            </div>
            <div>
              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600 text-red-300 text-xs inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500 text-amber-300 text-xs">
                  Starts {formatTime(c.startAt)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {(c.tags || []).slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {isLive && <span className="text-xs opacity-70">👀 {c.viewers} watching</span>}
          </div>

          <div className="mt-2 flex items-center justify-between">
            {isLive ? (
              <ProgressBar value={progress} />
            ) : (
              <div className="text-xs opacity-70">~{minutesLeft} min</div>
            )}
            <button className="ml-3 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs">
              {isLive ? "Join" : "Remind me"}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Pomodoro() {
  const [sec, setSec] = useState(25 * 60);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [run]);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold opacity-80 uppercase">Pomodoro Timer</h3>
        <div className="text-xs opacity-70">Focus • Short • Long</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full grid place-content-center border-4 border-slate-700">
          <div className="text-xl font-mono">
            {mm}:{ss}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setRun((r) => !r)}
              className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm"
            >
              {run ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => {
                setRun(false);
                setSec(25 * 60);
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            >
              Reset
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSec(25 * 60)} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              Focus 25
            </button>
            <button onClick={() => setSec(5 * 60)} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              Short 5
            </button>
            <button onClick={() => setSec(15 * 60)} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              Long 15
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StudyRoom({ anonymous }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          loop
          autoPlay
          playsInline
          muted
        >
          <source
            src="https://cdn.coverr.co/videos/coverr-students-studying-1782/1080p.mp4"
            type="video/mp4"
          />
        </video>

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600 text-red-300 text-xs inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE ROOM
          </span>
          <Badge>{anonymous ? "Anonymous" : "You"}</Badge>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:bg-slate-900">
              ▶ Play
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:bg-slate-900"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:bg-slate-900">
              👥 142
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:bg-slate-900">
              🤝 Peer Match
            </button>
            <button className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs hover:bg-slate-900">
              💬 Ask AI
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border-t border-slate-800 bg-slate-950/50">
        <input
          className="md:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-sm"
          placeholder="Chat (press Enter to send) — be respectful"
        />
        <div className="flex items-center gap-2">
          <button className="flex-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm">
            Share Resource
          </button>
          <button className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm">
            🔒
          </button>
        </div>
      </div>
    </Card>
  );
}

// New: Sidebar item component for icon + label
const NavItem = ({ to, icon, label, expanded }) => (
  <Link
    to={to}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900 group"
  >
    <span className="text-xl opacity-60 group-hover:opacity-90 transition">{icon}</span>
    {expanded && <span className="text-sm">{label}</span>}
  </Link>
);

// global, lightweight, transparent scrollbar styles for the sidebar
const ScrollStyles = () => (
  <style>{`
    .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.25) transparent; }
    .custom-scroll::-webkit-scrollbar { width: 8px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 8px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

const Home = () => {
  const [anonymous, setAnonymous] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // collapsed by default (icons only)
  const live = mockCourses.filter((c) => c.status === "live");
  const upcoming = mockCourses.filter((c) => c.status === "upcoming");

  // widths for collapsed vs expanded
  const SIDEBAR_W = navOpen ? 240 : 72; // px

  const [moreVisible, setMoreVisible] = useState(false); // to toggle the visibility

  const toggleMoreVisibility = () => {
    setMoreVisible((prev) => !prev);
  };

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(56,189,248,0.15),transparent),radial-gradient(800px_400px_at_80%_-20%,rgba(59,130,246,0.15),transparent)]">
      {/* Fixed Left Sidebar */}
      <ScrollStyles />
      <aside
        className={`fixed top-0 left-0 h-screen border-r border-slate-800 bg-slate-950/60 backdrop-blur z-50 transition-[width] duration-300 flex flex-col`}
        style={{ width: SIDEBAR_W }}
      >
        {/* Brand + Toggle */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-800/60">
          <Link to="/" className="h-8 w-8 rounded-xl bg-sky-600 grid place-content-center font-bold">
            SG
          </Link>
          {navOpen && <span className="font-semibold hidden xl:block">Study Group</span>}
          <button
            onClick={() => setNavOpen((v) => !v)}
            className="ml-auto h-8 w-8 grid place-content-center rounded-lg bg-slate-900/70 border border-slate-800 hover:bg-slate-900"
            title={navOpen ? "Collapse" : "Expand"}
          >
            <span className="opacity-60">
              {navOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          </button>
        </div>

        {/* Profile / points (only in expanded) */}
        {navOpen && (
          <div className="px-3 py-2 border-b border-slate-800/60">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-content-center">😊</div>
              <div className="text-sm">
                <div className="font-medium leading-tight">University Hub</div>
                <div className="text-xs opacity-60">Study Network</div>
              </div>
            </div>
            <div className="mt-2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              Points <span className="font-semibold">1,245</span>
            </div>
          </div>
        )}

        {/* Left Navbar */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 pb-20 custom-scroll">
          <nav className="space-y-1">
            <NavItem
              to="/"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              }
              label="Dashboard"
              expanded={navOpen}
            />
            <NavItem
              to="/rooms"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              }
              label="Study Rooms"
              expanded={navOpen}
            />
            <NavItem
              to="/resources"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4m6 6V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8" />
                </svg>
              }
              label="Resources"
              expanded={navOpen}
            />
            <NavItem
              to="/forum"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 64 64"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  {/* Left bubble with question mark */}
                  <rect x="2" y="8" width="34" height="28" rx="4" ry="4" />
                  <path d="M19 18a5 5 0 015-5 5 5 0 015 5c0 3-2 4-3 5s-1 2-1 3" />
                  <circle cx="24" cy="30" r="1.5" />

                  {/* Right bubble with info */}
                  <rect x="28" y="28" width="34" height="28" rx="4" ry="4" />
                  <line x1="45" y1="32" x2="45" y2="32" />
                  <line x1="45" y1="38" x2="45" y2="48" />
                </svg>
              }
              label="Q&A Forum"
              expanded={navOpen}
            />
            <NavItem
              to="/notes"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              }
              label="Notes Repo"
              expanded={navOpen}
            />
            <NavItem
              to="/library"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-12v8m-16-8v8" />
                </svg>
              }
              label="Shared Library"
              expanded={navOpen}
            />
            <NavItem
              to="/to-do-list"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  {/* Box for the list */}
                  <rect x="3" y="4" width="18" height="16" rx="2" />

                  {/* Task 1 */}
                  <line x1="5" y1="8" x2="19" y2="8" />
                  <circle cx="5" cy="8" r="1" />

                  {/* Task 2 */}
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <circle cx="5" cy="12" r="1" />

                  {/* Task 3 */}
                  <line x1="5" y1="16" x2="19" y2="16" />
                  <circle cx="5" cy="16" r="1" />
                </svg>
              }
              label="To-Do List"
              expanded={navOpen}
            />
            <NavItem
              to="/parapahrasing-summarizing"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  {/* Pencil for paraphrasing */}
                  <path d="M12 1l-2 3h4l-2-3z" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <path d="M14 15l2 2-4 4-2-2 4-4z" />
                  <path d="M17 19l4-4-4-4" />
                  <path d="M7 19l-4-4 4-4" />
                </svg>
              }
              label="Paraphasing & Summarizing"
              expanded={navOpen}
            />
            <NavItem
              to="#"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                </svg>

              }
              label="More Tools"
              expanded={navOpen}
              onClick={toggleMoreVisibility}
            />

            {moreVisible && (
              <div className="space-y-1 mt-2">
                <NavItem to="/ai-file-check" icon="🔍" label="Ai File Check" expanded={navOpen} />
                <NavItem to="/ai-usage-check" icon="📊" label="Ai Usage Check" expanded={navOpen} />
              </div>
            )}
          </nav>
        </div>

        {/* Pinned footer (never overlaps) */}
        <div className="px-3 py-3 border-t border-slate-800/60 space-y-2">
          {navOpen && (
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">{anonymous ? "🫥" : "🙂"}</span>
                <div className="text-sm leading-tight">
                  <div className="font-medium">Anonymous mode</div>
                  <div className="text-xs opacity-70">Hide your name in rooms & Q&A.</div>
                </div>
                <button
                  onClick={() => setAnonymous((a) => !a)}
                  className={`ml-auto h-6 w-11 rounded-full relative transition ${anonymous ? "bg-emerald-600" : "bg-slate-700"}`}
                  aria-label="Toggle anonymous mode"
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${anonymous ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          )}
          <button className={`w-full flex items-center ${navOpen ? "gap-2 px-3 justify-center" : "justify-center"} py-2 rounded-xl bg-slate-900 hover:bg-slate-800`}>
            <span className="text-xl opacity-60"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
            </span>
            {navOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Top Nav (shifted to account for fixed sidebar) */}
      <div
        className="sticky top-0 z-40 backdrop-blur bg-slate-950/50 border-b border-slate-800"
        style={{ paddingLeft: SIDEBAR_W }}
      >
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold hidden sm:block">Study Group</span>
          </div>
          <div className="relative max-w-xl w-full">
            <input
              className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-3 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Search topics, tags, notes…"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              <button className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800">
                Tags
              </button>
              <button className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800">
                AI
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-content-center">😊</div>
          </div>
        </div>
      </div>

      {/* Main content shifted right to respect fixed sidebar */}
      <main style={{ paddingLeft: SIDEBAR_W }} className="transition-[padding] duration-300">
        <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left column (cards) */}
            <div className="order-2 xl:order-1 xl:col-span-5 space-y-6">
              {/* Daily tip */}
              <Card className="p-3 border-sky-800/60">
                <div className="text-sky-300 text-sm font-medium">💡 Daily Tip</div>
                <p className="text-sm mt-1 opacity-90">
                  After live sessions, add a 10-minute recall quiz and schedule a 2-day review.
                </p>
              </Card>

              {/* Live now */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold opacity-80 uppercase">Live Now</h3>
                  <button className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800">
                    See all
                  </button>
                </div>
                <div className="space-y-3">
                  {live.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              </Card>

              {/* Upcoming */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold opacity-80 uppercase mb-3">Upcoming Sessions</h3>
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              </Card>

              {/* Q&A */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold opacity-80 uppercase">Q&A Forum</h3>
                  <Link
                    to="/qa/ask"
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800"
                  >
                    Ask
                  </Link>
                </div>
                <div className="space-y-3">
                  {qaList.map((q) => (
                    <div key={q.id} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="text-sm font-medium">{q.question}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs opacity-70">
                        <Badge>{q.course}</Badge>
                        <span>👍 {q.votes}</span>
                        <span>{q.answers} answers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Shared Library + Smart Recs */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold opacity-80 uppercase">Shared Resource Library</h3>
                  <button className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800">
                    Upload
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Algebra", "Calculus", "DBMS", "AI"].map((t) => (
                    <div key={t} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="text-sm font-medium">{t}</div>
                      <div className="text-xs opacity-70 mt-1">12 files • 4 notes</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold opacity-80 uppercase mb-3">Smart Recommendations</h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between text-sm">
                    <div>Revise DP fundamentals</div> <Badge>Weak Area</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Practice convolution problems</div> <Badge>Quiz</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Flashcards: B+ Trees</div> <Badge>Upcoming</Badge>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Right column: Study Room (1/2 to 2/3 width, aligned right) */}
            <div className="order-1 xl:order-2 xl:col-span-7 space-y-6">
              <div className="xl:sticky xl:top-[84px]">
                <StudyRoom anonymous={anonymous} />
              </div>

              {/* Tools / Gamification widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Pomodoro />

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold opacity-80 uppercase">Calendar & Todo</h3>
                    <Link to="/calendar" className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:bg-slate-800">
                      Open
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">CSE 220 – Homework 4</div>
                      <span className="text-xs opacity-70">Today 9:00 PM</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">DBMS reading – Index Trees</div>
                      <span className="text-xs opacity-70">Tomorrow 8:00 AM</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">EEE 205 – Quiz</div>
                      <span className="text-xs opacity-70">Fri 10:00 AM</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-semibold opacity-80 uppercase mb-3">Study Streak</h3>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔥</div>
                    <div>
                      <div className="text-2xl font-semibold">12 days</div>
                      <div className="text-xs opacity-70">Keep it going! +20 pts/day</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={57} />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold opacity-80 uppercase">Leaderboard</h3>
                    <Link to="/leaderboard" className="text-xs opacity-80 hover:opacity-100">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-800 grid place-content-center text-xs">{i + 1}</div>
                          <div className="text-sm">{u.name}</div>
                        </div>
                        <div className="text-xs opacity-70">{u.points} pts • 🔥{u.streak}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="px-2 md:px-0 py-10 text-sm opacity-70 border-t border-slate-800 mt-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-semibold mb-2">Study Group</div>
                <p>Cross-section collaboration for our university. Built for focused, friendly learning.</p>
              </div>
              <div>
                <div className="font-semibold mb-2">Features</div>
                <ul className="space-y-1">
                  <li>Q&A with voting</li>
                  <li>Lecture notes repo</li>
                  <li>Online study rooms</li>
                  <li>Points & badges</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2">Tools</div>
                <ul className="space-y-1">
                  <li>Flashcards & quizzes</li>
                  <li>Paraphrase & summarize</li>
                  <li>Smart revision planner</li>
                  <li>Peer matching</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2">Contact</div>
                <ul className="space-y-1">
                  <li>support@studygrouphub.edu</li>
                  <li>Made with ❤️ by SG Devs</li>
                </ul>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Home;
