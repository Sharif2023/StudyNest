
import React from "react";
import { toBackendUrl } from "../../apiConfig";

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M11 4h2v16h-2z" /><path fill="currentColor" d="M4 11h16v2H4z" /></svg>
  );
}

export function XIcon(props) { 
  return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); 
}

export function FileIcon(props) { 
  return (<svg viewBox="0 0 24 24" className="h-10 w-10" {...props}><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z" /></svg>); 
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold flex-shrink-0" style={{ color: "#64748b" }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer transition-all duration-300"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}
        onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
      >
        {options.map((o) => (<option key={o} value={o} style={{ background: "#0d0f1a" }}>{o}</option>))}
      </select>
    </label>
  );
}

export function NoteCard({ note, onPreview, onDelete, currentUserId }) {
  const isPdf = note.file_url.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(note.file_url);
  const isOwner = currentUserId && Number(note.user_id) === Number(currentUserId);

  return (
    <article className="group flex h-full flex-col rounded-2xl p-5 transition-all duration-400 cursor-pointer relative"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.06)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Delete Button (Owner Only) */}
      {isOwner && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-500/20 text-red-400"
          title="Delete Note"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.04)" }} onClick={() => onPreview({url: note.file_url, mime: isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'application/octet-stream', name: note.title})}>
        {isImage ? (
          <img src={toBackendUrl(note.file_url)} alt={note.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center">
            <FileIcon className="h-10 w-10" style={{ color: "#334155" }} />
            <span className="mt-2 text-xs font-semibold" style={{ color: "#475569" }}>{isPdf ? "PDF Document" : "File"}</span>
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          style={{ background: isPdf ? "rgba(244,63,94,0.2)" : "rgba(6,182,212,0.2)", color: isPdf ? "#fb7185" : "#22d3ee", border: `1px solid ${isPdf ? "rgba(244,63,94,0.3)" : "rgba(6,182,212,0.3)"}` }}>
          {isPdf ? "PDF" : isImage ? "IMG" : "FILE"}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold leading-snug mb-1" style={{ color: "#e2e8f0" }}>{note.title}</h3>
        <p className="text-xs mb-2" style={{ color: "#64748b" }}>{note.course} · {note.semester}</p>
        <p className="text-xs line-clamp-2" style={{ color: "#475569" }}>{note.description}</p>
      </div>

      {note.username && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white" }}>
            {note.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs" style={{ color: "#475569" }}>by {note.username}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#22d3ee" }}>{tag}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <a href={toBackendUrl(note.file_url)} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 px-3 rounded-xl text-center text-xs font-bold transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white" }}>
          Open
        </a>
        <a href={toBackendUrl(note.file_url)} download
          className="flex-1 py-2 px-3 rounded-xl text-center text-xs font-bold transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
          Download
        </a>
      </div>
    </article>
  );
}

export function EmptyState({ onNew }) {
  return (
    <div className="grid place-items-center rounded-3xl border-2 border-dashed py-20" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <FileIcon className="h-7 w-7" style={{ color: "#22d3ee" }} />
        </div>
        <h3 className="text-base font-bold mb-2" style={{ color: "#64748b" }}>No notes yet</h3>
        <p className="text-sm mb-4" style={{ color: "#334155" }}>Upload your first lecture notes to get started.</p>
        <button onClick={onNew} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
          Upload Notes
        </button>
      </div>
    </div>
  );
}
