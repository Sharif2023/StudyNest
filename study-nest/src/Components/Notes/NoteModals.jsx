
import React, { useState, useEffect, useRef } from "react";
import { FileIcon, XIcon } from "./NoteComponents";
import { parseTags } from "./NoteUtils";
import { toBackendUrl } from "../../apiConfig";

export function UploadModal({ onClose, onUpload }) {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full mx-auto max-w-3xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: "rgba(13,15,26,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "#f1f5f9" }}>Upload Notes</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>✕</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={"col-span-1 md:col-span-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 "}
            style={{ borderColor: drag ? "rgba(6,182,212,0.6)" : "rgba(255,255,255,0.1)", background: drag ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.02)" }}
            ref={dropRef}>
            {!file ? (
              <>
                <FileIcon className="mx-auto h-8 w-8 mb-3" style={{ color: "#334155" }} />
                <p className="text-sm mb-3" style={{ color: "#475569" }}>Drag & drop a PDF, image or Doc, or</p>
                <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                  Choose File
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="truncate text-sm" style={{ color: "#e2e8f0" }}>
                  <span className="font-semibold">{file.name}</span>
                  <span className="mx-1" style={{ color: "#334155" }}>·</span>
                  <span style={{ color: "#64748b" }}>{file.type || "file"}</span>
                </div>
                <button onClick={() => setFile(null)} className="rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200"
                  style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>Remove</button>
              </div>
            )}
          </div>

          {[["Title", title, setTitle, "CSE220 - Week 3 DP notes"], ["Course", course, setCourse, "CSE220"]].map(([lbl, val, setter, ph]) => (
            <div key={lbl}>
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>{lbl}</label>
              <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
                onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>
          ))}
          {[["Semester", semester, setSemester, "Fall 2025"], ["Tags", tags, setTags, "dp, graphs, quiz"]].map(([lbl, val, setter, ph]) => (
            <div key={lbl}>
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>{lbl}</label>
              <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
                onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this note cover?..."
              className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300 resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
              onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
          <button disabled={disabled} onClick={submit}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50"
            style={{ background: disabled ? "rgba(124,58,237,0.2)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: disabled ? "none" : "0 8px 24px rgba(124,58,237,0.3)" }}>
            Upload Notes
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewModal({ file, onClose }) {
  const isPdf = file.mime.includes("pdf");
  const isImage = file.mime.startsWith("image/");
  return (
    <div className="fixed inset-0 z-40 bg-black/70 p-4" onClick={onClose}>
      <div className="mx-auto max-w-5xl rounded-2xl bg-[rgba(255,255,255,0.02)] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
          <button onClick={onClose} className="rounded-md p-2 text-slate-300 hover:bg-[rgba(255,255,255,0.05)]" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          {isImage ? (
            <img src={toBackendUrl(file.url)} alt={file.name} className="max-h-[70vh] w-full object-contain" />
          ) : isPdf ? (
            <iframe title="preview" src={toBackendUrl(file.url)} className="h-[70vh] w-full rounded-lg ring-1 ring-zinc-200" />
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-white/10 p-10 text-center text-sm text-slate-200">
              Preview not supported. Use download instead.
              <a href={toBackendUrl(file.url)} download className="mt-3 inline-flex rounded-xl bg-[rgba(255,255,255,0.1)] px-4 py-2 font-semibold text-white hover:bg-zinc-800">Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
