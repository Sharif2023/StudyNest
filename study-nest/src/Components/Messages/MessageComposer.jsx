import React from "react";
import { Paperclip, Mic, Send } from "lucide-react";
import { fmtTime, getExt } from "./MessageUtils";
import { FileChip } from "./MessageComponents";

export default function MessageComposer({ 
    isRecording, 
    recMs, 
    file, 
    setFile, 
    text, 
    setText, 
    sendMessage, 
    startRecording, 
    stopRecording, 
    fileInputRef, 
    recError 
}) {
    return (
        <div className="p-8 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(8,9,14,0.4)" }}>
            <div className="max-w-5xl mx-auto">
                <div className={`relative flex items-end gap-4 p-3 rounded-[2rem] transition-all focus-within:shadow-[0_0_30px_rgba(6,182,212,0.1)] ${isRecording ? 'bg-rose-500/5' : 'bg-white/[0.03] border border-white/[0.05]'}`}>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:text-cyan-500 transition-all">
                        <Paperclip size={18} />
                    </button>

                    <button onClick={() => isRecording ? stopRecording() : startRecording()} 
                        className={`p-3.5 rounded-2xl border transition-all ${isRecording ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'bg-white/5 border-white/10 text-slate-500 hover:text-purple-500'}`}>
                        <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
                    </button>

                    <div className="flex-1 min-h-[48px] px-2 flex flex-col justify-center">
                        {isRecording ? (
                            <div className="text-xs font-bold text-rose-500 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                Recording voice... {fmtTime(recMs)}
                            </div>
                        ) : (
                            <>
                                {file && (
                                    <div className="mb-2 flex items-center justify-between p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                                        <FileChip name={file.name} ext={getExt(file.name)} />
                                        <button onClick={() => setFile(null)} className="p-1 hover:text-rose-500">✕</button>
                                    </div>
                                )}
                                <textarea
                                    className="w-full bg-transparent border-none outline-none text-sm font-medium py-3 px-2 resize-none max-h-32 placeholder:text-slate-700"
                                    placeholder="Type a message..."
                                    rows={1}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                                />
                            </>
                        )}
                    </div>

                    <button onClick={() => sendMessage()} disabled={!text.trim() && !file}
                        className="p-4 px-8 rounded-2xl bg-gradient-brand text-xs font-bold text-white shadow-xl shadow-cyan-500/20 hover:scale-[1.05] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale">
                        Send
                    </button>
                </div>
                {recError && <div className="mt-3 text-[10px] font-bold text-rose-500 px-6">{recError}</div>}
            </div>
        </div>
    );
}
