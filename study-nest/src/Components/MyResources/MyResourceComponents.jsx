
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  isPdfLike, 
  isImageUrl, 
  cloudinaryDownload, 
  safeDate 
} from "./MyResourceUtils";
import { toBackendUrl } from "../../apiConfig";

/* -------------------- Icons (inline SVG) -------------------- */
export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" />
    </svg>
  );
}

export function FileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" {...props}>
      <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z" />
    </svg>
  );
}

export function VideoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" {...props}>
      <path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z" />
    </svg>
  );
}

/* -------------------- Components -------------------- */
export function Select({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-3 text-[11px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-xl cursor-pointer hover:bg-white/5 transition-all"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#08090e] text-white">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Card({
  item,
  tab,
  onPreview,
  onDeleteRecording,
  onDeleteResource,
  onShareRecording,
  onShareResource,
  currentUser,
  currentUserId,
}) {
  const isRecording = tab === "recordings";
  const url = item.url || "";
  const pdf = isPdfLike(url, item.mime);
  const image = isImageUrl(url, item.mime);

  const isOwnerByName = item.author === currentUser || item.owner === currentUser;
  const isOwnerById = Number(item.user_id || 0) === Number(currentUserId || -1);
  const isOwner = isOwnerById || isOwnerByName;

  const isSharedFlag = item.shared === true || item.visibility === "public";

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -12 }}
      className="group relative flex flex-col rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden transition-all duration-700 hover:bg-white/[0.04] hover:border-cyan-500/30 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/[0.02] grid place-items-center">
        {isRecording ? (
          <div className="flex flex-col items-center text-slate-500 group-hover:text-cyan-400 transition-colors duration-500">
            <VideoIcon className="h-12 w-12" />
            <span className="mt-3 text-[10px] font-black uppercase tracking-[0.2em]">Session Archive</span>
          </div>
        ) : image ? (
          <img src={url} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : pdf ? (
          <div className="flex flex-col items-center text-slate-500 group-hover:text-rose-400 transition-colors duration-500">
            <FileIcon className="h-12 w-12" />
            <span className="mt-3 text-[10px] font-black uppercase tracking-[0.2em]">Document</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-500 group-hover:text-indigo-400 transition-colors duration-500">
            <FileIcon className="h-12 w-12" />
            <span className="mt-3 text-[10px] font-black uppercase tracking-[0.2em]">{item.src_type === "link" ? "External link" : "Data file"}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center p-6">
          <button 
            onClick={onPreview} 
            className="px-10 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-transform"
          >
            {isRecording ? "Replay Session" : "Inspect Asset"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white tracking-tight line-clamp-1 group-hover:text-cyan-400 transition-colors" title={item.title}>
            {item.title || "(Untitled Asset)"}
          </h3>
          {item.description && <p className="line-clamp-2 text-xs font-medium text-slate-400 leading-relaxed">{item.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.kind && <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.kind}</span>}
          {item.course && <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/10 text-[9px] font-black text-cyan-400 uppercase tracking-widest">{item.course}</span>}
          {item.semester && <span className="px-3 py-1 rounded-xl bg-violet-500/10 border border-violet-500/10 text-[9px] font-black text-violet-400 uppercase tracking-widest">{item.semester}</span>}
        </div>

        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-white uppercase">
              {String(item.author || "U").charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">{item.author || "You"}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">{safeDate(item.created_at || item.updated_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRecording && isOwner && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onShareRecording(item); }} 
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteRecording(item); }} 
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
            {!isRecording && isOwner && (
              <div className="flex items-center gap-2">
                {onShareResource && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onShareResource(item); }} 
                    disabled={isSharedFlag === true}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSharedFlag 
                        ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed" 
                        : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105"
                    }`}
                  >
                    {isSharedFlag ? "Shared" : "Publish"}
                  </button>
                )}
                {onDeleteResource && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteResource(item); }} 
                    className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all font-black"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            )}
            {!isRecording && url && (
              <a 
                onClick={(e) => e.stopPropagation()}
                href={isPdfLike(url, item.mime) ? cloudinaryDownload(toBackendUrl(url)) : toBackendUrl(url)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:bg-white hover:text-black transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyState({ tab }) {
  const label = tab === "resources" ? "Vault Empty" : "No Archives";
  return (
    <div className="grid place-items-center py-32 rounded-[3.5rem] border border-dashed border-white/10 bg-white/[0.02] relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700">
          {tab === "resources" ? "📚" : "🎬"}
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">{label}</h3>
          <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
            {tab === "resources" 
              ? "You haven't added any intellectual assets to your personal vault yet." 
              : "Session recordings will automatically synchronize here once they are processed."}
          </p>
        </div>
        {tab === "resources" && (
          <Link to="/resources" className="inline-flex rounded-2xl bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95">
            Discover Library
          </Link>
        )}
      </div>
    </div>
  );
}
