import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/**
 * StudyNest — Lecture Notes Repository
 * -----------------------------------------------------------------
 * Frontend React component connected to the PHP backend for dynamic functionality.
 */
export default function NotesRepository() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("All");
  const [semester, setSemester] = useState("All");
  const [tag, setTag] = useState("All");
  const [uOpen, setUOpen] = useState(false);
  const [preview, setPreview] = useState(null); // {url, mime, name}

  //leftBar
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // Match LeftNav’s expected widths
  const COLLAPSED_W = 72;   // px
  const EXPANDED_W = 248;  // px
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;


  // ✅ Function to fetch notes from the API
  const fetchNotes = async () => {
    try {
      const response = await fetch('http://localhost/studynest/study-nest/src/api/notes.php');
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.notes)) {
        // The backend returns tags as a comma-separated string, so we split it into an array
        const formattedNotes = data.notes.map(note => ({
          ...note,
          tags: note.tags ? note.tags.split(',').map(tag => tag.trim()) : []
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest
        setNotes(formattedNotes);
      } else {
        setNotes([]); // Clear notes if API returns an error or no notes
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]); // Also clear notes on network error
    }
  };

  // ✅ useEffect to run fetchNotes() once when the component mounts
  useEffect(() => {
    fetchNotes();
  }, []); // The empty dependency array [] ensures this runs only once on load

  const courses = useMemo(() => ["All", ...unique(notes.map((n) => n.course))], [notes]);
  const semesters = useMemo(() => ["All", ...unique(notes.map((n) => n.semester))], [notes]);
  const tags = useMemo(() => ["All", ...unique(notes.flatMap((n) => n.tags))], [notes]);

  // Filtering notes based on search, course, semester, and tags
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      const passCourse = course === "All" || n.course === course;
      const passSem = semester === "All" || n.semester === semester;
      const passTag = tag === "All" || n.tags.includes(tag);
      const passQ = !q || n.title.toLowerCase().includes(q) || (n.description && n.description.toLowerCase().includes(q)) || n.tags.some((t) => t.toLowerCase().includes(q));
      return passCourse && passSem && passTag && passQ;
    });
  }, [notes, query, course, semester, tag]);

  // ✅ UPDATED: Handle file upload to the PHP backend
  const onUpload = async (payload) => {
    const { file, title, course, semester, tags, description } = payload;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('course', course);
    formData.append('semester', semester);
    formData.append('tags', tags.join(', '));
    formData.append('description', description);

    try {
      const response = await fetch('http://localhost/studynest/study-nest/src/api/notes.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert(data.message);
        fetchNotes(); // Re-fetch all notes to update the UI with the new data
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error('Error uploading note:', error);
      alert('An error occurred during upload.');
    }
    setUOpen(false); // Close the upload modal after submission
  };

  function Select({ label, value, onChange, options }) {
    return (
      <label className="inline-flex items-center gap-2 text-md">
        <span className="text-zinc-900">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-800 
                   px-3 py-2 text-sm focus:outline-none focus:ring-2 
                   focus:ring-emerald-500"
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl" style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}>
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Lecture Notes</h1>
            <p className="text-sm text-white">Upload, organize, and version your course notes.</p>
          </div>
        </div>
      </header>

      {/* Search + Filters + Upload */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: search + filters */}
          <div className="flex w-full flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
            <div className="relative w-full sm:max-w-md">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, description, or tag…"
                className="w-full rounded-xl border border-zinc-300 bg-white pl-4 pr-3 py-2 text-sm
                     text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Select value={course} onChange={setCourse} label="Course" options={courses} />
            <Select value={semester} onChange={setSemester} label="Semester" options={semesters} />
            <Select value={tag} onChange={setTag} label="Tag" options={tags} />
          </div>
          {/* Divider on larger screens */}
          <span className="hidden md:block h-6 w-px bg-zinc-300/70 mx-1" />

          {/* Right: Upload */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setUOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              <PlusIcon className="h-4 w-4" /> Upload Notes
            </button>
          </div>
        </div>
      </section>

      {/* Notes grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 ? (
          <EmptyState onNew={() => setUOpen(true)} />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M11 4h2v16h-2z" /><path fill="currentColor" d="M4 11h16v2H4z" /></svg>
  );
}

// Dropdown select component for filters (course, semester, tags)
function Select({ label, value, onChange, options }) {
  return (
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
};

// ✅ UPDATED: NoteCard now works with the database schema
function NoteCard({ note }) {
  // Infer file type from the URL extension
  const isPdf = note.file_url.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(note.file_url);

  return (
    <article className="group flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition hover:shadow-lg">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-100">
        {isImage ? (
          <img src={note.file_url} alt={note.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-zinc-500">
            <FileIcon className="h-10 w-10" />
            <span className="mt-2 text-xs font-semibold">{note.title}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-base font-semibold text-zinc-900" title={note.title}>{note.title}</h3>
        <p className="mt-1 text-sm text-zinc-600"><strong>{note.course}</strong> • {note.semester}</p>
        <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{note.description}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {note.tags.map(tag => (
          <span key={tag} className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">{tag}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-zinc-200 pt-4">
        <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700">
          Open
        </a>
        <a href={note.file_url} download className="flex-1 rounded-lg bg-zinc-200 px-3 py-2 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-300">
          Download
        </a>
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
function XIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); }
function FileIcon(props) { return (<svg viewBox="0 0 24 24" className="h-10 w-10" {...props}><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z" /></svg>); }

/* -------------------- Utils -------------------- */
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function parseTags(s) { return s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6); }