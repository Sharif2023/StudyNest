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
          className="absolute inset-0 bg-[#001D36]/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] bg-white border border-[#001D36]/10 shadow-2xl custom-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-10 py-10 bg-white/95 backdrop-blur-3xl border-b border-[#001D36]/10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#8AB100] animate-pulse" />
                <span className="text-[10px] font-black text-[#66625C] uppercase tracking-[0.2em]">Upload</span>
              </div>
              <h3 className="text-3xl font-black text-[#001D36] uppercase tracking-tighter flex items-center gap-3">
                <Plus className="w-8 h-8 text-[#00808C]" />
                Upload Resource
              </h3>
            </div>
            <button
              onClick={onClose}
              className="group p-4 rounded-2xl bg-white border border-[#001D36]/10 text-[#66625C] hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm transition-all duration-300"
            >
              <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-10">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#001D36]/10 w-fit shadow-sm">
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
                      ? "bg-[#001D36] text-white shadow-sm"
                      : "text-[#66625C] hover:text-[#001D36] hover:bg-[#001D36]/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-8">
              {mode === "file" ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">File</label>
                  <div className="relative group">
                    <div className="relative p-12 rounded-[2.5rem] border-2 border-dashed border-[#001D36]/10 bg-white flex flex-col items-center justify-center text-center group-hover:border-[#00808C]/50 transition-all duration-300 group-hover:bg-slate-50 shadow-sm">
                      <div className="w-20 h-20 rounded-[2rem] bg-[#001D36]/5 flex items-center justify-center text-3xl mb-6 relative transition-transform duration-300 shadow-inner">
                        <Upload className="w-8 h-8 text-[#66625C] group-hover:text-[#00808C] transition-colors" />
                        {file && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#00808C] text-white flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-[11px] font-black text-[#001D36] uppercase tracking-widest ">
                        {file ? file.name : "Select File"}
                      </span>
                      <p className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">DRAG & DROP FILE (MAX 50MB)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Source URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                  />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                  placeholder="E.G., QUANTUM PHYSICS NOTES"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Course</label>
                  <input
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                    placeholder="E.G., PHY101"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Semester</label>
                  <input
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                    placeholder="E.G., FALL 2026"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Resource Type</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                  >
                    {["other", "book", "slide", "past paper", "study guide", "recording"].map((k) => (
                      <option key={k} value={k} className="bg-white text-[#001D36]">{k.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all shadow-sm"
                    placeholder="COMMA-SEPARATED TAGS"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-[#001D36]/10 bg-white px-8 py-5 text-[11px] font-bold text-[#001D36] uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00808C]/50 transition-all resize-none shadow-sm"
                  placeholder="Describe the resource..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2 text-center block">Visibility</label>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {[
                    ["private", "Private", Shield],
                    ["public", "Public", Globe],
                  ].map(([val, label, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setVisibility(val)}
                      className={`group flex flex-1 items-center gap-5 px-8 py-5 rounded-2xl transition-all duration-300 border bg-white ${
                        visibility === val 
                          ? "border-[#00808C]/30 shadow-lg" 
                          : "border-[#001D36]/10 opacity-70 hover:opacity-100 hover:border-[#001D36]/20 shadow-sm"
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-all ${visibility === val ? "bg-[#00808C] text-white shadow-md" : "bg-[#001D36]/5 text-[#66625C]"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-black text-[#001D36] uppercase tracking-[0.2em] block">{label}</span>
                        <span className="text-[8px] font-bold text-[#66625C] uppercase tracking-widest mt-0.5">
                          {val === "private" ? "Only visible to you" : "Visible to everyone"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-10 border-t border-[#001D36]/10">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-[#001D36]/10 bg-white text-[10px] font-black uppercase tracking-[0.2em] text-[#66625C] hover:text-[#001D36] hover:bg-[#001D36]/5 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`w-full sm:w-auto px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-md ${
                  canSubmit && !submitting 
                    ? "bg-[#00808C] text-white hover:bg-[#00606B] active:scale-95" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                {submitting ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* local icon */
