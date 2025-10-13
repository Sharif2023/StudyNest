// Components/MyResourceUpload.jsx
import React, { useState } from "react";

/**
 * Scroll-safe modal for creating a resource (file → Cloudinary via backend, or external link).
 * Props:
 *  - apiUrl: string (endpoint to POST to, e.g. /ResourceLibrary.php)
 *  - onClose(): void
 *  - onCreated(message: string, points?: number): void
 */
export default function MyResourceUpload({
  apiUrl = "",
  onClose,
  onCreated,
}) {
  const [mode, setMode] = useState("file"); // 'file' | 'link'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [kind, setKind] = useState("other");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim() !== "" &&
    course.trim() !== "" &&
    semester.trim() !== "" &&
    (mode === "file" ? !!file : url.trim() !== "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !apiUrl) return;

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

      const r = await fetch(apiUrl, {
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
                canSubmit && !submitting ? "bg-cyan-600 hover:bg-cyan-700" : "bg-cyan-400 cursor-not-allowed"
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

/* local icon */
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
