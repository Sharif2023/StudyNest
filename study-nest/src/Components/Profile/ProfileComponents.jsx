import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { toBackendUrl } from "../../apiConfig";

export function ProfilePicture({ url, name, size = 40, className = "" }) {
  const [error, setError] = useState(false);
  const imageUrl = !error && url ? toBackendUrl(url) : null;

  return imageUrl ? (
    <img
      src={imageUrl}
      alt={name}
      className={`rounded-full object-cover ring-2 ring-white shadow-xl ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  ) : (
    <div
      className={`grid place-items-center rounded-full bg-[rgba(255,255,255,0.05)] text-white font-black ring-2 ring-white shadow-xl ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {String(name || "U").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function InputGroup({ label, value, onChange, disabled, icon, placeholder }) {
  return (
    <div className="space-y-3 group">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-white transition-colors">{label}</label>
      <div className="relative">
         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-all">{icon}</div>
         <input
           value={value}
           placeholder={placeholder}
           onChange={(e) => onChange?.(e.target.value)}
           disabled={disabled}
           className={`w-full bg-[rgba(255,255,255,0.03)] border border-white/10 text-white pl-14 pr-6 py-4 rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all shadow-xl placeholder:text-slate-400 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
         />
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon, trend }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] p-8 transition-all hover:bg-white/[0.05] hover:border-white/10 shadow-lg"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            <ChevronRight className="w-3 h-3 -rotate-90" />
            {trend}
          </div>
        )}
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</div>
        <div className="text-4xl font-black text-white tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
}

export function OptionToggle({ label, desc, checked, onChange, disabled }) {
  return (
    <div className={`group flex items-center justify-between gap-6 p-6 rounded-2xl border transition-all ${checked ? 'bg-indigo-500/[0.04] border-indigo-500/20' : 'bg-white/[0.01] border-white/5'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/10'}`}>
       <div>
          <p className="text-sm font-bold text-white mb-0.5 group-hover:text-indigo-300 transition-colors">{label}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{desc}</p>
       </div>
       <button 
         onClick={() => !disabled && onChange(!checked)}
         className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${checked ? 'bg-indigo-600' : 'bg-white/10'}`}
       >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 ${checked ? 'left-8' : 'left-1'}`} />
       </button>
    </div>
  );
}
