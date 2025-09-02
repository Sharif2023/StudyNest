import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/**
 * StudyNest — Tagging & Topic Search (Global Discovery)
 * --------------------------------------------------------------
 * Unified discovery across Forum posts, Notes, Resources, Rooms.
 * - Global search bar (title/desc/body)
 * - Tag chips with counts; trending tags; per-type filters
 * - URL sync: /search?q=dp&tag=graphs&type=notes
 * - Result groups with lightweight cards
 * - Type toggles: All, Forum, Notes, Resources, Rooms
 * - Keyboard: Enter to search, Esc to clear
 *
 * Hook it up:
 *   <Route path="/search" element={<TagSearch/>} />
 *   Add links like <Link to="/search?tag=dp">#dp</Link>
 *
 * Data: uses mock seed + optional localStorage bridges from other features.
 * Replace load*() with your API calls later.
 */

export default function TagSearch() {
  const nav = useNavigate();
  const loc = useLocation();

  const params = new URLSearchParams(loc.search);
  const [q, setQ] = useState(params.get("q") || "");
  const [activeTag, setActiveTag] = useState(params.get("tag") || "");
  const [type, setType] = useState(params.get("type") || "all");

  // Pull data from modules (mock + localStorage bridges)
  const notes = useMemo(() => loadNotes(), []);
  const resources = useMemo(() => loadResources(), []);
  const forum = useMemo(() => loadForum(), []);
  const rooms = useMemo(() => loadRooms(), []);

  const allItems = useMemo(() => {
    // normalize to a single index
    const n = notes.map((n) => ({
      id: n.id,
      kind: "notes",
      title: n.title,
      description: n.description,
      course: n.course,
      semester: n.semester,
      tags: n.tags || [],
      url: `/notes#${n.id}`,
      updatedAt: n.updatedAt || n.createdAt,
    }));
    const r = resources.map((x) => ({
      id: x.id,
      kind: "resources",
      title: x.title,
      description: x.description,
      course: x.course,
      semester: x.semester,
      tags: x.tags || [],
      url: `/resources#${x.id}`,
      updatedAt: x.updatedAt || x.createdAt,
    }));
    const f = forum.map((p) => ({
      id: p.id,
      kind: "forum",
      title: p.title,
      description: p.body,
      course: p.course,
      semester: p.semester,
      tags: p.tags || [],
      url: `/forum#${p.id}`,
      updatedAt: p.updatedAt || p.createdAt,
    }));
    const rm = rooms.map((m) => ({
      id: m.id,
      kind: "rooms",
      title: m.title,
      description: m.topic || "Study room",
      course: m.course,
      semester: m.semester,
      tags: m.tags || [],
      url: `/rooms/${m.id}`,
      updatedAt: m.createdAt,
    }));
    return [...n, ...r, ...f, ...rm];
  }, [notes, resources, forum, rooms]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const map = new Map();
    for (const it of allItems) for (const t of it.tags) map.set(t, (map.get(t) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  }, [allItems]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return allItems.filter((it) => {
      const passType = type === "all" || it.kind === type;
      const passTag = !activeTag || it.tags.includes(activeTag);
      const passQ = !ql || it.title.toLowerCase().includes(ql) || (it.description || "").toLowerCase().includes(ql);
      return passType && passTag && passQ;
    }).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [allItems, q, activeTag, type]);

  // Sync URL when filters change
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (activeTag) p.set("tag", activeTag);
    if (type && type !== "all") p.set("type", type);
    nav({ pathname: "/search", search: p.toString() }, { replace: true });
  }, [q, activeTag, type]);

  // Group results by type
  const groups = useMemo(() => {
    const g = { forum: [], notes: [], resources: [], rooms: [] };
    for (const it of filtered) g[it.kind].push(it);
    return g;
  }, [filtered]);

  const clearAll = () => { setQ(""); setActiveTag(""); setType("all"); };

  const Select = ({ label, value, onChange, options }) => (
    <label className="text-white inline-flex items-center gap-2 text-sm">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <LeftNav />
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold tracking-tight text-white">Search & Tags</h1>
          <p className="text-sm text-white">Find anything across StudyNest by topic.</p>

          {/* Search bar and type filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xl">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setQ(""); if (e.key === "Enter") setQ(e.currentTarget.value); }}
                placeholder="Search notes, resources, forum posts, rooms…"
                className="w-full rounded-xl border border-white bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded-md border border-zinc-300 px-2 py-0.5">Clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                ["all", "All"],
                ["forum", "Forum"],
                ["notes", "Notes"],
                ["resources", "Resources"],
                ["rooms", "Rooms"],
              ].map(([val, label]) => (
                <button key={val} onClick={() => setType(val)} className={"rounded-xl px-3 py-1.5 font-semibold " + (type === val ? "bg-zinc-900 text-white" : "border border-white text-white hover:bg-zinc-500")}>{label}</button>
              ))}
              {(q || activeTag || type !== "all") && (
                <button onClick={clearAll} className="rounded-xl px-3 py-1.5 text-sm border border-white hover:bg-zinc-500">Reset</button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tag cloud */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Trending tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {tagCounts.length === 0 ? (
            <span className="text-sm text-zinc-500">No tags yet</span>
          ) : (
            tagCounts.map(([t, c]) => (
              <button key={t} onClick={() => setActiveTag(t)} className={"rounded-full px-3 py-1 text-xs font-semibold " + (activeTag === t ? "bg-emerald-600 text-white" : "border border-zinc-300 hover:bg-zinc-50")}>#{t} <span className="ml-1 text-[10px] opacity-70">{c}</span></button>
            ))
          )}
        </div>
      </section>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ResultGroup title="Forum" items={groups.forum} emptyHint="Ask in the Q&A Forum" link="/forum" />
        <ResultGroup title="Lecture Notes" items={groups.notes} emptyHint="Upload your first notes" link="/notes" />
        <ResultGroup title="Resources" items={groups.resources} emptyHint="Add a resource" link="/resources" />
        <ResultGroup title="Study Rooms" items={groups.rooms} emptyHint="Start a study room" link="/rooms" />
      </div>
      <Footer />
    </main>
  );
}

function ResultGroup({ title, items, emptyHint, link }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <Link to={link} className="text-sm font-semibold text-zinc-900 hover:underline">Open {title.toLowerCase()} →</Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-4 py-8 text-center text-sm text-zinc-600">No results. {emptyHint}?</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((it) => (
            <li key={it.kind + it.id}>
              <MiniCard item={it} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MiniCard({ item }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 capitalize">{item.kind}</span>
          {item.course && <span className="rounded-full bg-zinc-100 px-2 py-0.5">{item.course}</span>}
          {item.semester && <span className="rounded-full bg-zinc-100 px-2 py-0.5">{item.semester}</span>}
          <span className="ml-auto text-[11px]">{timeAgo(item.updatedAt)}</span>
        </div>
        <h4 className="mt-2 truncate font-semibold text-zinc-900" title={item.title}>{item.title}</h4>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.description}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {item.tags.slice(0, 5).map((t) => (
            <Link key={t} to={`/search?tag=${encodeURIComponent(t)}`} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">#{t}</Link>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Link to={item.url} className="rounded-xl border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-50">Open</Link>
      </div>
    </article>
  );
}

/* ------------------------ Data bridges ------------------------ */
function loadNotes() {
  // Bridge to NotesRepository local data if present
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.notes"));
    if (Array.isArray(raw)) return raw;
  } catch { }
  return seedNotes();
}
function loadResources() {
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.resources"));
    if (Array.isArray(raw)) return raw;
  } catch { }
  return seedResources();
}
function loadForum() {
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.forum"));
    if (Array.isArray(raw)) return raw;
  } catch { }
  return seedForum();
}
function loadRooms() {
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.rooms"));
    if (Array.isArray(raw)) return raw;
  } catch { }
  return seedRooms();
}

/* ------------------------ Seeds ------------------------ */
function seedNotes() {
  return [
    { id: uid(), title: "CSE220 - DP Patterns (Week 3)", description: "Memoization patterns, base cases.", course: "CSE220", semester: "Fall 2025", tags: ["dp", "coin-change", "top-down"], createdAt: now(-30), updatedAt: now(-2) },
    { id: uid(), title: "EEE101 - Lab Diagrams", description: "Ohm's law, series-parallel.", course: "EEE101", semester: "Fall 2025", tags: ["lab", "diagrams"], createdAt: now(-60), updatedAt: now(-10) },
  ];
}
function seedResources() {
  return [
    { id: uid(), title: "Algorithm Book Ch 1–3", description: "Core textbook", course: "CSE220", semester: "Fall 2025", tags: ["book", "basics"], createdAt: now(-20), updatedAt: now(-2) },
    { id: uid(), title: "EEE101 Past Papers", description: "Midterm/final bundle", course: "EEE101", semester: "Fall 2025", tags: ["exam", "practice"], createdAt: now(-100), updatedAt: now(-10) },
  ];
}
function seedForum() {
  return [
    { id: uid(), title: "How to approach coin change?", body: "I get stuck on base cases…", course: "CSE220", semester: "Fall 2025", tags: ["dp", "coin-change"], createdAt: now(-12), updatedAt: now(-1) },
    { id: uid(), title: "EEE101 quiz tips", body: "Voltage divider intuition…", course: "EEE101", semester: "Fall 2025", tags: ["quiz", "practice"], createdAt: now(-40), updatedAt: now(-5) },
  ];
}
function seedRooms() {
  return [
    { id: uid(), title: "CSE220 Group Session", topic: "DP review", course: "CSE220", semester: "Fall 2025", tags: ["dp", "review"], createdAt: new Date().toISOString() },
  ];
}

/* ------------------------ Utils ------------------------ */
function uid() { return Math.random().toString(36).slice(2, 9); }
function now(hoursAgo) { return new Date(Date.now() + hoursAgo * 36e5).toISOString(); }
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000; const steps = [[60, 's'], [60, 'm'], [24, 'h'], [7, 'd']];
  let n = diff, u = 's'; for (const [k, t] of steps) { if (n < k) { u = t; break; } n = Math.floor(n / k); u = t; }
  return `${Math.max(1, Math.floor(n))}${u} ago`;
}
