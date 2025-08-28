import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
/**
 * StudyNest — Dashboard (after login)
 * -------------------------------------------------------------
 * A clean, fast dashboard showing:
 * - Welcome header with user avatar + quick actions
 * - Today / Upcoming schedule (mocked) with join links
 * - My Groups (chips) and quick entry points
 * - Recent Activity (from forum, rooms, notes — mocked)
 * - Shortcuts to key features: Q&A Forum, Notes, Rooms, Resources, Calendar
 * - Progress glance (weekly goals checklist)
 *
 * Drop-in: <Route path="/dashboard" element={<Dashboard/>} />
 * Replace mock API with your real backend later.
 */

export default function Dashboard() {
  const [user] = useState(() => seedUser());
  const [schedule, setSchedule] = useState([]);
  const [recent, setRecent] = useState([]);
  const [goals, setGoals] = useState(() => seedGoals());

  useEffect(() => {
    // Simulate fetching
    (async () => {
      await fakeApi.delay(350);
      setSchedule(seedSchedule());
      setRecent(seedRecent());
    })();
  }, []);

  const progress = useMemo(() => {
    const done = goals.filter((g) => g.done).length;
    return Math.round((done / Math.max(1, goals.length)) * 100);
  }, [goals]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="text-sm text-zinc-600">Welcome back, {user.firstName}! Ready to study together?</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/forum" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Q&A Forum</a>
            <a href="/rooms" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Study Rooms</a>
            <Link to="/resources"className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Shared Resources</Link>
            <a href="/notes" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Upload Notes</a>
            <Link to="/search" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Search</Link>
            <Link to="/profile" className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">My Profile</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <section className="lg:col-span-2 space-y-6">
          <WelcomeCard user={user} />

          {/* Today / Upcoming */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Today & Upcoming</h2>
              <a href="/calendar" className="text-sm font-semibold text-zinc-900 hover:underline">Open calendar →</a>
            </div>
            <ul className="divide-y divide-zinc-200">
              {schedule.length === 0 ? (
                <li className="px-5 py-6 text-sm text-zinc-600">No events yet. Create one from Calendar.</li>
              ) : (
                schedule.map((ev) => (
                  <li key={ev.id} className="px-5 py-4 flex items-center gap-4">
                    <TimePill start={ev.start} end={ev.end} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-zinc-900">{ev.title}</h3>
                        {ev.type === "room" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Live</span>
                        )}
                      </div>
                      <p className="truncate text-sm text-zinc-600">{ev.course} • {ev.location}</p>
                    </div>
                    {ev.type === "room" ? (
                      <a href={`/rooms/${ev.roomId}`} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">Join</a>
                    ) : (
                      <a href={ev.link || "/calendar"} className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50">Details</a>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Recent activity</h2>
              <div className="flex items-center gap-2 text-sm">
                <a href="/forum" className="rounded-full border border-zinc-300 px-3 py-1 font-semibold hover:bg-zinc-50">Forum</a>
                <a href="/notes" className="rounded-full border border-zinc-300 px-3 py-1 font-semibold hover:bg-zinc-50">Notes</a>
                <a href="/resources" className="rounded-full border border-zinc-300 px-3 py-1 font-semibold hover:bg-zinc-50">Resources</a>
              </div>
            </div>
            <ul className="divide-y divide-zinc-200">
              {recent.map((a) => (
                <li key={a.id} className="px-5 py-4 flex items-start gap-4">
                  <Avatar name={a.actor} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-800">
                      <span className="font-semibold">{a.actor}</span> {a.verb} {a.object}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{timeAgo(a.createdAt)} • {a.context}</p>
                  </div>
                  <a href={a.href} className="rounded-xl border border-zinc-300 px-3 py-1 text-sm font-semibold hover:bg-zinc-50 shrink-0">Open</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right column */}
        <aside className="space-y-6">
          {/* My Groups */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900">My groups</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.groups.map((g) => (
                <a key={g.id} href={`/groups/${g.slug}`} className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-50">
                  {g.name}
                </a>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a href="/groups/new" className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">Create group</a>
              <a href="/groups" className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50">Browse</a>
            </div>
          </div>

          {/* Progress / Goals */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900">Weekly goals</h3>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-600">{progress}% complete</p>
            <ul className="mt-3 space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={g.done}
                    onChange={() => setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={g.done ? "text-zinc-400 line-through" : "text-zinc-800"}>{g.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Shortcuts */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900">Shortcuts</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <a href="/forum" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Ask a question</a>
              <a href="/rooms" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Join room</a>
              <a href="/notes" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Add notes</a>
              <a href="/resources" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Resources</a>
              <a href="/calendar" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Calendar</a>
              <a href="/profile" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Profile</a>
              <Link to="/search" className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold hover:bg-zinc-50">Search</Link>

            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* -------------------- Sub‑components -------------------- */
function WelcomeCard({ user }) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white shadow-sm ring-1 ring-zinc-800">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} big />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">Hi {user.firstName}, let’s hit your goals this week 👋</h2>
          <p className="truncate text-sm text-white/80">You have {user.pending} pending items today • Keep up the streak!</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2">
          <a href="/rooms/new" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">Start a study room</a>
          <a href="/forum" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Ask a question</a>
        </div>
      </div>
    </div>
  );
}

function TimePill({ start, end }) {
  const [s, e] = [new Date(start), new Date(end)];
  const fmt = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const day = s.toDateString() === today.toDateString() ? "Today" : s.toLocaleDateString();
  return (
    <div className="shrink-0 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
      {day} • {fmt(s)}–{fmt(e)}
    </div>
  );
}

function Avatar({ name, big = false }) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <span className={"inline-grid place-items-center rounded-full bg-zinc-900 text-white font-bold " + (big ? "h-12 w-12 text-lg" : "h-7 w-7 text-[10px]")}>{initial}</span>
  );
}

/* -------------------- Mock data & utils -------------------- */
function seedUser() {
  return {
    id: "u1",
    name: "Md Mahmudul Hasan",
    firstName: "Hasan",
    pending: 3,
    groups: [
      { id: "g1", name: "CSE220 - Algorithms", slug: "cse220-algo" },
      { id: "g2", name: "EEE101 - Intro", slug: "eee101-intro" },
      { id: "g3", name: "Math-III", slug: "math-iii" },
    ],
  };
}
function seedSchedule() {
  const now = Date.now();
  const h = (n) => new Date(now + n * 36e5).toISOString();
  return [
    { id: "e1", title: "CSE220 Group Session", course: "CSE220", location: "Room A (Online)", start: h(1), end: h(2), type: "room", roomId: "abc123" },
    { id: "e2", title: "EEE101 Quiz Review", course: "EEE101", location: "Library L2", start: h(5), end: h(6), type: "event", link: "/calendar/e2" },
  ];
}
function seedRecent() {
  const ago = (h) => new Date(Date.now() - h * 36e5).toISOString();
  return [
    { id: "a1", actor: "Nusrat", verb: "answered your question", object: "How to approach DP for coin change?", context: "Forum", href: "/forum", createdAt: ago(2) },
    { id: "a2", actor: "Farhan", verb: "uploaded notes to", object: "EEE101 - Week 3", context: "Notes", href: "/notes", createdAt: ago(5) },
    { id: "a3", actor: "Sharif", verb: "scheduled a", object: "study room for CSE220", context: "Rooms", href: "/rooms", createdAt: ago(22) },
  ];
}
function seedGoals() {
  return [
    { id: "t1", title: "Finish graph assignment", done: false },
    { id: "t2", title: "Review DP patterns", done: true },
    { id: "t3", title: "Upload EEE101 notes", done: false },
  ];
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  const steps = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
  ];
  let n = diff, u = "s";
  for (const [step, unit] of steps) {
    if (n < step) { u = unit; break; }
    n = Math.floor(n / step); u = unit;
  }
  return `${Math.max(1, Math.floor(n))}${u} ago`;
}

const fakeApi = { delay(ms) { return new Promise((r) => setTimeout(r, ms)); } };
