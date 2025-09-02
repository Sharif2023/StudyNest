import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/** ---------- THEME HELPERS (updated to slate + cyan/blue) ---------- */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-slate-800/60 border border-slate-700 text-slate-200",
    accent: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300",
    success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300",
    warn: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{children}</span>;
};

const Card = ({ className = "", children }) => (
  <div
    className={`bg-slate-950/60 backdrop-blur rounded-2xl border border-slate-800 shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_20px_-10px_rgba(0,0,0,0.6)] ${className}`}
  >
    {children}
  </div>
);

const Button = ({ variant = "primary", size = "sm", className = "", ...props }) => {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
    soft:
      "bg-slate-900/70 border border-slate-700 hover:bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
    ghost:
      "bg-transparent hover:bg-slate-800/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
  };
  return (
    <button className={`${sizes[size]} rounded-lg ${variants[variant]} ${className}`} {...props} />
  );
};

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
      style={{ width: `${value}%` }}
    />
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
              <div className="font-semibold leading-tight text-slate-100">{c.title}</div>
              <div className="text-xs text-slate-400">
                {c.code} • {c.instructor}
              </div>
            </div>
            <div>
              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-xs inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> LIVE
                </span>
              ) : (
                <Badge tone="warn">Starts {formatTime(c.startAt)}</Badge>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {(c.tags || []).slice(0, 3).map((t) => (
              <Badge key={t} tone="accent">
                {t}
              </Badge>
            ))}
            {isLive && <span className="text-xs text-slate-400">👀 {c.viewers} watching</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            {isLive ? (
              <ProgressBar value={progress} />
            ) : (
              <div className="text-xs text-slate-400">~{minutesLeft} min</div>
            )}
            <Button className="ml-3" size="md">
              {isLive ? "Join" : "Remind me"}
            </Button>
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
        <h3 className="text-sm font-semibold text-slate-300 uppercase">Pomodoro Timer</h3>
        <div className="text-xs text-slate-400">Focus • Short • Long</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full grid place-content-center border-4 border-white/10 shadow-inner">
          <div className="text-xl font-mono text-slate-100">
            {mm}:{ss}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={() => setRun((r) => !r)} size="md">
              {run ? "Pause" : "Start"}
            </Button>
            <Button
              onClick={() => {
                setRun(false);
                setSec(25 * 60);
              }}
              variant="soft"
              size="md"
            >
              Reset
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSec(25 * 60)} variant="ghost">
              Focus 25
            </Button>
            <Button onClick={() => setSec(5 * 60)} variant="ghost">
              Short 5
            </Button>
            <Button onClick={() => setSec(15 * 60)} variant="ghost">
              Long 15
            </Button>
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
          <span className="px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-xs inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> LIVE ROOM
          </span>
          <Badge tone="neutral">{anonymous ? "Anonymous" : "You"}</Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="soft" size="md">
              ▶ Play
            </Button>
            <Button onClick={() => setMuted((m) => !m)} variant="soft" size="md">
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="soft" size="md">
              👥 142
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="md">🤝 Peer Match</Button>
            <Button variant="soft" size="md">
              💬 Ask AI
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border-t border-slate-800 bg-slate-950/50">
        <input
          className="md:col-span-2 bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          placeholder="Chat (press Enter to send) — be respectful"
        />
        <div className="flex items-center gap-2">
          <Button className="flex-1" size="md">
            Share Resource
          </Button>
          <Button variant="soft" aria-label="Lock room">
            🔒
          </Button>
        </div>
      </div>
    </Card>
  );
}

// global, lightweight, transparent scrollbar styles for the sidebar
const ScrollStyles = () => (
  <style>{`
    .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.25) transparent; }
    .custom-scroll::-webkit-scrollbar { width: 8px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 8px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

export default function Home() {
  const [anonymous, setAnonymous] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // collapsed by default
  const SIDEBAR_W = navOpen ? 240 : 72;

  const live = mockCourses.filter((c) => c.status === "live");
  const upcoming = mockCourses.filter((c) => c.status === "upcoming");

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(14,165,233,0.14),transparent),radial-gradient(800px_400px_at_80%_-20%,rgba(59,130,246,0.12),transparent)]">
      <ScrollStyles />

      {/* Left Sidebar */}
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={SIDEBAR_W}
      />

      {/* Header */}
      <Header sidebarWidth={SIDEBAR_W} />

      {/* Main */}
      <main style={{ paddingLeft: SIDEBAR_W }} className="transition-[padding] duration-300">
        <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left column */}
            <div className="order-2 xl:order-1 xl:col-span-5 space-y-6">
              <Card className="p-3 border-cyan-500/20">
                <div className="text-cyan-300 text-sm font-medium">💡 Daily Tip</div>
                <p className="text-sm mt-1 text-slate-300">
                  After live sessions, add a 10-minute recall quiz and schedule a 2-day review.
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Live Now</h3>
                  <Button variant="soft" size="sm">
                    See all
                  </Button>
                </div>
                <div className="space-y-3">
                  {live.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
                  Upcoming Sessions
                </h3>
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <CourseCard key={c.id} c={c} />
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Q&A Forum</h3>
                  <Link to="/qa/ask">
                    <Button variant="soft" size="sm">
                      Ask
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {qaList.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800"
                    >
                      <div className="text-sm font-medium text-slate-100">{q.question}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <Badge tone="neutral">{q.course}</Badge>
                        <span>👍 {q.votes}</span>
                        <span>{q.answers} answers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Shortcuts</h3>
                </div>
                {/* Adjusted grid container for shortcuts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"> {/* Changed gap to gap-2 for tighter spacing */}
                  <Link to="/forum" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Ask a question
                  </Link>
                  <Link to="/rooms" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Join room
                  </Link>
                  <Link to="/notes" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Add notes
                  </Link>
                  <Link to="/resources" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Resources
                  </Link>
                  <Link to="/calendar" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Calendar
                  </Link>
                  <Link to="/profile" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Profile
                  </Link>
                  <Link to="/ai-check" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    AI File Check
                  </Link>
                  <Link to="/ai-usage" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    AI Usage Checker
                  </Link>
                  <Link to="/humanize" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Humanize Writing
                  </Link>
                  <Link to="/search" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Search
                  </Link>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">
                    Shared Resource Library
                  </h3>
                  <Button variant="soft" size="sm">
                    Upload
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Algebra", "Calculus", "DBMS", "AI"].map((t) => (
                    <div
                      key={t}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800"
                    >
                      <div className="text-sm font-medium text-slate-100">{t}</div>
                      <div className="text-xs text-slate-400 mt-1">12 files • 4 notes</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
                  Smart Recommendations
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between text-sm">
                    <div>Revise DP fundamentals</div> <Badge tone="success">Weak Area</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Practice convolution problems</div> <Badge tone="accent">Quiz</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Flashcards: B+ Trees</div> <Badge tone="warn">Upcoming</Badge>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Right column */}
            <div className="order-1 xl:order-2 xl:col-span-7 space-y-6">
              <div className="xl:sticky xl:top-[84px]">
                <StudyRoom anonymous={anonymous} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Pomodoro />

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase">
                      Calendar & Todo
                    </h3>
                    <Link to="/calendar">
                      <Button variant="soft" size="sm">
                        Open
                      </Button>
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">CSE 220 – Homework 4</div>
                      <span className="text-xs text-slate-400">Today 9:00 PM</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">DBMS reading – Index Trees</div>
                      <span className="text-xs text-slate-400">Tomorrow 8:00 AM</span>
                    </li>
                    <li className="flex items-center justify-between text-sm">
                      <div className="truncate max-w-[60%]">EEE 205 – Quiz</div>
                      <span className="text-xs text-slate-400">Fri 10:00 AM</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
                    Study Streak
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔥</div>
                    <div>
                      <div className="text-2xl font-semibold">12 days</div>
                      <div className="text-xs text-slate-400">Keep it going! +20 pts/day</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={57} />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase">Leaderboard</h3>
                    <Link to="/leaderboard" className="text-xs text-slate-300 hover:text-white">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-800 grid place-content-center text-xs">
                            {i + 1}
                          </div>
                          <div className="text-sm">{u.name}</div>
                        </div>
                        <div className="text-xs text-slate-400">
                          {u.points} pts • 🔥{u.streak}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer sidebarWidth={SIDEBAR_W} />
    </div>
  );
}
