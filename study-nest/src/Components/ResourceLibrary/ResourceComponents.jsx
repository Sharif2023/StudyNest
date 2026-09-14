
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
      <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
         <span className="text-[#66625C] group-hover:text-[#00808C] transition-colors">{icon}</span>
         <span className="text-[10px] font-black text-[#66625C] uppercase tracking-wider group-hover:text-[#00808C] transition-colors">{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white hover:bg-[#001D36]/5 border border-[#001D36]/10 text-[#001D36] pl-20 pr-10 py-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00808C]/20 transition-all cursor-pointer min-w-[140px] shadow-sm"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-white text-[#001D36]">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66625C] group-hover:text-[#00808C] transition-colors pointer-events-none" />
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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.4, ease: "easeOut" } }}
      className="group relative flex flex-col h-full rounded-[2.5rem] bg-white border border-[#001D36]/5 hover:border-[#00808C]/30 p-5 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-[#00808C]/10 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#00808C]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[2rem] bg-[#001D36]/5 mb-6 relative border border-[#001D36]/5 group-hover:border-[#00808C]/20 transition-colors duration-500">
        {isRecording ? (
           <div className="h-full w-full flex items-center justify-center relative">
              <Video className="w-16 h-16 text-[#001D36]/20 group-hover:text-[#00808C]/60 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6" />
           </div>
        ) : isFile && isImage ? (
          <img src={url} alt={item.title} className="h-full w-full object-cover grayscale-[30%] opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-105 group-hover:scale-100" />
        ) : isFile && isPdf ? (
           <div className="h-full w-full flex items-center justify-center relative shadow-inner">
              <FileText className="w-16 h-16 text-[#001D36]/20 group-hover:text-[#00808C]/60 transition-all duration-700 group-hover:scale-110" />
           </div>
        ) : (
           <div className="h-full w-full flex items-center justify-center relative shadow-inner">
              <LinkIcon className="w-16 h-16 text-[#001D36]/20 group-hover:text-[#00808C]/60 transition-all duration-700 group-hover:scale-110 group-hover:rotate-12" />
           </div>
        )}
        
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/50 text-[9px] font-black text-[#00808C] uppercase tracking-widest shadow-sm">{item.kind}</div>
        
        <button
          onClick={onPreview}
          className="absolute inset-4 rounded-[1.5rem] bg-white/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 border border-white"
        >
           <Play className="w-10 h-10 text-[#001D36] fill-[#001D36]" />
        </button>
      </div>

      <div className="px-3 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-2 h-2 rounded-sm bg-[#00808C] rotate-45 group-hover:rotate-90 transition-transform duration-500" />
             <p className="text-[10px] font-black text-[#66625C] uppercase tracking-[0.2em] group-hover:text-[#00808C] transition-colors">{item.course || "GENERAL"}</p>
          </div>
          <h3 className="text-xl font-black text-[#001D36] tracking-tight uppercase mb-2 group-hover:text-[#00808C] transition-colors duration-500 line-clamp-2 leading-tight" title={item.title}>
            {item.title}
          </h3>
          <p className="text-xs text-[#66625C] font-semibold mb-8 line-clamp-2 leading-relaxed">
            {item.description || "No description provided."}
          </p>
      </div>

      <div className="px-2 pb-3 mt-auto flex items-center justify-between border-t border-[#001D36]/5 pt-4 gap-2 group-hover:border-[#00808C]/20 transition-colors duration-500">
        <div className="flex items-center gap-0.5 bg-[#001D36]/5 p-0.5 rounded-full border border-[#001D36]/5 h-9">
           <button onClick={() => onVote(item.id, 1)} className="p-2 text-[#66625C] hover:text-[#00808C] transition-colors"><ArrowUp className="w-4 h-4" /></button>
           <span className="text-[10px] font-black text-[#001D36] px-1 min-w-[20px] text-center">{item.votes}</span>
           <button onClick={() => onVote(item.id, -1)} className="p-2 text-[#66625C] hover:text-[#F18900] transition-colors"><ArrowDown className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => onBookmark(item.id)} 
             className={`rounded-full border transition-all duration-300 h-9 w-9 flex items-center justify-center shadow-sm ${item.bookmarked ? 'bg-[#F18900] border-[#F18900] text-white hover:bg-[#D97A00]' : 'bg-white border-[#001D36]/10 text-[#66625C] hover:text-[#F18900] hover:border-[#F18900]/30'}`}
           >
              <Bookmark className={`w-3.5 h-3.5 ${item.bookmarked ? 'fill-current' : ''}`} />
           </button>
           {isOwner && (
             <button 
               onClick={() => isRecording ? onDelete(item.id) : onDeleteResource(item.id)} 
               className="rounded-full bg-white border border-[#001D36]/10 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-300 h-9 w-9 flex items-center justify-center shadow-sm"
             >
                <Trash2 className="w-3.5 h-3.5" />
             </button>
           )}
           <button onClick={() => onFlag(item.id)} className="rounded-full bg-white border border-[#001D36]/10 text-[#66625C] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-300 h-9 w-9 flex items-center justify-center shadow-sm">
               <Flag className="w-3.5 h-3.5" />
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
      className="grid place-items-center rounded-[3rem] border border-dashed border-[#001D36]/10 bg-white py-32 shadow-sm"
    >
      <div className="text-center relative">
        <div className="mx-auto w-24 h-24 rounded-[2rem] bg-[#001D36]/5 border border-[#001D36]/5 flex items-center justify-center mb-8 shadow-inner relative z-10">
          <Database className="w-12 h-12 text-[#66625C]" />
        </div>
        <h3 className="text-3xl font-display font-black text-[#001D36] uppercase tracking-tighter mb-4 relative z-10">No Resources Found</h3>
        <p className="text-[#66625C] font-black uppercase tracking-[0.2em] text-[11px] mb-12 relative z-10">Library is empty for this criteria.</p>
        <button 
           onClick={onNew}
           className="px-8 py-4 bg-[#00808C] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#00606B] transition-colors shadow-md relative z-10"
        >
           Upload a Resource
        </button>
      </div>
    </motion.div>
  );
}
