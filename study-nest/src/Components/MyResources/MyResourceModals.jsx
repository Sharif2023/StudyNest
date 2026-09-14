
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
          className="absolute inset-0 bg-[#001D36]/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[3rem] bg-[#F0F4F8] border border-[#001D36]/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 py-6 bg-white border-b border-[#001D36]/10">
            <div className="space-y-1 overflow-hidden pr-8">
              <span className="text-[10px] font-black text-[#66625C] uppercase tracking-[0.3em]">Preview</span>
              <h3 className="text-xl font-black text-[#001D36] uppercase tracking-tighter truncate">{file.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-4 rounded-2xl bg-white border border-[#001D36]/10 text-[#66625C] hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm transition-all rotate-0 hover:rotate-90"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-8">
            {image ? (
              <div className="relative group rounded-[2rem] overflow-hidden ring-1 ring-[#001D36]/10 bg-white/50 shadow-inner">
                <img 
                  src={toBackendUrl(previewUrl)} 
                  alt={file.name} 
                  className="max-h-[70vh] w-full object-contain transition-transform duration-700 group-hover:scale-[1.02]" 
                />
              </div>
            ) : pdf ? (
              <div className="rounded-[2rem] overflow-hidden ring-1 ring-[#001D36]/10 bg-white/50 shadow-inner">
                <object data={toBackendUrl(previewUrl) + "#toolbar=1"} type="application/pdf" className="h-[70vh] w-full">
                  <div className="grid place-items-center h-[70vh] text-center p-12 space-y-6">
                    <div className="text-4xl opacity-50">📂</div>
                    <div>
                      <h4 className="text-lg font-black text-[#001D36] uppercase tracking-tighter">Preview Unavailable</h4>
                      <p className="mt-2 text-[10px] font-bold text-[#66625C] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                        This browser cannot natively render this PDF.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <a href={toBackendUrl(previewUrl)} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-xl bg-[#00808C] text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#00606B] transition-all">
                        Open File
                      </a>
                      <a href={cloudinaryDownload(toBackendUrl(file.url))} target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-xl border border-[#001D36]/10 bg-white text-[#001D36] text-[10px] font-black uppercase tracking-widest hover:bg-[#001D36]/5 transition-all shadow-sm">
                        Download
                      </a>
                    </div>
                  </div>
                </object>
              </div>
            ) : (
              <div className="grid place-items-center py-32 rounded-[2.5rem] border border-dashed border-[#001D36]/10 bg-white text-center space-y-8 shadow-sm">
                <div className="w-20 h-20 rounded-[2rem] bg-[#001D36]/5 flex items-center justify-center text-3xl opacity-80 shadow-inner">
                  ⚙️
                </div>
                <div>
                  <h4 className="text-xl font-black text-[#001D36] uppercase tracking-tighter">Preview Unavailable</h4>
                  <p className="mt-2 text-[10px] font-bold text-[#66625C] uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                    Preview is not supported for this file type.
                  </p>
                </div>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-[#00808C] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#00606B] transition-colors shadow-md active:scale-95">
                  Download Resource
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
