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
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  ) : (
    <div
      className={`grid place-items-center rounded-full bg-[#00808C] text-white font-black ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {String(name || "U").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function InputGroup({ label, value, onChange, disabled, icon, placeholder }) {
  return (
    <div className="space-y-2 group">
      <label className="block text-[10px] font-black text-[#66625C] uppercase tracking-widest ml-2 group-focus-within:text-[#00808C] transition-colors">{label}</label>
      <div className="relative">
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#66625C] group-focus-within:text-[#00808C] transition-colors">{icon}</div>
         <input
           value={value}
           placeholder={placeholder}
           onChange={(e) => onChange?.(e.target.value)}
           disabled={disabled}
           className={`w-full bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] pl-12 pr-5 py-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00808C]/30 focus:border-[#00808C]/40 transition-all placeholder:text-[#66625C]/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
         />
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon, trend }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-3xl border border-[#001D36]/10 bg-white p-8 transition-all hover:border-[#00808C]/30 hover:shadow-md shadow-sm"
    >
      <div className="flex items-center justify-between mb-6 h-12">
        <div className="p-3.5 rounded-2xl bg-[#00808C]/10 text-[#00808C] flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8AB100]/10 border border-[#8AB100]/20 text-[10px] font-bold text-[#8AB100] uppercase tracking-wider">
            <ChevronRight className="w-3 h-3 -rotate-90" />
            {trend}
          </div>
        )}
      </div>
      <div>
        <div className="text-[11px] font-bold text-[#66625C] uppercase tracking-[0.2em] mb-2">{label}</div>
        <div className="text-4xl font-black text-[#001D36] tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
}

export function OptionToggle({ label, desc, checked, onChange, disabled }) {
  return (
    <div className={`group flex items-center justify-between gap-6 p-5 rounded-2xl border transition-all ${checked ? 'bg-[#00808C]/5 border-[#00808C]/20' : 'bg-[#F0F4F8] border-[#001D36]/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#00808C]/30'}`}>
       <div>
          <p className="text-sm font-bold text-[#001D36] mb-0.5">{label}</p>
          <p className="text-[10px] font-bold text-[#66625C] uppercase tracking-widest">{desc}</p>
       </div>
       <button 
         onClick={() => !disabled && onChange(!checked)}
         className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner flex-shrink-0 ${checked ? 'bg-[#00808C]' : 'bg-[#001D36]/20'}`}
       >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${checked ? 'left-7' : 'left-1'}`} />
       </button>
    </div>
  );
}
