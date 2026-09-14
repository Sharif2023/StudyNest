
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
      className="fixed inset-0 z-[100] bg-[#001D36]/40 backdrop-blur-sm p-6 flex items-center justify-center" 
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] bg-[#F0F4F8] border border-[#001D36]/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-10 border-b border-[#001D36]/10 bg-white">
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#8AB100] animate-pulse" />
              <span className="text-[10px] font-black text-[#66625C] uppercase tracking-[0.2em]">Preview</span>
            </div>
            <h3 className="text-2xl font-black text-[#001D36] uppercase tracking-tighter truncate">{file.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="group p-4 rounded-2xl bg-white text-[#66625C] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-300 border border-[#001D36]/10 shadow-sm"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-white/50">
          {isImage ? (
            <img src={file.url} alt={file.name} className="max-h-[60vh] mx-auto rounded-3xl shadow-xl border border-[#001D36]/10" />
          ) : isPdf ? (
            <iframe title="preview" src={file.url} className="w-full h-[60vh] rounded-[2rem] border border-[#001D36]/10 shadow-inner bg-white" />
          ) : (
            <div className="py-20 text-center">
              <Database className="w-20 h-20 text-[#66625C]/30 mx-auto mb-8" />
              <p className="text-[#66625C] font-black uppercase tracking-[0.2em] text-[11px] mb-10">Preview not supported for this file type.</p>
              <a
                href={file.url}
                download
                className="px-12 py-4 bg-[#00808C] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#00606B] transition-colors shadow-md inline-block"
              >
                Download Resource
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
