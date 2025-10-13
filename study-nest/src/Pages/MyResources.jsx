// Pages/MyResources.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/**
 * StudyNest — My Resources (Personal Library)
 * - Shows ONLY the signed-in user's content
 * - Data source: profile.php?content=1 (notes, resources, recordings, etc.)
 * - Includes search, filters, preview, delete (rec + resource), and Share→Shared feed
 * - Upload modal (file → backend → Cloudinary, or external link)
 * - Shell: LeftNav + Header + Footer
 */

const API_ROOT = "http://localhost/StudyNest/study-nest/src/api";
const API_BASE = API_ROOT;
const RES_LIBRARY_API = `${API_ROOT}/ResourceLibrary.php`;

/* ----------------- Helpers for Cloudinary URLs & file types ----------------- */
function isPdfLike(url = "", mime = "") {
  if (!url && !mime) return false;
  if (mime?.toLowerCase().includes("pdf")) return true;
  // allow querystrings/fragments
  return /\.pdf($|[?#])/i.test(url);
}

function isImageUrl(url = "", mime = "") {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp)(?:$|[?#])/i.test(url || "");
}

function isCloudinary(url = "") {
  return /(^https?:)?\/\/res\.cloudinary\.com\//i.test(url || "");
}

/** Force “download” (content-disposition attachment) and keep filename if present */
function cloudinaryDownload(url = "") {
  if (!isCloudinary(url)) return url;
  return url.replace(/\/upload\/(?!fl_)/, "/upload/fl_attachment/");
}

export default function MyResources() {
  // LeftNav shell
  const [navOpen, setNavOpen] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const SIDEBAR_WIDTH_COLLAPSED = 72;
  const SIDEBAR_WIDTH_EXPANDED = 248;
  const sidebarWidth = navOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  // Page state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [content, setContent] = useState({ resources: [], recordings: [] });

  // UI state
  const [tab, setTab] = useState("resources"); // 'resources' | 'recordings'
  const location = useLocation();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [course, setCourse] = useState("All");
  const [semester, setSemester] = useState("All");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState("New");
  const [preview, setPreview] = useState(null); // { url, name, mime? }

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);

  // Open correct tab via URL params: ?tab=recordings or legacy ?kind=recording
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const kind = params.get("kind");
    if (tabParam === "recordings" || kind === "recording") setTab("recordings");
    else if (tabParam === "resources") setTab("resources");
  }, [location.search]);

  // Current user (for ownership checks). Try id + name.
  const auth = JSON.parse(localStorage.getItem("studynest.auth") || "null") || {};
  const profile = JSON.parse(localStorage.getItem("studynest.profile") || "null") || {};
  const currentUser = profile?.name || auth?.name || "Unknown";
  const currentUserId = Number(auth?.id || 0);

  const fetchMine = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/profile.php?content=1`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j?.ok || !j?.content) throw new Error("Invalid content response");
      setContent({
        resources: Array.isArray(j.content.resources) ? j.content.resources : [],
        recordings: Array.isArray(j.content.recordings) ? j.content.recordings : [],
      });
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  // Options for filters based on visible tab
  const rawItems = tab === "resources" ? content.resources : content.recordings;

  const types = useMemo(() => {
    if (tab !== "resources") return ["All"];
    return ["All", ...uniq(rawItems.map((x) => x.kind))];
  }, [rawItems, tab]);

  const courses = useMemo(() => ["All", ...uniq(rawItems.map((x) => x.course))], [rawItems]);
  const semesters = useMemo(() => ["All", ...uniq(rawItems.map((x) => x.semester))], [rawItems]);
  const tags = useMemo(
    () => [
      "All",
      ...uniq(rawItems.flatMap((x) => (x.tags || "").split(",").map((t) => t.trim()))).filter(Boolean),
    ],
    [rawItems]
  );

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    let list = rawItems.filter((it) => {
      const resourceTags = (it.tags || "").split(",").map((t) => t.trim());
      const passT = type === "All" || it.kind === type;
      const passC = course === "All" || it.course === course;
      const passS = semester === "All" || it.semester === semester;
      const passG = tag === "All" || resourceTags.includes(tag);
      const passQ =
        !query ||
        (it.title || "").toLowerCase().includes(query) ||
        (it.description || "").toLowerCase().includes(query) ||
        resourceTags.some((t) => t.toLowerCase().includes(query));
      return passT && passC && passS && passG && passQ;
    });

    if (sort === "New")
      list.sort(
        (a, b) => +new Date(b.created_at || b.updated_at) - +new Date(a.created_at || a.updated_at)
      );
    if (sort === "Top") list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    if (sort === "A-Z")
      list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return list;
  }, [rawItems, q, type, course, semester, tag, sort]);

  // Actions
  const deleteRecording = async (id) => {
    if (!window.confirm("Delete this recording? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_ROOT}/recordings.php?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json();
      if (j?.status === "success") {
        await fetchMine();
        alert("✅ Recording deleted");
      } else {
        alert("❌ " + (j?.message || "Failed to delete"));
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  // delete a personal resource (non-recording)
  const deleteResource = async (id) => {
    if (!window.confirm("Delete this resource? This cannot be undone.")) return;
    try {
      const form = new FormData();
      form.append("action", "delete_resource");
      form.append("resource_id", id);
      const r = await fetch(RES_LIBRARY_API, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await r.json();
      if (j?.status === "success") {
        await fetchMine();
        alert("✅ Resource deleted");
      } else {
        alert("❌ " + (j?.message || "Failed to delete resource"));
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  const shareRecording = async (id) => {
    try {
      const form = new FormData();
      form.append("action", "share_recording");
      form.append("recording_id", id);
      const r = await fetch(RES_LIBRARY_API, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await r.json();
      if (j?.status === "success") {
        if (j.points_awarded) bumpLocalPoints(j.points_awarded);
        alert("✅ " + (j.message || "Shared to Shared Resources"));
      } else {
        alert("❌ " + (j?.message || "Share failed"));
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  // Share a personal (non-recording) resource to the Shared feed
  const shareResource = async (id) => {
    try {
      const form = new FormData();
      form.append("action", "share_resource");
      form.append("resource_id", id);
      const r = await fetch(RES_LIBRARY_API, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await r.json();
      if (j?.status === "success") {
        if (j.points_awarded) bumpLocalPoints(j.points_awarded);
        await fetchMine();
        alert("✅ " + (j.message || "Shared to Shared Resources"));
      } else {
        alert("❌ " + (j?.message || "Share failed"));
      }
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  function bumpLocalPoints(pts) {
    const auth = JSON.parse(localStorage.getItem("studynest.auth") || "{}");
    if (auth?.id) {
      const updated = { ...auth, points: (auth.points || 0) + pts };
      localStorage.setItem("studynest.auth", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("studynest:points-updated", { detail: { points: updated.points } }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-200 to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-all duration-500">
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />

      <Header navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={sidebarWidth} />

      <main
        className="pt-6 pb-10"
        style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}
      >
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Title / tabs */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/70 ring-1 ring-zinc-200 dark:ring-slate-800 shadow-md backdrop-blur-lg p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Resources</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Your personal uploads and room recordings. Share recordings or files to the Shared
                  feed when you’re ready.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUploadOpen(true)}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                  title="Upload a file or save a link"
                >
                  + Upload
                </button>
                <Link
                  to="/resources"
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:text-cyan-700 hover:border-cyan-500 hover:bg-cyan-50 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100 dark:hover:text-cyan-400 dark:hover:bg-slate-800"
                  title="Browse Shared resources"
                >
                  Shared Resources →
                </Link>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-slate-800/70">
              {[
                ["resources", "My Uploads"],
                ["recordings", "My Recordings"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTab(val)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    tab === val
                      ? "bg-white dark:bg-slate-900 text-zinc-900 dark:text-zinc-100 shadow"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/70 ring-1 ring-zinc-200 dark:ring-slate-800 shadow-md backdrop-blur-lg p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
              <div className="relative w-full md:max-w-md">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, description, or #tag"
                  className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
                />
              </div>

              {tab === "resources" && <Select label="Type" value={type} onChange={setType} options={types} />}
              <Select label="Course" value={course} onChange={setCourse} options={courses} />
              <Select label="Semester" value={semester} onChange={setSemester} options={semesters} />
              <Select label="Tag" value={tag} onChange={setTag} options={tags} />
              <Select label="Sort" value={sort} onChange={setSort} options={["New", "Top", "A-Z"]} />
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[40vh]">
            {loading ? (
              <div className="rounded-2xl bg-white p-6 text-center text-zinc-500 dark:bg-slate-900 dark:text-zinc-400">
                Loading your items…
              </div>
            ) : err ? (
              <div className="rounded-2xl bg-white p-6 text-center text-red-600 dark:bg-slate-900">
                Error: {err}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((it) => (
                  <li key={it.id}>
                    <Card
                      item={it}
                      tab={tab}
                      onPreview={() =>
                        setPreview({
                          url: it.url,
                          name: it.name || it.title,
                          mime: it.mime,
                        })
                      }
                      onDeleteRecording={deleteRecording}
                      onDeleteResource={deleteResource}
                      onShareRecording={shareRecording}
                      onShareResource={shareResource}
                      currentUser={currentUser}
                      currentUserId={currentUserId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <Footer sidebarWidth={sidebarWidth} />

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onCreated={async (message, points) => {
            if (points) bumpLocalPoints(points);
            await fetchMine();
            alert(message || "✅ Resource created");
          }}
        />
      )}
    </div>
  );
}

/* ----------------- Upload Modal (scroll-safe) ----------------- */
function UploadModal({ onClose, onCreated }) {
  const [mode, setMode] = useState("file"); // 'file' | 'link'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [kind, setKind] = useState("other");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private"); // default private → appears under My Resources
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim() !== "" &&
    course.trim() !== "" &&
    semester.trim() !== "" &&
    (mode === "file" ? !!file : url.trim() !== "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("course", course.trim());
      form.append("semester", semester.trim());
      form.append("kind", kind);
      form.append("tags", tags);
      form.append("description", description);
      form.append("visibility", visibility);
      form.append("src_type", mode);

      if (mode === "file") {
        form.append("file", file);
      } else {
        form.append("url", url.trim());
      }

      const r = await fetch(RES_LIBRARY_API, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const j = await r.json();

      if (j?.status === "success") {
        onClose?.();
        onCreated?.(j.message, j.points_awarded || 0);
      } else {
        alert("❌ " + (j?.message || "Failed to create resource"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ " + (err.message || "Upload failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header to keep close button visible */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add a Resource</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* File vs Link toggle */}
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-slate-800">
            {[
              ["file", "File upload"],
              ["link", "External link"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setMode(val)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                  mode === val ? "bg-white dark:bg-slate-900 shadow" : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-cyan-700"
              />
              <p className="text-xs text-zinc-500">
                Images, videos, PDFs, docs, slides, spreadsheets, zips, etc. will be stored on Cloudinary.
              </p>
            </div>
          ) : (
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/resource"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
              />
            </div>
          )}

          <div className="grid gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
              placeholder="e.g., Week 3 Slides"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Course *</label>
              <input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
                placeholder="e.g., CS101"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Semester *</label>
              <input
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
                placeholder="e.g., Fall 2025"
                required
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
              >
                {["other", "book", "slide", "past paper", "study guide", "recording"].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
              placeholder="Comma-separated, e.g., algebra,midterm"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
              placeholder="Optional notes for your future self (or others if public)"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Visibility</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                />
                <span>Private (My Resources)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                <span>Public (Shared Resources)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                canSubmit && !submitting
                  ? "bg-cyan-600 hover:bg-cyan-700"
                  : "bg-cyan-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Uploading…" : mode === "file" ? "Upload" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------- UI Bits ----------------- */
function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100"
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

function Card({
  item,
  tab,
  onPreview,
  onDeleteRecording,
  onDeleteResource,
  onShareRecording,
  onShareResource,
  currentUser,
  currentUserId,
}) {
  const isRecording = tab === "recordings";
  const url = item.url || "";
  const pdf = isPdfLike(url, item.mime);
  const image = isImageUrl(url, item.mime);

  // Consider both name + id for ownership
  const isOwnerByName = item.author === currentUser || item.owner === currentUser;
  const isOwnerById = Number(item.user_id || 0) === Number(currentUserId || -1);
  const isOwner = isOwnerById || isOwnerByName;

  const isSharedFlag = item.shared === true || item.visibility === "public";

  return (
    <article className="group flex flex-col rounded-2xl bg-white shadow-md ring-1 ring-zinc-200 hover:shadow-lg transition dark:bg-slate-900 dark:ring-slate-800">
      {/* Thumb */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-zinc-50 dark:bg-slate-800 grid place-items-center">
        {isRecording ? (
          <div className="flex flex-col items-center text-zinc-400">
            <VideoIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">Recording</span>
          </div>
        ) : image ? (
          <img src={url} alt={item.title} className="h-full w-full object-contain rounded-t-2xl" />
        ) : pdf ? (
          // Avoid embedding PDF in tiny card (causes "load error" on some browsers)
          <div className="flex flex-col items-center text-zinc-400">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">PDF</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-zinc-400">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs font-medium">{item.src_type === "link" ? "Link" : "File"}</span>
          </div>
        )}

        <button
          onClick={onPreview}
          className="absolute inset-0 hidden items-center justify-center bg-black/30 text-white backdrop-blur-sm transition group-hover:flex"
        >
          <span className="rounded-xl bg-white/20 px-3 py-1 text-sm font-semibold ring-1 ring-white/40">
            {isRecording ? "Play" : image || pdf ? "Preview" : "Open"}
          </span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2">
          <span
            className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            title={item.title}
          >
            {item.title || "(Untitled)"}
          </span>
          {isSharedFlag && (
            <span className="rounded-md bg-emerald-50 text-emerald-700 text-[11px] px-1.5 py-0.5 border border-emerald-200">
              Shared
            </span>
          )}
          {item.src_type === "file" && (
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

        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {item.description}
          </p>
        )}

        {/* direct open for non-previewables */}
        {item.src_type === "file" && !image && !pdf && (
          <div className="mt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              View / Download
            </a>
          </div>
        )}

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

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          {item.kind && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-slate-800">{item.kind}</span>
          )}
          {item.course && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-slate-800">{item.course}</span>
          )}
          {item.semester && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-slate-800">
              {item.semester}
            </span>
          )}
          {(item.course || item.semester) && <span>•</span>}
          <span>by {item.author || "You"}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {(item.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (
              <span
                key={t}
                className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                #{t}
              </span>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-slate-800 px-4 py-3 text-xs">
        <div className="text-zinc-500 dark:text-zinc-400">{safeDate(item.created_at || item.updated_at)}</div>
        <div className="flex items-center gap-2">
          {isRecording && isOwner && (
            <>
              <button
                onClick={() => onShareRecording(item.id)}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="Share to Shared Resources"
              >
                Share
              </button>
              <button
                onClick={() => onDeleteRecording(item.id)}
                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100 transition-colors"
                title="Delete recording"
              >
                Delete
              </button>
            </>
          )}

          {!isRecording && isOwner && onShareResource && (
            <button
              onClick={() => onShareResource(item.id)}
              disabled={isSharedFlag === true}
              className={`rounded-md border px-2 py-1 font-medium transition-colors ${
                isSharedFlag
                  ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
              title={isSharedFlag ? "Already shared" : "Share to Shared Resources"}
            >
              {isSharedFlag ? "Shared" : "Share"}
            </button>
          )}

          {!isRecording && isOwner && onDeleteResource && (
            <button
              onClick={() => onDeleteResource(item.id)}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100 transition-colors"
              title="Delete resource"
            >
              Delete
            </button>
          )}

          {!isRecording && url && (
            <a
              href={isPdfLike(url, item.mime) ? cloudinaryDownload(url) : url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-700 hover:bg-zinc-50 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-200 dark:hover:bg-slate-800"
            >
              Download
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ tab }) {
  const label = tab === "resources" ? "No uploads yet" : "No recordings yet";
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 dark:bg-slate-900/60 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-700">📦</div>
        <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{label}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {tab === "resources"
            ? "Upload resources with the button above."
            : "Your room recordings will appear here after sessions end."}
        </p>
        {tab === "resources" && (
          <Link
            to="/resources"
            className="mt-4 inline-flex rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Browse Shared Resources
          </Link>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose }) {
  const pdf = isPdfLike(file.url, file.mime);
  const image = isImageUrl(file.url, file.mime);

  // For inline preview: use the original secure_url. Do NOT add fl_inline (invalid flag).
  const previewUrl = file.url;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 p-4" onClick={onClose}>
      <div
        className="mx-auto max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{file.name}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3">
          {image ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-[78vh] w-full object-contain rounded-lg ring-1 ring-zinc-200 dark:ring-slate-800"
            />
          ) : pdf ? (
            <object
              data={previewUrl + "#toolbar=1"}
              type="application/pdf"
              className="h-[78vh] w-full rounded-lg ring-1 ring-zinc-200 dark:ring-slate-800"
            >
              <div className="grid place-items-center h-[78vh] text-sm text-zinc-600 dark:text-zinc-300">
                Unable to preview this PDF here.
                <div className="mt-3 space-x-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Open in new tab
                  </a>
                  <a
                    href={cloudinaryDownload(file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 dark:bg-slate-900 dark:border-slate-700 dark:text-zinc-100 dark:hover:bg-slate-800"
                  >
                    Download
                  </a>
                </div>
              </div>
            </object>
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-zinc-300 dark:border-slate-700 p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Preview not supported. Use download instead.
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white hover:bg-zinc-800 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Open / Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Icons & utils ---------- */
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
function safeDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
}
function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}
