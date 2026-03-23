import React, { useEffect, useMemo, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import apiClient from "../apiConfig";

import { unique } from "../Components/Notes/NoteUtils";
import { 
  PlusIcon, 
  Select, 
  NoteCard, 
  EmptyState 
} from "../Components/Notes/NoteComponents";
import { 
  UploadModal, 
  PreviewModal 
} from "../Components/Notes/NoteModals";

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

  // Navigation State
  const [navOpen, setNavOpen] = useState(window.innerWidth >= 1024);
  const [anonymous, setAnonymous] = useState(false);

  // Match LeftNav’s expected widths
  const COLLAPSED_W = 80;
  const EXPANDED_W = 280;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  // ✅ Function to fetch notes from the API
  const fetchNotes = async () => {
    try {
      const response = await apiClient.get("notes.php");
      const data = response.data;
      if (data.status === 'success' && Array.isArray(data.notes)) {
        const formattedNotes = data.notes.map(note => ({
          ...note,
          tags: note.tags ? note.tags.split(',').map(tag => tag.trim()) : []
        }));
        setNotes(formattedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    }
  };

  // ✅ useEffect to run fetchNotes() once when the component mounts
  useEffect(() => {
    fetchNotes();
  }, []);

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

  // ✅ Handle file upload to the PHP backend
  const onUpload = async (payload) => {
    const { file, title, course, semester, tags: payloadTags, description } = payload;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('course', course);
    formData.append('semester', semester);
    formData.append('tags', payloadTags.join(', '));
    formData.append('description', description);

    // Add user_id from localStorage
    const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
    if (auth?.id) {
      formData.append('user_id', auth.id);
    }

    try {
      const response = await apiClient.post("notes.php", formData);
      const data = response.data;
      if (data.status === 'success') {
        const updatedPoints = data.new_points;
        if (updatedPoints !== undefined && auth?.id) {
          const updatedAuth = { ...auth, points: updatedPoints };
          localStorage.setItem('studynest.auth', JSON.stringify(updatedAuth));
          window.dispatchEvent(new CustomEvent('studynest:points-updated', { detail: { points: updatedPoints } }));
        }
        alert(data.message);
        fetchNotes();
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error('Error uploading note:', error);
      alert('An error occurred during upload.');
    }
    setUOpen(false);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      const resp = await apiClient.delete(`notes.php?id=${id}`);
      if (resp.data.status === 'success') {
        alert(resp.data.message);
        fetchNotes();
      } else {
        alert("Error: " + resp.data.message);
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete note.");
    }
  };

  const authData = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
  const currentUserId = authData.id;

  return (
    <main className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: window.innerWidth < 1024 ? 0 : sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/3 w-80 h-80 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #f1f5f9, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Notes Library</h1>
            <p className="text-sm mt-1" style={{ color: "#475569" }}>Explore and share academic lecture notes</p>
          </div>
          <button onClick={() => setUOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
            <PlusIcon className="h-4 w-4" /> Upload Notes
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="relative flex-1">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes, tags..."
              className="w-full rounded-xl py-2.5 pl-4 pr-3 text-sm outline-none transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
              onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
          <Select value={course} onChange={setCourse} label="Course" options={courses} />
          <Select value={semester} onChange={setSemester} label="Semester" options={semesters} />
          <Select value={tag} onChange={setTag} label="Tag" options={tags} />
        </div>

        {/* Notes Grid */}
        {filtered.length === 0 ? (
          <EmptyState onNew={() => setUOpen(true)} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => (
              <li key={n.id}>
                <NoteCard 
                  note={n} 
                  onPreview={setPreview} 
                  onDelete={onDelete} 
                  currentUserId={currentUserId} 
                />
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