import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, PlayCircle, Database } from "lucide-react";

export function RoomCard({ room, index }) {
  const title = room.course_title || room.title;
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -12, transition: { duration: 0.5 } }}
      className="group relative flex flex-col h-full rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-zinc-900 p-5 transition-all duration-700 shadow-xl overflow-hidden glass-card"
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-zinc-900/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[2rem] bg-white/5 mb-6 relative border border-white/5">
        {room.course_thumbnail ? (
          <img src={room.course_thumbnail} alt="" className="h-full w-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-100" />
        ) : (
          <div className="h-full w-full flex items-center justify-center relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/[0.03] via-transparent to-transparent" />
             <Video className="w-16 h-16 text-slate-400 group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:rotate-12" />
          </div>
        )}
        <div className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider animate-pulse">Live Now</div>
      </div>

      <div className="px-3 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]" />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ">{room.course || "Study Hub"}</p>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight mb-2 group-hover:text-cyan-400 transition-all duration-700" title={title}>
            {title}
          </h3>
          <p className="text-xs text-slate-400 font-medium mb-8 line-clamp-2 leading-relaxed">
            Current topic: <span className="text-white font-bold">{room.title}</span>
          </p>
      </div>

      <div className="px-3 pb-3 mt-auto flex items-center justify-between border-t border-white/5 pt-6">
        <div className="flex items-center gap-3">
           <div className="flex -space-x-3">
              {[1,2].map(u => (
                <div key={u} className="w-9 h-9 rounded-[1rem] bg-white/5 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-lg ring-1 ring-zinc-100">S</div>
              ))}
           </div>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ">{room.participants} Online</span>
        </div>
        <Link 
          to={`/rooms/${room.id}`} 
          className="w-14 h-14 rounded-full bg-white/10 border border-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800 transition-all duration-700 group/join shadow-xl"
        >
          <PlayCircle className="w-8 h-8 group-hover/join:scale-110 transition-transform" />
        </Link>
      </div>
    </motion.article>
  );
}

export function EmptyRooms({ navigate }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center rounded-[4rem] border-2 border-dashed border-white/10 bg-white/5 py-32 shadow-xl"
    >
      <div className="text-center relative">
        <div className="absolute inset-0 -m-20 bg-black/50 blur-[100px] rounded-full" />
        <div className="mx-auto w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-10 shadow-xl relative z-10">
          <Database className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-3xl font-bold text-white tracking-tight mb-4 relative z-10">No Rooms Available</h3>
        <p className="text-slate-400 font-semibold uppercase tracking-widest text-[11px] mb-12 relative z-10">No active rooms at the moment</p>
        <button type="button" onClick={() => navigate("/rooms/newform")} className="btn-outline px-12 py-5 text-[11px] font-bold uppercase tracking-wider relative z-10">Create a Room</button>
      </div>
    </motion.div>
  );
}
