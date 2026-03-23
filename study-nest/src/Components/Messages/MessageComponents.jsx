import React from "react";
import { Mic, Paperclip } from "lucide-react";

export const MicIcon = ({ className = "h-5 w-5" }) => <Mic className={className} />;
export const PaperclipIcon = ({ className = "h-5 w-5" }) => <Paperclip className={className} />;

export const fileBadgeForExt = (ext) => {
    const e = (ext || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(e)) return { label: "IMG", color: "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30" };
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(e)) return { label: "AUD", color: "bg-violet-600/20 text-violet-300 border-violet-500/30" };
    if (["mp4", "webm", "ogg", "mov", "mkv", "m4v"].includes(e)) return { label: "VID", color: "bg-indigo-600/20 text-indigo-300 border-indigo-500/30" };
    if (e === "pdf") return { label: "PDF", color: "bg-red-600/20 text-red-300 border-red-500/30" };
    return { label: "FILE", color: "bg-slate-600/20 text-slate-300 border-slate-500/30" };
};

export const FileChip = ({ name, ext, className = "" }) => {
    const { label, color } = fileBadgeForExt(ext);
    return (
        <span className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${color} ${className}`}>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-black/20 text-[10px] font-semibold">
                {label}
            </span>
            <span className="truncate max-w-[220px]">{name}</span>
        </span>
    );
};
