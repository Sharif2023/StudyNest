import React from "react";

export function SaveRecordingModal({
  isOpen,
  onSaveToDevice,
  onSaveToCloud,
  onCancel,
  uploading,
  uploadProgress = 0
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/5 rounded-3xl p-8 max-w-md w-full mx-auto border border-white/10 shadow-2xl">
        <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
          Save Recording
        </h3>
        <p className="text-slate-400 text-sm font-medium mb-8">
          Select preferred storage destination.
        </p>

        <div className="space-y-3">
          <button
            onClick={onSaveToDevice}
            disabled={uploading}
            className="w-full flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/5 transition-all text-white disabled:opacity-50 group hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-bold text-xs">Save to device</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Local file export</div>
              </div>
            </div>
          </button>

          <button
            onClick={onSaveToCloud}
            disabled={uploading}
            className="w-full flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-zinc-800 transition-all disabled:opacity-50 group hover:shadow-xl hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-bold text-xs">StudyNest Cloud</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Online storage</div>
              </div>
            </div>
            {uploading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </button>
          {uploading && (
            <div className="pt-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-300 transition-[width] duration-300"
                  style={{ width: `${Math.max(1, Math.min(100, uploadProgress))}%` }}
                />
              </div>
              <div className="mt-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {Math.round(uploadProgress)}%
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold uppercase tracking-wider text-[11px] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
