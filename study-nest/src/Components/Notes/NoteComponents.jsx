
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
    <label className="inline-flex items-center gap-2 text-xs font-semibold flex-shrink-0 text-[#66625C]">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer transition-all duration-300 bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] focus:border-[#00808C]/40 focus:bg-white"
      >
        {options.map((o) => (<option key={o} value={o} className="bg-white">{o}</option>))}
      </select>
    </label>
  );
}

export function NoteCard({ note, onPreview, onDelete, currentUserId }) {
  const isPdf = note.file_url.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(note.file_url);
  const isOwner = currentUserId && Number(note.user_id) === Number(currentUserId);

  return (
    <article className="group flex h-full flex-col rounded-2xl p-5 transition-all duration-300 cursor-pointer relative bg-white border border-[#001D36]/10 hover:border-[#00808C]/30 hover:shadow-md"
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

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl mb-4 bg-[#F0F4F8]" onClick={() => onPreview({url: note.file_url, mime: isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'application/octet-stream', name: note.title})}>
        {isImage ? (
          <img src={toBackendUrl(note.file_url)} alt={note.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center">
            <FileIcon className="h-10 w-10 text-[#66625C]" />
            <span className="mt-2 text-xs font-semibold text-[#66625C]">{isPdf ? "PDF Document" : "File"}</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isPdf ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-[#00808C]/10 text-[#00808C] border border-[#00808C]/20"}`}>
          {isPdf ? "PDF" : isImage ? "IMG" : "FILE"}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold leading-snug mb-1 text-[#001D36] transition-colors group-hover:text-[#00808C]">{note.title}</h3>
        <p className="text-xs mb-2 text-[#66625C]">{note.course} · {note.semester}</p>
        <p className="text-xs line-clamp-2 text-[#66625C]">{note.description}</p>
      </div>

      {note.username && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold bg-[#001D36]/10 text-[#001D36]">
            {note.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-[#66625C]">by {note.username}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8AB100]/10 border border-[#8AB100]/20 text-[#6B8A00]">{tag}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[#001D36]/10 pt-4">
        <a href={toBackendUrl(note.file_url)} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 px-3 rounded-xl text-center text-xs font-bold transition-all duration-200 bg-[#001D36] text-white hover:bg-[#001D36]/90 shadow-sm">
          Open
        </a>
        <a href={toBackendUrl(note.file_url)} download
          className="flex-1 py-2 px-3 rounded-xl text-center text-xs font-bold transition-all duration-200 bg-transparent border border-[#001D36]/10 text-[#66625C] hover:bg-[#001D36]/5">
          Download
        </a>
      </div>
    </article>
  );
}

export function EmptyState({ onNew }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-[#001D36]/20 bg-white/80 py-20">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[#00808C]/10 text-[#00808C]">
          <FileIcon className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold mb-2 text-[#001D36]">No notes yet</h3>
        <p className="text-sm mb-4 text-[#66625C]">Upload your first lecture notes to get started.</p>
        <button onClick={onNew} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 bg-[#001D36] text-white hover:bg-[#001D36]/90 shadow-sm">
          Upload Notes
        </button>
      </div>
    </div>
  );
}
