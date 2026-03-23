// Pages/MyResources.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import MyResourceUpload from "../Components/MyResourceUpload";
import apiClient from "../apiConfig";

import { 
  uniq 
} from "../Components/MyResources/MyResourceUtils";
import { 
  SearchIcon, 
  Select, 
  Card, 
  EmptyState 
} from "../Components/MyResources/MyResourceComponents";
import { 
  PreviewModal 
} from "../Components/MyResources/MyResourceModals";

const RES_LIBRARY_API = "ResourceLibrary.php";

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
  const [content, setContent] = useState({ resources: [], recordings: [], notes: [] });

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

  // Open correct tab via URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const kind = params.get("kind");
    if (tabParam === "recordings" || kind === "recording") setTab("recordings");
    else if (tabParam === "resources") setTab("resources");
  }, [location.search]);

  // Current user (for ownership checks)
  const auth = JSON.parse(localStorage.getItem("studynest.auth") || "null") || {};
  const profile = JSON.parse(localStorage.getItem("studynest.profile") || "null") || {};
  const currentUser = profile?.name || auth?.name || "Unknown";
  const currentUserId = Number(auth?.id || 0);

  const fetchMine = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiClient.get("profile.php", { params: { content: 1 } });
      const j = res.data;
      if (!j?.ok || !j?.content) throw new Error("Invalid content response");
      setContent({
        resources: Array.isArray(j.content.resources) ? j.content.resources : [],
        recordings: Array.isArray(j.content.recordings) ? j.content.recordings : [],
        notes: Array.isArray(j.content.notes) ? j.content.notes : [],
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
  const rawItems = useMemo(() => {
    if (tab === "recordings") {
      return (content.recordings || []).map(r => ({
        ...r,
        uniqueKey: `rec-${r.id}`
      }));
    }
    // Merge resources and notes for the resources tab
    const normalizedResources = (content.resources || []).map(r => ({
      ...r,
      uniqueKey: `res-${r.id}`
    }));
    const normalizedNotes = (content.notes || []).map(n => ({
      ...n,
      url: n.file_url,
      kind: n.kind || 'note',
      isNote: true,
      uniqueKey: `note-${n.id}`
    }));
    return [...normalizedResources, ...normalizedNotes];
  }, [content, tab]);

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
  const deleteRecording = async (item) => {
    const id = item.id;
    if (!window.confirm("Delete this recording? This cannot be undone.")) return;
    try {
      const res = await apiClient.delete("recordings.php", { params: { id } });
      const j = res.data;
      if (j?.status === "success") {
        await fetchMine();
        alert("✅ Recording deleted");
      } else {
        alert("❌ " + (j?.message || "Failed to delete"));
      }
    } catch (e) {
      console.error(e);
      alert("❌ " + e.message);
    }
  };

  const deleteResource = async (item) => {
    const id = item.id;
    if (!window.confirm("Delete this " + (item.isNote ? "note" : "resource") + "? This cannot be undone.")) return;
    try {
      const form = new FormData();
      form.append("action", "delete_resource");
      form.append("resource_id", id);
      if (item.isNote) {
        form.append("is_note", "1");
        form.append("note_id", id);
      }
      const res = await apiClient.post(RES_LIBRARY_API, form);
      const j = res.data;
      if (j?.status === "success") {
        await fetchMine();
        alert("✅ " + (item.isNote ? "Note" : "Resource") + " deleted");
      } else {
        alert("❌ " + (j?.message || "Failed to delete"));
      }
    } catch (e) {
      console.error(e);
      alert("❌ " + e.message);
    }
  };

  const shareRecording = async (item) => {
    const id = item.id;
    try {
      const form = new FormData();
      form.append("action", "share_recording");
      form.append("recording_id", id);
      const res = await apiClient.post(RES_LIBRARY_API, form);
      const j = res.data;
      if (j?.status === "success") {
        if (j.points_awarded) bumpLocalPoints(j.points_awarded);
        alert("✅ " + (j.message || "Shared to Shared Resources"));
      } else {
        alert("❌ " + (j?.message || "Share failed"));
      }
    } catch (e) {
      console.error(e);
      alert("❌ " + e.message);
    }
  };

  const shareResource = async (item) => {
    const id = item.id;
    try {
      const form = new FormData();
      if (item.isNote) {
        form.append("action", "share_note");
        form.append("note_id", id);
      } else {
        form.append("action", "share_resource");
        form.append("resource_id", id);
      }
      const res = await apiClient.post(RES_LIBRARY_API, form);
      const j = res.data;
      if (j?.status === "success") {
        if (j.points_awarded) bumpLocalPoints(j.points_awarded);
        await fetchMine();
        alert("✅ " + (j.message || "Shared to Shared Resources"));
      } else {
        alert("❌ " + (j?.message || "Share failed"));
      }
    } catch (e) {
      console.error(e);
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
    <div className="min-h-screen bg-[#08090e] selection:bg-cyan-500/30 selection:text-white relative">
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        sidebarWidth={sidebarWidth}
      />

      <Header sidebarWidth={sidebarWidth} />

      <main
        style={{ paddingLeft: sidebarWidth }}
        className="transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen relative pb-32"
      >
        <section className="max-w-[1600px] mx-auto px-12 py-32 relative z-10">
          {/* Header Section */}
          <div className="mb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Academic Assets</span>
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none"
                >
                  MY<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 uppercase font-black">Resources.</span>
                </motion.h1>
              </div>

              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUploadOpen(true)}
                  className="group relative px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] overflow-hidden shadow-2xl shadow-white/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors">
                    Upload Resource
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
              {[
                ["resources", "My Library"],
                ["recordings", "Lectures"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTab(val)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    tab === val
                      ? "bg-white text-black shadow-xl"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row items-center gap-6 mb-12 relative z-10">
            <div className="relative w-full lg:max-w-xl group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Secure search through your academic assets..."
                className="w-full rounded-2xl border border-white/5 bg-white/[0.03] pl-14 pr-6 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-3xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              {tab === "resources" && <Select label="Type" value={type} onChange={setType} options={types} />}
              <Select label="Course" value={course} onChange={setCourse} options={courses} />
              <Select label="Tag" value={tag} onChange={setTag} options={tags} />
              <Select label="Sort" value={sort} onChange={setSort} options={["New", "Top", "A-Z"]} />
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[40vh]">
            {loading ? (
              <div className="rounded-2xl bg-[rgba(255,255,255,0.02)] p-6 text-center text-slate-300 dark:bg-slate-900 dark:text-slate-400">
                Loading your items…
              </div>
            ) : err ? (
              <div className="rounded-2xl bg-[rgba(255,255,255,0.02)] p-6 text-center text-red-600 dark:bg-slate-900">
                Error: {err}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((it) => (
                  <li key={it.uniqueKey}>
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
                      onDeleteResource={() => deleteResource(it)}
                      onShareRecording={shareRecording}
                      onShareResource={() => shareResource(it)}
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
        <MyResourceUpload
          apiUrl={RES_LIBRARY_API}
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
