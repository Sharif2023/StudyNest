import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
// Since we don't have access to the external files, we'll create the components here
// import LeftNav from "../Components/LeftNav";
// import Footer from "../Components/Footer";

/**
 * StudyNest — Shared Resource Library (Full)
 * ------------------------------------------------------------------
 * This is the updated frontend component that now interacts with a PHP API
 * for data persistence instead of local storage.
 * - All resource data is now stored and fetched from a MySQL database.
 * - Interactions (add, vote, bookmark, report) now send requests to the API.
 * - This version is a single file for compilation purposes.
 */

// Define the API endpoint URL. You MUST replace this with your server's URL.
const API_URL = 'http://localhost/studynest/study-nest/src/api/ResourceLibrary.php';


export default function App() {
  const [items, setItems] = useState([]);
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
  const COLLAPSED_W = 72;   // px
  const EXPANDED_W = 248;  // px
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
      if (data.status === 'success') {
        setItems(data.resources);
      } else {
        throw new Error(data.message || 'Failed to fetch resources.');
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
  const tags = useMemo(() => ["All", ...uniq(items.flatMap((x) => (x.tags || '').split(',').map(t => t.trim()))).filter(Boolean)], [items]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    let list = items.filter((it) => {
      const resourceTags = (it.tags || '').split(',').map(t => t.trim());
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

  // Function to handle creating a new resource by sending a POST request to the API.
  const onCreate = async (payload) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.status === 'success') {
        // Fetch the updated list of resources from the server.
        fetchResources();
        setOpen(false);
      } else {
        // Use a custom message box instead of alert()
        console.error("Failed to create resource: " + data.message);
      }
    } catch (e) {
      // Use a custom message box instead of alert()
      console.error("Error creating resource: " + e.message);
    }
  };

  // Function to handle updating a resource (vote, bookmark, flag)
  const updateResource = async (id, updates) => {
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...updates })
      });
      const data = await response.json();
      if (data.status === 'success') {
        // Optimistically update the local state to provide faster feedback.
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        );
      } else {
        // Use a custom message box instead of alert()
        console.error("Failed to update resource: " + data.message);
      }
    } catch (e) {
      // Use a custom message box instead of alert()
      console.error("Error updating resource: " + e.message);
    }
  };

  const vote = (id, delta) => {
    const item = items.find(x => x.id === id);
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
        body: form
      });
      const json = await res.json();

      if (json.status === "success") {
        setItems(prev =>
          prev.map(it =>
            it.id === id ? { ...it, bookmarked: json.action === "added" } : it
          )
        );
      } else {
        console.error("Bookmark error:", json.message);
      }
    } catch (err) {
      console.error("Bookmark request failed:", err);
    }
  };

  const flag = (id) => updateResource(id, { flagged: 1 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl" style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}>
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
          {/* Divider on larger screens */}
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
                  onPreview={() => setPreview({ url: it.url, name: it.name || it.title, mime: it.mime })}
                  onVote={vote}
                  onBookmark={toggleBookmark}
                  onFlag={flag}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && <CreateModal onClose={() => setOpen(false)} onCreate={onCreate} />}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      <Footer />
    </main>

  );
}

/* -------------------- Components -------------------- */
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M11 4h2v16h-2z" /><path fill="currentColor" d="M4 11h16v2H4z" /></svg>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={"h-6 w-11 rounded-full transition " + (value ? "bg-emerald-600" : "bg-zinc-300")}>
        <span className={"block h-5 w-5 rounded-full bg-white transition translate-y-0.5 " + (value ? "translate-x-6" : "translate-x-0.5")}></span>
      </button>
    </label>
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ResourceCard({ item, onPreview, onVote, onBookmark, onFlag }) {
  const isFile = item.src_type === "file";
  const isRecording = item.kind === "recording";
  const url = item.url || "";
  const isPdf = url.toLowerCase().endsWith(".pdf");
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = isRecording || url.match(/\.(mp4|webm|mov)$/i);

  return (
    <article className="group flex flex-col rounded-2xl bg-white shadow-md ring-1 ring-zinc-200 hover:shadow-lg transition">
      {/* ---------- File / Preview thumbnail ---------- */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-zinc-50 grid place-items-center">
        {isRecording ? (
          <div className="flex flex-col items-center text-zinc-400">
            <VideoIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">Recording</span>
          </div>
        ) : isFile && isImage ? (
          <img
            src={url}
            alt={item.title}
            className="h-full w-full object-contain rounded-t-2xl"
          />
        ) : isFile && isPdf ? (
          <iframe
            src={url}
            title={item.title}
            className="h-full w-full border-none"
          />
        ) : isFile ? (
          <div className="flex flex-col items-center text-zinc-400">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">File</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-zinc-400">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">External link</span>
          </div>
        )}

        {/* Hover overlay */}
        <button
          onClick={onPreview}
          className="absolute inset-0 hidden items-center justify-center bg-black/30 text-white backdrop-blur-sm transition group-hover:flex"
        >
          <span className="rounded-xl bg-white/20 px-3 py-1 text-sm font-semibold ring-1 ring-white/40">
            {isRecording ? "Play" : isFile ? "Preview" : "Open"}
          </span>
        </button>
      </div>

      {/* ---------- Info ---------- */}
      <div className="flex-1 p-4">
        {/* Title + file icon */}
        <div className="flex items-center gap-2">
          <span
            className="truncate text-lg font-semibold text-zinc-900"
            title={item.title}
          >
            {item.title}
          </span>
          {isFile && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-zinc-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M4 4a2 2 0 012-2h5.586A2 2 0 0113 2.586l3.414 3.414A2 2 0 0117 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
            {item.description}
          </p>
        )}

        {/* File link (for non-previewable types) */}
        {isFile && !isPdf && !isImage && (
          <div className="mt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3m0 9l-3-3m3 3l3-3"
                />
              </svg>
              View / Download File
            </a>
          </div>
        )}

        {/* External link */}
        {item.src_type === "link" && url && (
          <div className="mt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              🌐 Visit Link
            </a>
          </div>
        )}

        {/* Tags + info line */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">
            {item.kind}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">
            {item.course}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">
            {item.semester}
          </span>
          <span>•</span>
          <span>by {item.author}</span>
        </div>

        {/* Tags list */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(item.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (
              <span
                key={t}
                className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-200"
              >
                #{t}
              </span>
            ))}
        </div>
      </div>

      {/* ---------- Actions ---------- */}
      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVote(item.id, +1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold hover:bg-zinc-50"
          >
            ▲ {item.votes}
          </button>
          <button
            onClick={() => onVote(item.id, -1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold hover:bg-zinc-50"
          >
            ▼
          </button>
          <button
            onClick={() => onBookmark(item.id)}
            className={`rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold hover:bg-zinc-50 ${item.bookmarked ? "text-emerald-600" : ""
              }`}
          >
            {item.bookmarked ? "🔖 Saved" : "🔖 Save"}
          </button>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => onFlag(item.id)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold hover:bg-zinc-50"
          >
            Report
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={item.name}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-semibold hover:bg-zinc-50"
          >
            Download
          </a>
        </div>
      </div>
    </article>
  );
}

function VideoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" {...props}>
      <path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z" />
    </svg>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [useLink, setUseLink] = useState(false);
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("book");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const over = (e) => { prevent(e); el.classList.add("ring-emerald-500", "bg-emerald-50"); };
    const leave = (e) => { prevent(e); el.classList.remove("ring-emerald-500", "bg-emerald-50"); };
    const drop = (e) => { prevent(e); leave(e); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); };
    el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  }, []);

  const disabled = (useLink ? !link.trim() : !file) || !title.trim() || !course.trim() || !semester.trim();

  const submit = async () => {
    const form = new FormData();
    form.append("src_type", useLink ? "link" : "file");
    form.append("title", title.trim());
    form.append("kind", kind);
    form.append("course", course.trim());
    form.append("semester", semester.trim());
    form.append("tags", tags.trim());
    form.append("description", description.trim());
    form.append("author", anonymous ? "Anonymous" : "");
    if (useLink) {
      form.append("url", link.trim());
    } else if (file) {
      form.append("file", file);
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (json.status === "success") {
        alert("✅ Resource added successfully!");
        window.location.reload();
      } else {
        alert("❌ " + (json.message || "Upload failed"));
      }
    } catch (err) {
      alert("❌ " + err.message);
    }
  };


  return (
    <div className="fixed inset-0 z-40 bg-black/50 p-4" onClick={onClose}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Add resource</h2>
          <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* upload vs link */}
          <div className="md:col-span-2 flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="src" checked={!useLink} onChange={() => setUseLink(false)} /> Upload file
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="src" checked={useLink} onChange={() => setUseLink(true)} /> External link
            </label>
            <label className="ml-auto inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Post as Anonymous
            </label>
          </div>

          {!useLink ? (
            <div ref={dropRef} className="md:col-span-2 rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center ring-1 ring-transparent transition">
              {!file ? (
                <>
                  <FileIcon className="mx-auto h-10 w-10 text-zinc-400" />
                  <p className="mt-2 text-sm text-zinc-600">Drag & drop a PDF/image/Doc, or</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                    Choose file
                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                  <div className="truncate text-sm">
                    <span className="font-semibold">{file.name}</span>
                    <span className="mx-1 text-zinc-400">•</span>
                    <span className="text-zinc-600">{file.type || "file"}</span>
                  </div>
                  <button onClick={() => setFile(null)} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Remove</button>
                </div>
              )}
            </div>
          ) : (
            <div className="md:col-span-2">
              <Label>Link URL</Label>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com/awesome-notes" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          )}

          <div>
            <Label>Title</Label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., CSE220 DP Patterns Guide" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <Label>Type</Label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="book">book</option>
              <option value="slide">slide</option>
              <option value="past paper">past paper</option>
              <option value="study guide">study guide</option>
              <option value="other">other</option>
            </select>
          </div>
          <div>
            <Label>Course</Label>
            <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g., CSE220" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <Label>Semester</Label>
            <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g., Fall 2025" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <Label>Tags</Label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma separated: dp, graphs, quiz" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell everyone what this resource covers and why it’s useful…" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">Cancel</button>
          <button disabled={disabled} onClick={submit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Create</button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose }) {
  const isPdf = file.mime?.includes("pdf");
  const isImage = file.mime?.startsWith("image/");
  return (
    <div className="fixed inset-0 z-40 bg-black/70 p-4" onClick={onClose}>
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 truncate">{file.name}</h3>
          <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          {isImage ? (
            <img src={file.url} alt={file.name} className="max-h-[70vh] w-full object-contain" />
          ) : isPdf ? (
            <iframe title="preview" src={file.url} className="h-[70vh] w-full rounded-lg ring-1 ring-zinc-200" />
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600">
              Preview not supported. Use download instead.
              <a href={file.url} download className="mt-3 inline-flex rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-800">Download</a>
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
        <button onClick={onNew} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Add resource</button>
      </div>
    </div>
  );
}

function Label({ children }) { return <label className="text-xs font-semibold text-zinc-600">{children}</label>; }

/* -------------------- Icons -------------------- */
function SearchIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" /></svg>); }
function XIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); }
function FileIcon(props) { return (<svg viewBox="0 0 24 24" className="h-10 w-10" {...props}><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z" /></svg>); }

/* -------------------- Utils -------------------- */
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

