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

const Home = () => {
  const [anonymous, setAnonymous] = useState(false);
  const live = mockCourses.filter((c) => c.status === "live");
  const upcoming = mockCourses.filter((c) => c.status === "upcoming");

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(56,189,248,0.15),transparent),radial-gradient(800px_400px_at_80%_-20%,rgba(59,130,246,0.15),transparent)]">
      {/* Top Nav */}
      <div className="sticky top-0 z-40 backdrop-blur bg-slate-950/50 border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="h-8 w-8 rounded-xl bg-sky-600 grid place-content-center font-bold">
              SG
            </Link>
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
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              Points <span className="font-semibold">1,245</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-content-center">😊</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-[240px_1fr]">
        {/* Left Nav */}
        <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 gap-2 p-3 border-r border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between px-2 py-1">
            <div>
              <div className="font-semibold leading-tight">University Hub</div>
              <div className="text-xs opacity-60">Study Network</div>
            </div>
            <button
              onClick={() => setAnonymous((a) => !a)}
              className={`h-6 w-11 rounded-full relative transition ${anonymous ? "bg-emerald-600" : "bg-slate-700"}`}
              title="Anonymous mode"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${anonymous ? "right-0.5" : "left-0.5"}`}
              />
            </button>
          </div>

          <nav className="mt-2 space-y-1">
            <Link to="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              🏠 <span className="text-sm">Dashboard</span>
            </Link>
            <Link to="/rooms" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              🎥 <span className="text-sm">Study Rooms</span>
            </Link>
            <Link to="/courses" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              📚 <span className="text-sm">Courses</span>
            </Link>
            <Link to="/qa" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              💬 <span className="text-sm">Q&A Forum</span>
            </Link>
            <Link to="/notes" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              🗂️ <span className="text-sm">Notes Repo</span>
            </Link>
            <Link to="/library" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              📎 <span className="text-sm">Shared Library</span>
            </Link>
            <Link to="/calendar" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              📅 <span className="text-sm">Calendar</span>
            </Link>
            <Link to="/leaderboard" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              🏆 <span className="text-sm">Leaderboard</span>
            </Link>
            <Link to="/challenges" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-900">
              ⚔️ <span className="text-sm">Challenges</span>
            </Link>
          </nav>

          <div className="mt-auto space-y-2">
            <Card className="p-3">
              <div className="text-sm">Anonymous mode</div>
              <p className="mt-1 text-xs opacity-70">Hide your name in rooms & Q&A.</p>
            </Card>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800">
              ⤴ Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 lg:p-6">
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
        </main>
      </div>
    </div>
  );
};

export default Home;
