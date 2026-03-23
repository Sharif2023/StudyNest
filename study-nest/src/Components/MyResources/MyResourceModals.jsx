
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  isPdfLike, 
  isImageUrl, 
  cloudinaryDownload 
} from "./MyResourceUtils";
import { XIcon } from "./MyResourceComponents";
import { toBackendUrl } from "../../apiConfig";

export function PreviewModal({ file, onClose }) {
  const pdf = isPdfLike(file.url, file.mime);
  const image = isImageUrl(file.url, file.mime);
  const previewUrl = file.url;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[3rem] bg-[#08090e] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 py-6 bg-white/[0.02] border-b border-white/5">
            <div className="space-y-1 overflow-hidden pr-8">
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">System.Preview</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter truncate">{file.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-4 rounded-2xl bg-white/5 text-slate-400 hover:bg-white hover:text-black transition-all rotate-0 hover:rotate-90"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-8">
            {image ? (
              <div className="relative group rounded-[2rem] overflow-hidden ring-1 ring-white/10 bg-black/40">
                <img 
                  src={toBackendUrl(previewUrl)} 
                  alt={file.name} 
                  className="max-h-[70vh] w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]" 
                />
              </div>
            ) : pdf ? (
              <div className="rounded-[2rem] overflow-hidden ring-1 ring-white/10 bg-black/40">
                <object data={toBackendUrl(previewUrl) + "#toolbar=1"} type="application/pdf" className="h-[70vh] w-full">
                  <div className="grid place-items-center h-[70vh] text-center p-12 space-y-6">
                    <div className="text-4xl opacity-50">📂</div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tighter">Preview Unavailable</h4>
                      <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                        This environment cannot natively render this PDF payload.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <a href={toBackendUrl(previewUrl)} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                        External Review
                      </a>
                      <a href={cloudinaryDownload(toBackendUrl(file.url))} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-2xl border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                        Secure Download
                      </a>
                    </div>
                  </div>
                </object>
              </div>
            ) : (
              <div className="grid place-items-center py-32 rounded-[2.5rem] border border-dashed border-white/5 bg-white/[0.01] text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700">
                  ⚙️
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">Diagnostic Error</h4>
                  <p className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                    Local system cannot generate a visualization for this asset type.
                  </p>
                </div>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-2xl bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95">
                  Request Source Data
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
