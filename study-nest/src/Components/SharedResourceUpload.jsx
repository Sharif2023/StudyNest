// Components/SharedResourceUpload.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * SharedResourceUpload (modal)
 * - Viewport-safe modal with sticky header, scrollable body
 * - Creates a PUBLIC resource in the Shared Library
 * - Supports: file upload (Cloudinary via backend) or external link
 *
 * Props:
 *  - apiUrl: string (POST endpoint, e.g., /ResourceLibrary.php)
 *  - onClose(): void
 *  - onCreated(message: string, points?: number): void
 */
export default function SharedResourceUpload({
  apiUrl = "",
  onClose,
  onCreated,
}) {
  const [useLink, setUseLink] = useState(false); // false=file, true=link
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("book");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dropRef = useRef(null);

  // Drag & drop styling
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const over = (e) => {
      prevent(e);
      el.classList.add("ring-emerald-500", "bg-emerald-50");
    };
    const leave = (e) => {
      prevent(e);
      el.classList.remove("ring-emerald-500", "bg-emerald-50");
    };
    const drop = (e) => {
      prevent(e);
      leave(e);
      const f = e.dataTransfer.files?.[0];
      if (f) setFile(f);
    };
    el.addEventListener("dragover", over);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop);
    };
  }, []);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const canSubmit =
    (useLink ? !!link.trim() : !!file) &&
    !!title.trim() &&
    !!course.trim() &&
    !!semester.trim() &&
    !!apiUrl;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("src_type", useLink ? "link" : "file");
      form.append("title", title.trim());
      form.append("kind", kind);
      form.append("course", course.trim());
      form.append("semester", semester.trim());
      form.append("tags", tags.trim());
      form.append("description", description.trim());
      form.append("author", anonymous ? "Anonymous" : "");
      // crucial: create directly in Shared (public) library
      form.append("visibility", "public");

      if (useLink) {
        form.append("url", link.trim());
      } else if (file) {
        form.append("file", file);
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();

      if (json?.status === "success") {
        onClose?.();
        onCreated?.(json.message || "Resource created", json.points_awarded || 0);
      } else {
        alert("❌ " + (json?.message || "Upload failed"));
      }
    } catch (err) {
      alert("❌ " + (err?.message || "Upload failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-4" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
          <h2 className="text-lg font-semibold text-zinc-900">Add resource</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <div className="grid gap-4 md:grid-cols-2">
            {/* upload vs link */}
            <div className="md:col-span-2 flex items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="src"
                  checked={!useLink}
                  onChange={() => setUseLink(false)}
                />{" "}
                Upload file
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="src"
                  checked={useLink}
                  onChange={() => setUseLink(true)}
                />{" "}
                External link
              </label>
              <label className="ml-auto inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />{" "}
                Post as Anonymous
              </label>
            </div>

            {!useLink ? (
              <div
                ref={dropRef}
                className="md:col-span-2 rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center ring-1 ring-transparent transition"
              >
                {!file ? (
                  <>
                    <FileIcon className="mx-auto h-10 w-10 text-zinc-400" />
                    <p className="mt-2 text-sm text-zinc-600">
                      Drag & drop a PDF/image/Doc, or
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                      Choose file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          setFile(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                    <div className="truncate text-sm">
                      <span className="font-semibold">{file.name}</span>
                      <span className="mx-1 text-zinc-400">•</span>
                      <span className="text-zinc-600">
                        {file.type || "file"}
                      </span>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="md:col-span-2">
                <Label>Link URL</Label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com/awesome-notes"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <Label>Title</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., CSE220 DP Patterns Guide"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="book">book</option>
                <option value="slide">slide</option>
                <option value="past paper">past paper</option>
                <option value="study guide">study guide</option>
                <option value="other">other</option>
              </select>
            </div>
            <div>
              <Label>Course</Label>
              <input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g., CSE220"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Label>Semester</Label>
              <input
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g., Fall 2025"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Tags</Label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma separated: dp, graphs, quiz"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell everyone what this resource covers and why it’s useful…"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-4 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Uploading…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <label className="text-xs font-semibold text-zinc-600">{children}</label>
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
