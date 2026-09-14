
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full mx-auto max-w-3xl rounded-2xl p-6 bg-white border border-[#001D36]/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#001D36]">Upload Notes</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 bg-[#F0F4F8] text-[#66625C] hover:bg-[#001D36]/10">✕</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={"col-span-1 md:col-span-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 "}
            style={{ borderColor: drag ? "rgba(0,128,140,0.4)" : "rgba(0,29,54,0.15)", background: drag ? "rgba(0,128,140,0.05)" : "rgba(240,244,248,0.5)" }}
            ref={dropRef}>
            {!file ? (
              <>
                <FileIcon className="mx-auto h-8 w-8 mb-3 text-[#66625C]" />
                <p className="text-sm mb-3 text-[#66625C]">Drag & drop a PDF, Image or Document, or</p>
                <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 bg-[#001D36]/5 text-[#001D36] border border-[#001D36]/10 hover:bg-[#001D36]/10">
                  Choose File
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl p-3 bg-white border border-[#001D36]/10 shadow-sm">
                <div className="truncate text-sm text-[#001D36]">
                  <span className="font-semibold">{file.name}</span>
                  <span className="mx-1 text-[#66625C]">·</span>
                  <span className="text-[#66625C]">{file.type || "file"}</span>
                </div>
                <button onClick={() => setFile(null)} className="rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">Remove</button>
              </div>
            )}
          </div>

          {[["Title", title, setTitle, "CSE220 - Week 3 DP notes"], ["Course", course, setCourse, "CSE220"]].map(([lbl, val, setter, ph]) => (
            <div key={lbl}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#66625C]">{lbl}</label>
              <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300 bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] focus:bg-white focus:border-[#00808C]/40"
              />
            </div>
          ))}
          {[["Semester", semester, setSemester, "Fall 2025"], ["Tags", tags, setTags, "dp, graphs, quiz"]].map(([lbl, val, setter, ph]) => (
            <div key={lbl}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#66625C]">{lbl}</label>
              <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300 bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] focus:bg-white focus:border-[#00808C]/40"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#66625C]">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this note cover?..."
              className="mt-1.5 w-full rounded-xl py-2.5 px-4 text-sm outline-none transition-all duration-300 resize-none bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] focus:bg-white focus:border-[#00808C]/40"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-[#F0F4F8] text-[#66625C] hover:bg-[#001D36]/10">Cancel</button>
          <button disabled={disabled} onClick={submit}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 bg-[#00808C] text-white hover:bg-[#00808C]/90 shadow-md disabled:shadow-none">
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
    <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-[#001D36]/10 pb-4">
          <h3 className="text-sm font-semibold text-[#001D36] truncate">{file.name}</h3>
          <button onClick={onClose} className="rounded-md p-2 text-[#66625C] hover:bg-[#001D36]/10" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          {isImage ? (
            <img src={toBackendUrl(file.url)} alt={file.name} className="max-h-[70vh] w-full object-contain rounded-lg" />
          ) : isPdf ? (
            <iframe title="preview" src={toBackendUrl(file.url)} className="h-[70vh] w-full rounded-lg border border-[#001D36]/10 bg-[#F0F4F8]" />
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-[#001D36]/20 p-10 text-center text-sm text-[#001D36] bg-[#F0F4F8]">
              Preview not supported. Use download instead.
              <a href={toBackendUrl(file.url)} download className="mt-3 inline-flex rounded-xl bg-[#001D36] px-4 py-2 font-semibold text-white hover:bg-[#001D36]/90 shadow-sm">Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
