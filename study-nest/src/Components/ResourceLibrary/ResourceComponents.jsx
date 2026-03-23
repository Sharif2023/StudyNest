
import React from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Trash2, 
  Flag, 
  Bookmark, 
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Play,
  Database
} from "lucide-react";

export const FiltersIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
  </svg>
);

export function Select({ label, value, onChange, options, icon }) {
  return (
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
         <span className="text-white opacity-40 group-hover:opacity-100 transition-opacity">{icon}</span>
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-white transition-colors">{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] border border-white/10 text-white pl-24 pr-10 py-4 rounded-[1.5rem] text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all cursor-pointer min-w-[160px] shadow-sm"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[rgba(255,255,255,0.02)] text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors pointer-events-none" />
    </div>
  );
}

export function ResourceCard({
  item,
  index,
  onPreview,
  onVote,
  onBookmark,
  onFlag,
  onDelete,
  onDeleteResource,
  currentUserId,
}) {
  const isFile = item.src_type === "file";
  const isRecording = item.kind === "recording";
  const url = item.url || "";
  const isPdf = url.toLowerCase().endsWith(".pdf");
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  const currentUser =
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.name ||
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.name ||
    "Unknown";

  const isOwnerById = Number(item.user_id || 0) === Number(currentUserId || -1);
  const isOwnerByName = item.author === currentUser;
  const isOwner = isOwnerById || isOwnerByName;

  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -12, transition: { duration: 0.5 } }}
      className="group relative flex flex-col h-full rounded-[2.5rem] bg-[rgba(255,255,255,0.02)] border border-white/10 hover:border-cyan-500/30 p-5 transition-all duration-700 shadow-xl overflow-hidden glass-card"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-900/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[2rem] bg-[rgba(255,255,255,0.03)] mb-6 relative border border-white/5">
        {isRecording ? (
           <div className="h-full w-full flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/5 via-transparent to-transparent" />
              <Video className="w-16 h-16 text-slate-400 group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6" />
           </div>
        ) : isFile && isImage ? (
          <img src={url} alt={item.title} className="h-full w-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-100" />
        ) : isFile && isPdf ? (
           <div className="h-full w-full flex items-center justify-center relative shadow-inner">
              <FileText className="w-16 h-16 text-slate-400 group-hover:text-white transition-all duration-700 group-hover:scale-110" />
           </div>
        ) : (
           <div className="h-full w-full flex items-center justify-center relative shadow-inner">
              <LinkIcon className="w-16 h-16 text-slate-400 group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:rotate-12" />
           </div>
        )}
        
        <div className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.1)]/90 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest ">{item.kind}</div>
        
        <button
          onClick={onPreview}
          className="absolute inset-4 rounded-[1.5rem] bg-[rgba(255,255,255,0.1)]/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 border border-white/10"
        >
           <Play className="w-10 h-10 text-white fill-white" />
        </button>
      </div>

      <div className="px-3 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.1)] shadow-[0_0_10px_rgba(0,0,0,0.1)]" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ">{item.course || "GENERAL"}</p>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-4 group-hover:text-slate-200 transition-all duration-700 line-clamp-2" title={item.title}>
            {item.title}
          </h3>
          <p className="text-xs text-slate-300 font-medium mb-8 line-clamp-2 leading-relaxed">
            {item.description || "No neural description synchronized for this node archive."}
          </p>
      </div>

      <div className="px-3 pb-3 mt-auto flex items-center justify-between border-t border-white/5 pt-6 gap-2">
        <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.03)] p-1 rounded-full border border-white/5">
           <button onClick={() => onVote(item.id, 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ArrowUp className="w-4 h-4" /></button>
           <span className="text-[11px] font-black text-white px-1 min-w-[20px] text-center ">{item.votes}</span>
           <button onClick={() => onVote(item.id, -1)} className="p-2 text-slate-400 hover:text-white transition-colors"><ArrowDown className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-1">
           <button 
             onClick={() => onBookmark(item.id)} 
             className={`p-3 rounded-full border transition-all duration-500 ${item.bookmarked ? 'bg-[rgba(255,255,255,0.1)] border-white/20 text-white shadow-xl' : 'bg-[rgba(255,255,255,0.03)] border-white/5 text-slate-400 hover:text-white'}`}
           >
              <Bookmark className={`w-4 h-4 ${item.bookmarked ? 'fill-current' : ''}`} />
           </button>
           {isOwner && (
             <button 
               onClick={() => isRecording ? onDelete(item.id) : onDeleteResource(item.id)} 
               className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-500"
             >
                <Trash2 className="w-4 h-4" />
             </button>
           )}
           <button onClick={() => onFlag(item.id)} className="p-3 rounded-full bg-[rgba(255,255,255,0.03)] border border-white/5 text-slate-400 hover:text-white transition-all duration-500">
               <Flag className="w-4 h-4" />
           </button>
        </div>
      </div>
    </motion.article>
  );
}

export function EmptyState({ onNew }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center rounded-[4rem] border border-dashed border-white/10 bg-white/[0.02] py-32 shadow-xl"
    >
      <div className="text-center relative">
        <div className="absolute inset-0 -m-20 bg-[rgba(255,255,255,0.1)]/5 blur-[100px] rounded-full" />
        <div className="mx-auto w-24 h-24 rounded-[2rem] bg-[rgba(255,255,255,0.02)] border border-white/10 flex items-center justify-center mb-10 shadow-xl relative z-10">
          <Database className="w-12 h-12 text-zinc-100" />
        </div>
        <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter mb-4 relative z-10">Archive Empty</h3>
        <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[11px] mb-12 relative z-10">No Resources Found</p>
        <button 
           onClick={onNew}
           className="btn-outline px-12 py-5 text-[10px] font-black uppercase tracking-[0.5em] relative z-10"
        >
           Initiate Node Integration
        </button>
      </div>
    </motion.div>
  );
}
