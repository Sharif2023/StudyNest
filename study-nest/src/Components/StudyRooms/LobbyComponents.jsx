import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, PlayCircle, Database } from "lucide-react";

export function RoomCard({ room, index }) {
  const title = room.course_title || room.title;
  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.4, ease: "easeOut" } }}
      className="group relative flex flex-col h-full rounded-[2.5rem] bg-white border border-[#001D36]/5 hover:border-[#00808C]/30 p-5 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-[#00808C]/10 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#00808C]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[2rem] bg-[#001D36]/5 mb-6 relative border border-[#001D36]/5 group-hover:border-[#00808C]/20 transition-colors duration-500">
        {room.course_thumbnail ? (
          <img src={room.course_thumbnail} alt="" className="h-full w-full object-cover grayscale-[30%] opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-105 group-hover:scale-100" />
        ) : (
          <div className="h-full w-full flex items-center justify-center relative bg-[#001D36]/5 group-hover:bg-[#00808C]/5 transition-colors duration-500">
             <Video className="w-16 h-16 text-[#001D36]/20 group-hover:text-[#00808C]/60 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6" />
          </div>
        )}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/50 text-[9px] font-black text-[#F18900] uppercase tracking-widest shadow-sm flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-[#F18900] animate-pulse" />
           Live Now
        </div>
      </div>

      <div className="px-3 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-2 h-2 rounded-sm bg-[#00808C] rotate-45 group-hover:rotate-90 transition-transform duration-500" />
             <p className="text-[10px] font-black text-[#66625C] uppercase tracking-widest group-hover:text-[#00808C] transition-colors">{room.course || "Study Hub"}</p>
          </div>
          <h3 className="text-2xl font-black text-[#001D36] tracking-tight mb-2 group-hover:text-[#00808C] transition-colors duration-500 leading-tight" title={title}>
            {title}
          </h3>
          <p className="text-xs text-[#66625C] font-semibold mb-8 line-clamp-2 leading-relaxed">
            Current topic: <span className="text-[#001D36] font-bold bg-[#001D36]/5 px-1.5 py-0.5 rounded-md">{room.title}</span>
          </p>
      </div>

      <div className="px-3 pb-3 mt-auto flex items-center justify-between border-t border-[#001D36]/5 pt-5 group-hover:border-[#00808C]/20 transition-colors duration-500">
        <div className="flex items-center gap-3">
           <div className="flex -space-x-3 group-hover:-space-x-2 transition-all duration-500">
              {[1,2].map(u => (
                <div key={u} className="w-9 h-9 rounded-full bg-[#F0F4F8] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#001D36] shadow-sm">S</div>
              ))}
           </div>
           <span className="text-[10px] font-black text-[#66625C] uppercase tracking-widest bg-[#001D36]/5 px-2 py-1 rounded-full group-hover:bg-[#00808C]/10 group-hover:text-[#00808C] transition-colors">{room.participants} Online</span>
        </div>
        <Link 
          to={`/rooms/${room.id}`} 
          className="w-14 h-14 rounded-full bg-white border border-[#001D36]/10 flex items-center justify-center text-[#001D36] group-hover:bg-[#F18900] group-hover:border-[#F18900] group-hover:text-white transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-[#F18900]/30 transform group-hover:scale-105"
        >
          <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
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
      className="grid place-items-center rounded-[4rem] border-2 border-dashed border-[#001D36]/10 bg-white py-32 shadow-sm"
    >
      <div className="text-center relative">
        <div className="mx-auto w-24 h-24 rounded-[2rem] bg-[#001D36]/5 border border-[#001D36]/10 flex items-center justify-center mb-10 relative z-10">
          <Database className="w-12 h-12 text-[#001D36]/40" />
        </div>
        <h3 className="text-3xl font-bold text-[#001D36] tracking-tight mb-4 relative z-10">No Rooms Available</h3>
        <p className="text-[#66625C] font-bold uppercase tracking-widest text-[11px] mb-12 relative z-10">No active rooms at the moment</p>
        <button type="button" onClick={() => navigate("/rooms/newform")} className="px-12 py-5 rounded-[2rem] bg-[#001D36] text-white text-[11px] font-bold uppercase tracking-wider relative z-10 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          Create a Room
        </button>
      </div>
    </motion.div>
  );
}
