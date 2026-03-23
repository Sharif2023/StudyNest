
import React from "react";
import { motion } from "framer-motion";
import { FileText, X, Database } from "lucide-react";

export function PreviewModal({ file, onClose }) {
  const isPdf = file.mime?.includes("pdf");
  const isImage = file.mime?.startsWith("image/");
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl p-6 flex items-center justify-center" 
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] bg-[rgba(255,255,255,0.02)] border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-10 border-b border-white/5 bg-white/[0.01]">
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Resource.Preview</span>
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter truncate">{file.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="group p-4 rounded-2xl bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all duration-500 border border-white/5"
          >
            <X className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {isImage ? (
            <img src={file.url} alt={file.name} className="max-h-[60vh] mx-auto rounded-3xl shadow-2xl border border-white/5" />
          ) : isPdf ? (
            <iframe title="preview" src={file.url} className="w-full h-[60vh] rounded-[2rem] border border-white/5 shadow-xl" />
          ) : (
            <div className="py-20 text-center">
              <Database className="w-20 h-20 text-zinc-100 mx-auto mb-8" />
              <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[11px] mb-10">Neural Interface Not Support Direct Uplink</p>
              <a
                href={file.url}
                download
                className="btn-primary px-12 py-5 text-[10px] font-black uppercase tracking-[0.5em] rounded-[2rem]"
              >
                Download Archive
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
