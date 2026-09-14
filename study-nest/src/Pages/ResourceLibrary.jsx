import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import apiClient from "../apiConfig";
import { 
  Search, 
  Plus, 
  Filter, 
  Layers, 
  Calendar, 
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import SharedResourceUpload from "../Components/SharedResourceUpload";

import { uniq } from "../Components/ResourceLibrary/ResourceUtils";
import { 
  FiltersIcon, 
  Select, 
  ResourceCard, 
  EmptyState 
} from "../Components/ResourceLibrary/ResourceComponents";
import { 
  PreviewModal 
} from "../Components/ResourceLibrary/ResourceModals";

const API_URL = "ResourceLibrary.php";

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

  // Navigation State
  const [navOpen, setNavOpen] = useState(window.innerWidth >= 1024);
  const [anonymous, setAnonymous] = useState(false);

  // Match LeftNav’s expected widths
  const COLLAPSED_W = 80;
  const EXPANDED_W = 280;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  // Function to fetch data from the API.
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      const data = response.data;
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
      const response = await apiClient.put(API_URL, { id, ...updates });
      const data = response.data;
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

      const res = await apiClient.post(API_URL, form);
      const json = res.data;

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
      const response = await apiClient.delete(`/recordings.php`, {
        params: { id }
      });

      const data = response.data;

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
      const r = await apiClient.post(API_URL, form);
      const j = r.data;
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
    <div className="min-h-screen bg-[#F0F4F8] selection:bg-[rgba(0,29,54,0.2)]/10 selection:text-white relative">
      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={sidebarWidth} />
      <Header sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} navOpen={navOpen} />

      <main
        style={{ paddingLeft: window.innerWidth < 1024 ? 0 : sidebarWidth }}
        className="transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen relative"
      >
        <div className="noise-overlay opacity-[0.02] pointer-events-none" />
        <div className=" pointer-events-none" />

        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-20 lg:py-32 relative z-10">
          
          {/* Section Header */}
          <header className="mb-20 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8AB100] animate-pulse shadow-sm" />
                <span className="text-[11px] font-black text-[#66625C] uppercase tracking-[0.3em]">Shared Resources</span>
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-[#001D36] leading-none tracking-tighter">
                Resource <br />
                <span className="text-[#00808C]">Library.</span>
              </h1>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 1, delay: 0.3 }}
               className="flex items-center gap-4"
            >
               <Link
                  to="/my-resources"
                  className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] border border-[#001D36]/10 text-[#66625C] hover:text-[#001D36] hover:bg-[#001D36]/5 bg-white transition-all shadow-sm"
                >
                  My Uploads
                </Link>
               <button
                  onClick={() => setOpen(true)}
                  className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] border border-[#00808C] bg-[#00808C] text-white hover:bg-[#00606B] transition-all shadow-md flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" /> 
                  Upload Resource
                </button>
            </motion.div>
          </header>

          {/* Premium Filter Bar */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="mb-12 p-2 rounded-[2rem] border border-[#001D36]/10 bg-white shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-2"
          >
             <div className="relative flex-1 group">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-[#66625C] group-hover:text-[#00808C] transition-colors duration-300" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full bg-transparent border-none text-[#001D36] pl-16 pr-6 py-5 text-sm font-bold uppercase tracking-widest placeholder:text-[#66625C]/60 focus:ring-0 focus:outline-none"
                />
             </div>
             
             <div className="flex flex-wrap items-center gap-2 p-1">
                <Select label="Type" value={type} onChange={setType} options={types} icon={<FiltersIcon />} />
                <Select label="Course" value={course} onChange={setCourse} options={courses} icon={<Layers className="w-3.5 h-3.5" />} />
                <Select label="Term" value={semester} onChange={setSemester} options={semesters} icon={<Calendar className="w-3.5 h-3.5" />} />
                <Select label="Order" value={sort} onChange={setSort} options={["New", "Top", "A-Z"]} icon={<Filter className="w-3.5 h-3.5" />} />
             </div>
          </motion.div>

          {/* Content */}
          <div className="relative">
            {loading ? (
               <div className="py-40 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-[2rem] bg-white border border-[#001D36]/10 flex items-center justify-center mb-8 relative shadow-sm">
                     <div className="absolute inset-0 border-2 border-[#00808C]/20 border-t-[#00808C] rounded-[2rem] animate-spin" />
                     <Database className="w-8 h-8 text-[#00808C] animate-pulse" />
                  </div>
                  <p className="text-[#66625C] font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Loading resources...</p>
               </div>
            ) : error ? (
              <div className="text-center text-red-500 py-32 bg-white rounded-[2rem] border border-red-500/10 p-12 shadow-sm">
                 <p className="font-bold uppercase tracking-widest">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState onNew={() => setOpen(true)} />
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((it, i) => (
                    <ResourceCard
                      key={it.id}
                      item={it}
                      index={i}
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
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

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
        <Footer sidebarWidth={sidebarWidth} />
      </main>
    </div>
  );
}
