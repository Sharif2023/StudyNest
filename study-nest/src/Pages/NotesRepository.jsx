import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";


/**
 * StudyNest — Lecture Notes Repository
 * -----------------------------------------------------------------
 * Frontend-only (swap fakeApi with your backend later):
 * - Upload (drag & drop or file picker) with course, topic tags, semester
 * - Organize + filter by course/semester/tags and search
 * - Lightweight versioning: each Note has versions; uploading same title+course adds a version
 * - Preview: PDF/images inline (iframe/img), others as download
 * - Share link stub and copy to clipboard
 * - No external deps beyond React + Tailwind
 *
 * Route: <Route path="/notes" element={<NotesRepository/>} />
 */

export default function NotesRepository() {
  const [notes, setNotes] = useState(() => seedNotes());
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("All");
  const [semester, setSemester] = useState("All");
  const [tag, setTag] = useState("All");
  const [uOpen, setUOpen] = useState(false);
  const [preview, setPreview] = useState(null); // {url, mime, name}

  const courses = useMemo(() => ["All", ...unique(notes.map((n) => n.course))], [notes]);
  const semesters = useMemo(() => ["All", ...unique(notes.map((n) => n.semester))], [notes]);
  const tags = useMemo(() => ["All", ...unique(notes.flatMap((n) => n.tags))], [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      const passCourse = course === "All" || n.course === course;
      const passSem = semester === "All" || n.semester === semester;
      const passTag = tag === "All" || n.tags.includes(tag);
      const passQ = !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q));
      return passCourse && passSem && passTag && passQ;
    });
  }, [notes, query, course, semester, tag]);

  const onUpload = async (payload) => {
    // payload: {file, title, course, semester, tags, description}
    const { file, title, course, semester, tags, description } = payload;
    const blobUrl = URL.createObjectURL(file);
    const mime = file.type || "application/octet-stream";

    await fakeApi.delay(500);

    setNotes((prev) => {
      // Versioning: if same title+course, append a version
      const idx = prev.findIndex((n) => n.title.toLowerCase() === title.toLowerCase() && n.course === course);
      if (idx !== -1) {
        const vnum = prev[idx].versions.length + 1;
        const newVersion = {
          id: uid(),
          v: vnum,
          name: file.name,
          url: blobUrl,
          mime,
          uploadedAt: new Date().toISOString(),
          size: file.size,
        };
        const updated = [...prev];
        updated[idx] = { ...updated[idx], semester, description, tags: mergeTags(updated[idx].tags, tags), updatedAt: new Date().toISOString(), versions: [newVersion, ...updated[idx].versions] };
        return updated;
      }
      // New note entry
      const note = {
        id: uid(),
        title: title.trim(),
        course,
        semester,
        tags,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            id: uid(),
            v: 1,
            name: file.name,
            url: blobUrl,
            mime,
            uploadedAt: new Date().toISOString(),
            size: file.size,
          },
        ],
      };
      return [note, ...prev];
    });

    setUOpen(false);
  };

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
    <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl">
      <LeftNav></LeftNav>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Lecture Notes</h1>
            <p className="text-sm text-white">Upload, organize, and version your course notes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setUOpen(true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Upload</button>
          </div>
        </div>

        {/* Filters */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:max-w-md">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, description, or tag…"
                className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Select value={course} onChange={setCourse} label="Course" options={courses} />
            <Select value={semester} onChange={setSemester} label="Semester" options={semesters} />
            <Select value={tag} onChange={setTag} label="Tag" options={tags} />
          </div>
        </div>
      </header>

      {/* List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 ? (
          <EmptyState onNew={() => setUOpen(true)} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => (
              <li key={n.id}>
                <NoteCard note={n} onPreview={setPreview} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {uOpen && <UploadModal onClose={() => setUOpen(false)} onUpload={onUpload} />}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      <Footer />
    </main>
  );
}

/* -------------------- Components -------------------- */
function Select({ value, onChange, label, options }) {
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

function NoteCard({ note, onPreview }) {
  const v = note.versions[0]; // latest
  const isPdf = v.mime.includes("pdf");
  const isImage = v.mime.startsWith("image/");

  const open = () => onPreview({ url: v.url, mime: v.mime, name: v.name });

  return (
    <article className="group flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-50">
        {/* Simple preview thumb */}
        {isImage ? (
          <img src={v.url} alt={note.title} className="h-full w-full object-cover" />
        ) : isPdf ? (
          <div className="grid h-full place-items-center text-zinc-500">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs">PDF preview</span>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-zinc-500">
            <FileIcon className="h-10 w-10" />
            <span className="mt-1 text-xs">{v.mime.split("/")[1] || "file"}</span>
          </div>
        )}
        <button onClick={open} className="absolute inset-0 hidden items-center justify-center bg-black/0 text-white backdrop-blur-sm transition group-hover:flex group-hover:bg-black/30">
          <span className="rounded-xl bg-white/20 px-3 py-1 text-sm font-semibold ring-1 ring-white/40">Preview</span>
        </button>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-zinc-900" title={note.title}>{note.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{note.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">{note.course}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">{note.semester}</span>
          <span>•</span>
          <span>{note.versions.length} version{note.versions.length > 1 ? "s" : ""}</span>
          <span>•</span>
          <span>updated {timeAgo(note.updatedAt)}</span>
        </div>
      </div>

      {/* Versions list */}
      <div className="mt-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
        <h4 className="text-xs font-semibold text-zinc-700">Versions</h4>
        <ul className="mt-2 space-y-1">
          {note.versions.map((ver) => (
            <li key={ver.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-zinc-200">
              <div className="min-w-0 truncate">
                <span className="font-semibold">v{ver.v}</span>
                <span className="mx-1 text-zinc-400">•</span>
                <span className="truncate align-middle" title={ver.name}>{ver.name}</span>
                <span className="mx-1 text-zinc-400">•</span>
                <span>{(ver.size / 1024).toFixed(1)} KB</span>
                <span className="mx-1 text-zinc-400">•</span>
                <span className="text-zinc-500">{timeAgo(ver.uploadedAt)}</span>
              </div>
              <div className="shrink-0 space-x-1">
                <a href={ver.url} download className="rounded-lg border border-zinc-300 px-2 py-1 font-semibold hover:bg-zinc-50">Download</a>
                <button onClick={() => onPreview({ url: ver.url, mime: ver.mime, name: ver.name })} className="rounded-lg border border-zinc-300 px-2 py-1 font-semibold hover:bg-zinc-50">Open</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {note.tags.map((t) => (
          <span key={t} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">#{t}</span>
        ))}
      </div>

      {/* Share */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Share link (stub)</span>
        <button
          onClick={() => copyText(window.location.origin + "/notes/" + note.id)}
          className="rounded-xl border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
        >
          Copy link
        </button>
      </div>
    </article>
  );
}

function UploadModal({ onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [drag, setDrag] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const enter = (e) => { prevent(e); setDrag(true); };
    const leave = (e) => { prevent(e); setDrag(false); };
    const drop = (e) => {
      prevent(e); setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f) setFile(f);
    };
    el.addEventListener("dragenter", enter);
    el.addEventListener("dragover", enter);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragenter", enter);
      el.removeEventListener("dragover", enter);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop);
    };
  }, []);

  const disabled = !file || !title.trim() || !course.trim() || !semester.trim();

  const submit = () => onUpload({
    file,
    title: title.trim(),
    course: course.trim(),
    semester: semester.trim(),
    tags: parseTags(tags),
    description: description.trim(),
  });

  return (
    <div className="fixed inset-0 z-40 bg-black/50 p-4" onClick={onClose}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Upload notes</h2>
          <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className={"col-span-1 md:col-span-2 rounded-2xl border-2 border-dashed p-6 text-center " + (drag ? "border-emerald-500 bg-emerald-50" : "border-zinc-300")} ref={dropRef}>
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

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={setTitle} placeholder="e.g., CSE220 - Week 3 DP notes" />
          </div>
          <div>
            <Label>Course</Label>
            <Input value={course} onChange={setCourse} placeholder="e.g., CSE220" />
          </div>
          <div>
            <Label>Semester</Label>
            <Input value={semester} onChange={setSemester} placeholder="e.g., Fall 2025" />
          </div>
          <div>
            <Label>Tags</Label>
            <Input value={tags} onChange={setTags} placeholder="comma separated: dp, graphs, quiz" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some context so others know what this covers…"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">Cancel</button>
          <button disabled={disabled} onClick={submit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Upload</button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose }) {
  const isPdf = file.mime.includes("pdf");
  const isImage = file.mime.startsWith("image/");
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
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <FileIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No notes yet</h3>
        <p className="mt-1 text-sm text-zinc-600">Upload your first lecture notes to get started.</p>
        <button onClick={onNew} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Upload notes</button>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <label className="text-xs font-semibold text-zinc-600">{children}</label>;
}
function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />
  );
}

/* -------------------- Icons -------------------- */
function SearchIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" /></svg>); }
function XIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); }
function FileIcon(props) { return (<svg viewBox="0 0 24 24" className="h-10 w-10" {...props}><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z" /></svg>); }

/* -------------------- Utils & mock data -------------------- */
function uid() { return Math.random().toString(36).slice(2, 9); }
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function parseTags(s) { return s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6); }
function mergeTags(a, b) { return unique([...(a || []), ...parseTags(b.join ? b.join(",") : b)]); }
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  const steps = [[60, "s"], [60, "m"], [24, "h"], [7, "d"]];
  let n = diff, u = "s"; for (const [step, unit] of steps) { if (n < step) { u = unit; break; } n = Math.floor(n / step); u = unit; }
  return `${Math.max(1, Math.floor(n))}${u} ago`;
}

function seedNotes() {
  return [
    {
      id: uid(),
      title: "CSE220 - DP Patterns (Week 3)",
      course: "CSE220",
      semester: "Fall 2025",
      tags: ["dp", "coin-change", "top-down"],
      description: "Memoization patterns, base cases, and transitions.",
      createdAt: new Date(Date.now() - 36e5 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 36e5 * 2).toISOString(),
      versions: [
        { id: uid(), v: 2, name: "cse220-dp-v2.pdf", url: samplePdf(), mime: "application/pdf", uploadedAt: new Date(Date.now() - 36e5 * 2).toISOString(), size: 120 * 1024 },
        { id: uid(), v: 1, name: "cse220-dp-v1.pdf", url: samplePdf(), mime: "application/pdf", uploadedAt: new Date(Date.now() - 36e5 * 28).toISOString(), size: 110 * 1024 },
      ],
    },
    {
      id: uid(),
      title: "EEE101 - Lab Diagrams",
      course: "EEE101",
      semester: "Fall 2025",
      tags: ["lab", "diagrams"],
      description: "Basic circuits—Ohm's law, series-parallel examples.",
      createdAt: new Date(Date.now() - 36e5 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 36e5 * 10).toISOString(),
      versions: [
        { id: uid(), v: 1, name: "eee101-lab-diagrams.png", url: sampleImg(), mime: "image/png", uploadedAt: new Date(Date.now() - 36e5 * 10).toISOString(), size: 420 * 1024 },
      ],
    },
  ];
}

// Lightweight placeholders for demo (same-origin blob URLs)
function samplePdf() {
  // Tiny one-page blank PDF blob
  const b64 = "JVBERi0xLjQKJcfsj6IKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZSAvUGFnZXMvS2lkcyBbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveCBbMCAwIDU5NSAODgBdL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDQgMCBSPj4+Pi9Db250ZW50cyA1IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUgL0ZvbnQvU3VidHlwZSAvVHlwZTEvTmFtZSAvRjEvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCAxMTI+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQoSGVsbG8sIFBERikKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxMDUgMDAwMDAgbiAKMDAwMDAwMDE5NiAwMDAwMCBuIAowMDAwMDAwMzI0IDAwMDAwIG4gCjAwMDAwMDA0MDQgMDAwMDAgbiAKMDAwMDAwMDQ4NSAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIvU2l6ZSA2Pj4KJSVFT0Y=";
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bin], { type: "application/pdf" }));
}
function sampleImg() {
  // 1x1 png
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAnMB4r3M0YwAAAAASUVORK5CYII=";
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bin], { type: "image/png" }));
}

const fakeApi = { delay(ms) { return new Promise((r) => setTimeout(r, ms)); } };
