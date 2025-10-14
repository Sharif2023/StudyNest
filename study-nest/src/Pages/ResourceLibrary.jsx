// Pages/ResourceLibrary.jsx  (or wherever this main page lives)
import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import SharedResourceUpload from "../Components/SharedResourceUpload"; // <-- NEW import

/**
 * StudyNest — Shared Resource Library (Full)
 */

const API_URL = "http://localhost/StudyNest/study-nest/src/api/ResourceLibrary.php";

export default function App() {
  const [items, setItems] = useState([]);
  const auth = JSON.parse(localStorage.getItem("studynest.auth") || "null") || {};
  const currentUserId = Number(auth?.id || 0);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [course, setCourse] = useState("All");
  const [semester, setSemester] = useState("All");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState("New");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null); // {url, name, mime}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //leftBar
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // Match LeftNav’s expected widths
  const COLLAPSED_W = 72; // px
  const EXPANDED_W = 248; // px
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  // Function to fetch data from the API.
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status === "success") {
        setItems(data.resources);
      } else {
        throw new Error(data.message || "Failed to fetch resources.");
      }
    } catch (e) {
      setError(e.message);
      console.error("Error fetching resources:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial component mount.
  useEffect(() => {
    fetchResources();
  }, []);

  const types = useMemo(() => ["All", ...uniq(items.map((x) => x.kind))], [items]);
  const courses = useMemo(() => ["All", ...uniq(items.map((x) => x.course))], [items]);
  const semesters = useMemo(() => ["All", ...uniq(items.map((x) => x.semester))], [items]);
  const tags = useMemo(
    () =>
      [
        "All",
        ...uniq(items.flatMap((x) => (x.tags || "").split(",").map((t) => t.trim()))).filter(Boolean),
      ],
    [items]
  );

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    let list = items.filter((it) => {
      const resourceTags = (it.tags || "").split(",").map((t) => t.trim());
      const passT = type === "All" || it.kind === type;
      const passC = course === "All" || it.course === course;
      const passS = semester === "All" || it.semester === semester;
      const passG = tag === "All" || resourceTags.includes(tag);
      const passQ =
        !query ||
        it.title.toLowerCase().includes(query) ||
        it.description.toLowerCase().includes(query) ||
        resourceTags.some((t) => t.toLowerCase().includes(query));
      return passT && passC && passS && passG && passQ;
    });
    if (sort === "New") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "Top") list.sort((a, b) => b.votes - a.votes);
    if (sort === "A-Z") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [items, q, type, course, semester, tag, sort]);

  // Function to handle updating a resource (vote, bookmark, flag)
  const updateResource = async (id, updates) => {
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setItems((prevItems) =>
          prevItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
      } else {
        console.error("Failed to update resource: " + data.message);
      }
    } catch (e) {
      console.error("Error updating resource: " + e.message);
    }
  };

  const vote = (id, delta) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    updateResource(id, { votes: Math.max(0, item.votes + delta) });
  };

  const toggleBookmark = async (id) => {
    try {
      const form = new FormData();
      form.append("action", "toggle_bookmark");
      form.append("resource_id", id);

      const res = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();

      if (json.status === "success") {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, bookmarked: json.action === "added" } : it))
        );
      } else {
        console.error("Bookmark error:", json.message);
      }
    } catch (err) {
      console.error("Bookmark request failed:", err);
    }
  };

  const flag = (id) => updateResource(id, { flagged: 1 });

  // Delete recording function
  const deleteRecording = async (id) => {
    if (!confirm("Are you sure you want to delete this recording? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost/StudyNest/study-nest/src/api/recordings.php?id=${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        setItems((prevItems) => prevItems.filter((item) => item.id !== id));
        alert("Recording deleted successfully!");
      } else {
        alert("Failed to delete recording: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      alert("Failed to delete recording. Please try again.");
    }
  };

  // Delete a shared (public) resource — ownership enforced server-side
  const deleteSharedResource = async (id) => {
    if (!window.confirm("Delete this resource? This cannot be undone.")) return;
    try {
      const form = new FormData();
      form.append("action", "delete_resource");
      form.append("resource_id", id);
      const r = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await r.json();
      if (j?.status === "success") {
        await fetchResources();
        alert("✅ Resource deleted");
      } else {
        alert("❌ " + (j?.message || "Failed to delete resource"));
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  // points helper (used when modal returns points_awarded)
  const bumpLocalPoints = (pts) => {
    if (!pts) return;
    const auth = JSON.parse(localStorage.getItem("studynest.auth") || "{}");
    if (auth?.id) {
      const updated = { ...auth, points: (auth.points || 0) + pts };
      localStorage.setItem("studynest.auth", JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("studynest:points-updated", { detail: { points: updated.points } })
      );
    }
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

      {/* Header */}
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      {/* Filters */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
          <div className="relative w-full md:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, description, or #tag"
              className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Select label="Type" value={type} onChange={setType} options={types} />
          <Select label="Course" value={course} onChange={setCourse} options={courses} />
          <Select label="Semester" value={semester} onChange={setSemester} options={semesters} />
          <Select label="Tag" value={tag} onChange={setTag} options={tags} />
          <Select label="Sort" value={sort} onChange={setSort} options={["New", "Top", "A-Z"]} />
          <span className="hidden md:block h-6 w-px bg-zinc-300/70 mx-1" />

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" /> Add Resource
          </button>
        </div>
      </section>

      {/* List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {loading && <div className="text-center text-zinc-500">Loading resources...</div>}
        {error && <div className="text-center text-red-500">Error: {error}</div>}
        {!loading && !error && filtered.length === 0 ? (
          <EmptyState onNew={() => setOpen(true)} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <li key={it.id}>
                <ResourceCard
                  item={it}
                  onPreview={() =>
                    setPreview({ url: it.url, name: it.name || it.title, mime: it.mime })
                  }
                  onVote={vote}
                  onBookmark={toggleBookmark}
                  onFlag={flag}
                  onDelete={deleteRecording}
                  onDeleteResource={deleteSharedResource}
                  currentUserId={currentUserId}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* NEW modal usage */}
      {open && (
        <SharedResourceUpload
          apiUrl={API_URL}
          onClose={() => setOpen(false)}
          onCreated={async (message, points) => {
            bumpLocalPoints(points);
            await fetchResources();
            alert(message || "✅ Resource created");
            setOpen(false);
          }}
        />
      )}

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      <Footer />
    </main>
  );
}

/* -------------------- Components -------------------- */
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path fill="currentColor" d="M11 4h2v16h-2z" />
      <path fill="currentColor" d="M4 11h16v2H4z" />
    </svg>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResourceCard({
  item,
  onPreview,
  onVote,
  onBookmark,
  onFlag,
  onDelete,
  onDeleteResource,
  currentUserId,
}) {
  const isFile = item.src_type === "file";
  const isRecording = item.kind === "recording";
  const url = item.url || "";
  const isPdf = url.toLowerCase().endsWith(".pdf");
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  const currentUser =
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.name ||
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.name ||
    "Unknown";

  const isOwnerById = Number(item.user_id || 0) === Number(currentUserId || -1);
  const isOwnerByName = item.author === currentUser;
  const isOwner = isOwnerById || isOwnerByName;

  // Color coding for different resource types
  const getTypeColor = (type) => {
    const colors = {
      recording: "bg-purple-100 text-purple-800 border-purple-200",
      document: "bg-blue-100 text-blue-800 border-blue-200",
      link: "bg-amber-100 text-amber-800 border-amber-200",
      file: "bg-emerald-100 text-emerald-800 border-emerald-200",
      default: "bg-zinc-100 text-zinc-800 border-zinc-200"
    };
    return colors[type?.toLowerCase()] || colors.default;
  };

  return (
    <article className="group flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 hover:shadow-lg hover:ring-zinc-300 transition-all duration-300 overflow-hidden">
      {/* Preview area with improved styling */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-slate-50 to-zinc-100 grid place-items-center">
        {isRecording ? (
          <div className="flex flex-col items-center text-purple-500">
            <div className="relative">
              <VideoIcon className="h-12 w-12" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <span className="mt-2 text-sm font-medium text-zinc-700">Recording</span>
          </div>
        ) : isFile && isImage ? (
          <img
            src={url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : isFile && isPdf ? (
          <div className="flex flex-col items-center text-red-500">
            <FileIcon className="h-12 w-12" />
            <span className="mt-2 text-sm font-medium text-zinc-700">PDF Document</span>
          </div>
        ) : isFile ? (
          <div className="flex flex-col items-center text-emerald-500">
            <FileIcon className="h-12 w-12" />
            <span className="mt-2 text-sm font-medium text-zinc-700">File</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-amber-500">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="mt-2 text-sm font-medium text-zinc-700">External Link</span>
          </div>
        )}

        {/* Preview overlay */}
        <button
          onClick={onPreview}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 text-white backdrop-blur-0 group-hover:backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100"
        >
          <span className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold ring-1 ring-white/40 backdrop-blur">
            {isRecording ? "🎬 Play" : isFile ? "👁️ Preview" : "🔗 Open"}
          </span>
        </button>

        {/* Type badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(item.kind)}`}>
          {item.kind}
        </div>

        {/* Bookmark indicator */}
        {item.bookmarked && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 p-5">
        {/* Title with improved typography */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-zinc-900 leading-tight line-clamp-2 flex-1" title={item.title}>
            {item.title}
          </h3>
          {isFile && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 012-2h5.586A2 2 0 0113 2.586l3.414 3.414A2 2 0 0117 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3 mb-4">
            {item.description}
          </p>
        )}

        {/* Action links */}
        {isFile && !isPdf && !isImage && (
          <div className="mb-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3m0 9l-3-3m3 3l3-3" />
              </svg>
              Download File
            </a>
          </div>
        )}

        {item.src_type === "link" && url && (
          <div className="mb-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visit Link
            </a>
          </div>
        )}

        {/* Metadata chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            </svg>
            {item.course}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {item.semester}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {item.author}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {(item.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 text-xs font-medium border border-cyan-200 hover:border-cyan-300 transition-colors"
              >
                #{t}
              </span>
            ))}
        </div>
      </div>

      {/* Enhanced actions footer */}
      <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4 bg-zinc-50/50">
        <div className="flex items-center gap-1">
          {/* Vote buttons */}
          <button
            onClick={() => onVote(item.id, +1)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="min-w-[1.5rem] text-center">{item.votes}</span>
          </button>
          <button
            onClick={() => onVote(item.id, -1)}
            className="rounded-lg border border-zinc-300 bg-white p-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
          >
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Bookmark button */}
          <button
            onClick={() => onBookmark(item.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${item.bookmarked
                ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400"
              }`}
          >
            <svg className={`w-4 h-4 ${item.bookmarked ? "text-amber-500" : "text-zinc-500"}`} fill={item.bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {item.bookmarked ? "Saved" : "Save"}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Owner actions */}
          {isRecording && isOwner && onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5"
              title="Delete recording"
            >
              <TrashIcon />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          {!isRecording && isOwner && onDeleteResource && (
            <button
              onClick={() => onDeleteResource(item.id)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {/* Delete */}
            </button>
          )}

          {/* Standard actions */}
          <button
            onClick={() => onFlag(item.id)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            {/* Report */}
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={item.name}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3m0 9l-3-3m3 3l3-3" />
            </svg>
            {/* Download */}
          </a>
        </div>
      </div>
    </article>
  );
}

function PreviewModal({ file, onClose }) {
  const isPdf = file.mime?.includes("pdf");
  const isImage = file.mime?.startsWith("image/");
  return (
    <div className="fixed inset-0 z-40 bg-black/70 p-3 sm:p-4" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
          <h3 className="text-sm font-semibold text-zinc-900 truncate">{file.name}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isImage ? (
            <img src={file.url} alt={file.name} className="max-h-[78vh] w-full object-contain" />
          ) : isPdf ? (
            <iframe title="preview" src={file.url} className="h-[78vh] w-full rounded-lg ring-1 ring-zinc-200" />
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600">
              Preview not supported. Use download instead.
              <a
                href={file.url}
                download
                className="mt-3 inline-flex rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-800"
              >
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">📚</div>
        <h3 className="mt-4 text-lg font-semibold">No resources yet</h3>
        <p className="mt-1 text-sm text-zinc-600">Upload or add a link to get started.</p>
        <button
          onClick={onNew}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add resource
        </button>
      </div>
    </div>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z"
      />
    </svg>
  );
}
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z"
      />
    </svg>
  );
}
function FileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" {...props}>
      <path
        fill="currentColor"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z"
      />
    </svg>
  );
}
function VideoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" {...props}>
      <path
        fill="currentColor"
        d="M17 10.5V7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z"
      />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" aria-labelledby="trashTitle" role="img">
      <title id="trashTitle">Delete</title>
      <rect x="3.5" y="3.5" width="17" height="2" rx="1" fill="#E53E3E" />
      <path d="M6 7.5h12l-1 12.5a2 2 0 0 1-2 1.9H9a2 2 0 0 1-2-1.9L6 7.5z" fill="#E53E3E" />
      <rect x="9" y="1.5" width="6" height="2" rx="1" fill="#C53030" />
      <g stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.85">
        <line x1="9.5" y1="10.5" x2="9.5" y2="16" />
        <line x1="12" y1="10.5" x2="12" y2="16" />
        <line x1="14.5" y1="10.5" x2="14.5" y2="16" />
      </g>
    </svg>
  );
}

/* -------------------- Utils -------------------- */
function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}
