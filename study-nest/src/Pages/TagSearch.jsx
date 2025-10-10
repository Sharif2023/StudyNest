import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import Header from "../Components/Header";

/**
 * StudyNest — Tagging & Topic Search (Live API version)
 * --------------------------------------------------------------
 * Connects to backend: /src/api/search.php
 * Supports query (q), tag, and type filters.
 */

export default function TagSearch() {
  const nav = useNavigate();
  const loc = useLocation();

  const params = new URLSearchParams(loc.search);
  const [q, setQ] = useState(params.get("q") || "");
  const [activeTag, setActiveTag] = useState(params.get("tag") || "");
  const [type, setType] = useState(params.get("type") || "all");

  const [data, setData] = useState({
    notes: [],
    resources: [],
    forum: [],
    rooms: [],
  });
  const [loading, setLoading] = useState(false);

  // Sidebar states
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const COLLAPSED_W = 72;
  const EXPANDED_W = 248;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  // 🔥 Fetch from backend whenever query/tag/type changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (q) query.set("q", q);
        if (activeTag) query.set("tag", activeTag);
        if (type) query.set("type", type);

        const res = await fetch(`http://localhost/StudyNest/study-nest/src/api/search.php?${query.toString()}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [q, activeTag, type]);

  // Sync URL when filters change
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (activeTag) p.set("tag", activeTag);
    if (type && type !== "all") p.set("type", type);
    nav({ pathname: "/search", search: p.toString() }, { replace: true });
  }, [q, activeTag, type]);

  // Flatten all results for tag counting
  const allItems = useMemo(() => {
    const wrap = (arr, kind) =>
      (arr || []).map((it) => ({
        id: it.id,
        kind,
        title: it.title,
        description: it.description || it.body || "",
        course: it.course || it.course_title || "",
        semester: it.semester || "",
        tags: Array.isArray(it.tags)
          ? it.tags
          : typeof it.tags === "string"
          ? it.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        url:
          kind === "forum"
            ? `/forum#${it.id}`
            : kind === "notes"
            ? `/notes#${it.id}`
            : kind === "resources"
            ? `/resources#${it.id}`
            : kind === "rooms"
            ? `/rooms/${it.id}`
            : "#",
        updatedAt: it.updated_at || it.created_at,
      }));

    return [
      ...wrap(data.notes, "notes"),
      ...wrap(data.resources, "resources"),
      ...wrap(data.forum, "forum"),
      ...wrap(data.rooms, "rooms"),
    ];
  }, [data]);

  // Tag cloud counts
  const tagCounts = useMemo(() => {
    const map = new Map();
    for (const it of allItems)
      for (const t of it.tags) map.set(t, (map.get(t) || 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [allItems]);

  // Filtered results based on current filters
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return allItems
      .filter((it) => {
        const passType = type === "all" || it.kind === type;
        const passTag = !activeTag || it.tags.includes(activeTag);
        const passQ =
          !ql ||
          it.title.toLowerCase().includes(ql) ||
          (it.description || "").toLowerCase().includes(ql);
        return passType && passTag && passQ;
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [allItems, q, activeTag, type]);

  // Group by kind
  const groups = useMemo(() => {
    const g = { forum: [], notes: [], resources: [], rooms: [] };
    for (const it of filtered) g[it.kind].push(it);
    return g;
  }, [filtered]);

  const clearAll = () => {
    setQ("");
    setActiveTag("");
    setType("all");
  };

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

      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      {/* Search bar + filters */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQ("");
                if (e.key === "Enter") setQ(e.currentTarget.value);
              }}
              placeholder="Search notes, resources, forum posts, rooms…"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rounded-md border border-zinc-300 px-2 py-0.5 bg-white hover:bg-zinc-50"
              >
                Clear
              </button>
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
              <button
                key={val}
                onClick={() => setType(val)}
                className={
                  "rounded-xl px-3 py-1.5 font-semibold transition " +
                  (type === val
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50")
                }
              >
                {label}
              </button>
            ))}
            {(q || activeTag || type !== "all") && (
              <button
                onClick={clearAll}
                className="rounded-xl px-3 py-1.5 text-sm border border-zinc-300 bg-white hover:bg-zinc-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tag cloud */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Trending tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {tagCounts.length === 0 ? (
            <span className="text-sm text-zinc-500">
              {loading ? "Loading..." : "No tags yet"}
            </span>
          ) : (
            tagCounts.map(([t, c]) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold " +
                  (activeTag === t
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-300 hover:bg-zinc-50")
                }
              >
                #{t}{" "}
                <span className="ml-1 text-[10px] opacity-70">{c}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="text-center text-sm text-zinc-500 py-8">
            Loading results...
          </div>
        ) : (
          <>
            <ResultGroup
              title="Forum"
              items={groups.forum}
              emptyHint="Ask in the Q&A Forum"
              link="/forum"
            />
            <ResultGroup
              title="Lecture Notes"
              items={groups.notes}
              emptyHint="Upload your first notes"
              link="/notes"
            />
            <ResultGroup
              title="Resources"
              items={groups.resources}
              emptyHint="Add a resource"
              link="/resources"
            />
            <ResultGroup
              title="Study Rooms"
              items={groups.rooms}
              emptyHint="Start a study room"
              link="/rooms"
            />
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}

/* ------------------------ Result Group ------------------------ */
function ResultGroup({ title, items, emptyHint, link }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <Link
          to={link}
          className="text-sm font-semibold text-zinc-900 hover:underline"
        >
          Open {title.toLowerCase()} →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-4 py-8 text-center text-sm text-zinc-600">
          No results. {emptyHint}?
        </div>
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

/* ------------------------ Card ------------------------ */
function MiniCard({ item }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 capitalize">
            {item.kind}
          </span>
          {item.course && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5">
              {item.course}
            </span>
          )}
          {item.semester && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5">
              {item.semester}
            </span>
          )}
          <span className="ml-auto text-[11px]">
            {timeAgo(item.updatedAt)}
          </span>
        </div>
        <h4
          className="mt-2 truncate font-semibold text-zinc-900"
          title={item.title}
        >
          {item.title}
        </h4>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {item.tags.slice(0, 5).map((t) => (
            <Link
              key={t}
              to={`/search?tag=${encodeURIComponent(t)}`}
              className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs"
            >
              #{t}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Link
          to={item.url}
          className="rounded-xl border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
        >
          Open
        </Link>
      </div>
    </article>
  );
}

/* ------------------------ Utils ------------------------ */
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  const steps = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
  ];
  let n = diff,
    u = "s";
  for (const [k, t] of steps) {
    if (n < k) {
      u = t;
      break;
    }
    n = Math.floor(n / k);
    u = t;
  }
  return `${Math.max(1, Math.floor(n))}${u} ago`;
}
