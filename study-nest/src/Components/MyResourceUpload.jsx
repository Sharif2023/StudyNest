// Components/MyResourceUpload.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  File, 
  Database, 
  Shield, 
  Globe, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  BookOpen,
  Layout,
  Clock
} from "lucide-react";
import apiClient from "../apiConfig";

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

      const res = await apiClient.post(apiUrl || "/ResourceLibrary.php", form);
      const j = res.data;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] bg-[#08090e] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-10 py-10 bg-[#08090e]/95 backdrop-blur-3xl border-b border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Resource.Protocol_01</span>
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Plus className="w-8 h-8 text-cyan-500" />
                Initiate Archive
              </h3>
            </div>
            <button
              onClick={onClose}
              className="group p-4 rounded-2xl bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all duration-500 border border-white/5"
            >
              <X className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-10">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/5 w-fit">
              {[
                ["file", "Digital File"],
                ["link", "External Link"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === val
                      ? "bg-white text-black shadow-xl"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-8">
              {mode === "file" ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Content Payload</label>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700" />
                    <div className="relative p-12 rounded-[2.5rem] border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center group-hover:border-cyan-500/50 transition-all duration-500 group-hover:bg-white/[0.04]">
                      <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl mb-6 relative group-hover:scale-110 transition-transform duration-500">
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        {file && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-[11px] font-black text-white uppercase tracking-widest ">
                        {file ? file.name : "Establish Metadata Connection"}
                      </span>
                      <p className="mt-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">DRAG & DROP SECURE PAYLOAD (MAX 50MB)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Source URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://cloud.archive/asset-v1"
                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Asset Identification</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                  placeholder="E.G., QUANTUM PHYSICS NOTES"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Context Category</label>
                  <input
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                    placeholder="E.G., PHY101"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Academic Cycle</label>
                  <input
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                    placeholder="E.G., FALL 2026"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Asset Logic</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                  >
                    {["other", "book", "slide", "past paper", "study guide", "recording"].map((k) => (
                      <option key={k} value={k} className="bg-[#08090e] text-white">{k.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Registry Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all"
                    placeholder="COMMA-SEPARATED TAGS"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Metadata Summary</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-8 py-5 text-[11px] font-bold text-white uppercase tracking-widest placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl transition-all resize-none"
                  placeholder="Enter detailed description for archival indexing..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 text-center block">Visibility Permissions</label>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {[
                    ["private", "Vault Storage", Shield],
                    ["public", "Global Registry", Globe],
                  ].map(([val, label, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setVisibility(val)}
                      className={`group flex flex-1 items-center gap-5 px-8 py-5 rounded-2xl transition-all duration-500 border ${
                        visibility === val 
                          ? "bg-white/10 border-white/20 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]" 
                          : "bg-transparent border-transparent opacity-30 hover:opacity-100 hover:bg-white/5"
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-all ${visibility === val ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-white/5 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] block">{label}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                          {val === "private" ? "Restricted Access" : "Network Visibility"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-10 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`w-full sm:w-auto relative px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] overflow-hidden group transition-all ${
                  canSubmit && !submitting 
                    ? "bg-white text-black shadow-2xl shadow-white/5 hover:scale-105 active:scale-95" 
                    : "bg-white/10 text-slate-600 cursor-not-allowed"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 group-hover:text-white transition-colors">
                  {submitting ? "Processing..." : mode === "file" ? "Execute Upload" : "Sync Archive"}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* local icon */
