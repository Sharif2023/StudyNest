// src/pages/GroupChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";
import apiClient, { API_BASE } from "../apiConfig";
import { 
  MessageSquare, 
  Paperclip, 
  Mic, 
  Send, 
  X, 
  Play, 
  FileText, 
  Video as VideoIcon, 
  Music,
  Users,
  Image as ImageIcon,
  Link as LinkIcon,
  MoreVertical,
  LogOut,
  ChevronRight
} from "lucide-react";

const POLL_MS = 2500;

/* ---------- URL + type helpers (Synced with Messages.jsx) ---------- */
const absUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

const getExt = (url = "") => {
    const s = String(url).toLowerCase();
    const q = s.split("?")[0];
    const i = q.lastIndexOf(".");
    return i >= 0 ? q.slice(i + 1) : "";
};

const isImage = (url) => /^(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(getExt(url));
const isAudio = (url) => /^(mp3|wav|ogg|m4a|aac|flac)$/.test(getExt(url));
const isVideo = (url) => /^(mp4|webm|ogg|mov|mkv|m4v)$/.test(getExt(url));
const isPDF = (url) => getExt(url) === "pdf";

/* ---------- Filename prettifiers ---------- */
const fileBaseName = (p) => {
    if (!p) return "attachment";
    try {
        const u = new URL(absUrl(p));
        const seg = u.pathname.split("/").pop() || "attachment";
        return decodeURIComponent(seg);
    } catch {
        const seg = String(p).split("?")[0].split("/").pop() || "attachment";
        return decodeURIComponent(seg);
    }
};

const prettyName = (p) => {
    const base = fileBaseName(p);
    const m = base.match(/^(.+?)_[0-9a-f]{8,}\.(\w+)$/i);
    if (m) return `${m[1]}.${m[2]}`;
    return base;
};

// mm:ss
const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
};

/* ---------- UI Components ---------- */
const fileBadgeForExt = (ext) => {
    const e = (ext || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(e)) return { label: "IMG", color: "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30" };
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(e)) return { label: "AUD", color: "bg-violet-600/20 text-violet-300 border-violet-500/30" };
    if (["mp4", "webm", "ogg", "mov", "mkv", "m4v"].includes(e)) return { label: "VID", color: "bg-indigo-600/20 text-indigo-300 border-indigo-500/30" };
    if (e === "pdf") return { label: "PDF", color: "bg-red-600/20 text-red-300 border-red-500/30" };
    if (["ppt", "pptx"].includes(e)) return { label: "PPT", color: "bg-orange-600/20 text-orange-300 border-orange-500/30" };
    if (["doc", "docx"].includes(e)) return { label: "DOC", color: "bg-blue-600/20 text-blue-300 border-blue-500/30" };
    if (["xls", "xlsx", "csv"].includes(e)) return { label: "XLS", color: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" };
    if (["zip", "rar", "7z"].includes(e)) return { label: "ZIP", color: "bg-amber-600/20 text-amber-300 border-amber-500/30" };
    return { label: "FILE", color: "bg-slate-600/20 text-slate-300 border-slate-500/30" };
};

const FileChip = ({ name, ext, className = "" }) => {
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

// ---- MediaRecorder helpers ----
const AUDIO_MIME_CANDIDATES = [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
    "audio/webm",
];
const pickAudioMime = () => {
    if (typeof MediaRecorder === "undefined") return "";
    for (const m of AUDIO_MIME_CANDIDATES) {
        try { if (MediaRecorder.isTypeSupported?.(m)) return m; } catch { }
    }
    return "";
};
const extFromMime = (m) =>
    m?.includes("webm") ? "webm" :
        m?.includes("ogg") ? "ogg" :
            m?.includes("mp4") ? "m4a" : "webm";


export default function GroupChat() {
    const { id } = useParams(); // group_id
    const [messages, setMessages] = useState([]);
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const listRef = useRef(null);
    const [loading, setLoading] = useState(false);
    
    // Voice/Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recMs, setRecMs] = useState(0);
    const [recError, setRecError] = useState("");
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recChunksRef = useRef([]);
    const recTimerRef = useRef(null);
    const recMimeRef = useRef("");
    const recCancelledRef = useRef(false);

    // Sidebar/Menu
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeTab, setActiveTab] = useState("members");

    // Logged-in user
    const stored = localStorage.getItem("studynest.auth");
    const me = stored ? JSON.parse(stored) : null;
    const myUserId = me?.id;

    const loadMessages = async () => {
        try {
            const res = await apiClient.get("group_api.php", {
                params: { action: "messages", group_id: id }
            });
            const j = res.data;
            if (j.ok) setMessages(j.messages || []);
        } catch (e) {
            console.warn("loadMessages failed", e);
        }
    };

    const loadGroupMeta = async () => {
        try {
            const res = await apiClient.get("group_api.php", {
                params: { action: "group_meta", group_id: id }
            });
            const j = res.data;
            if (j.ok) setGroup(j.group);
        } catch (e) { console.warn(e); }
    };

    const loadMembers = async () => {
        try {
            const res = await apiClient.get("group_api.php", {
                params: { action: "members", group_id: id }
            });
            const j = res.data;
            if (j.ok && Array.isArray(j.members)) {
                setMembers(j.members);
            }
        } catch (_) { }
    };

    useEffect(() => {
        loadGroupMeta();
        loadMembers();
        loadMessages();
        const t = setInterval(loadMessages, POLL_MS);
        return () => clearInterval(t);
    }, [id]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    /* ---------- Actions ---------- */
    const sendMessage = async () => {
        if (!text.trim() && !file) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("group_id", String(id));
            fd.append("user_id", String(myUserId));
            if (text.trim()) fd.append("message", text.trim());
            if (file) fd.append("attachment", file);

            const res = await apiClient.post("group_api.php?action=send_message", fd);
            if (res.data.ok) {
                setText("");
                setFile(null);
                loadMessages();
            }
        } catch (e) { console.warn(e); }
        finally { setLoading(false); }
    };

    const startRecording = async () => {
        setRecError("");
        if (!navigator.mediaDevices?.getUserMedia) {
            setRecError("Recording not supported.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const mime = pickAudioMime();
            recMimeRef.current = mime;
            const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            mediaRecorderRef.current = mr;
            recChunksRef.current = [];
            recCancelledRef.current = false;

            mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
            mr.onstop = async () => {
                clearInterval(recTimerRef.current);
                (mediaStreamRef.current?.getTracks() || []).forEach(t => t.stop());
                setIsRecording(false);
                if (recCancelledRef.current) { setRecMs(0); return; }
                
                const blob = new Blob(recChunksRef.current, { type: recMimeRef.current || "audio/webm" });
                const fd = new FormData();
                fd.append("group_id", String(id));
                fd.append("user_id", String(myUserId));
                fd.append("attachment", new File([blob], `voice_${Date.now()}.${extFromMime(recMimeRef.current)}`));
                
                await apiClient.post("group_api.php?action=send_message", fd);
                setRecMs(0);
                loadMessages();
            };
            mr.start(250);
            setIsRecording(true);
            setRecMs(0);
            recTimerRef.current = setInterval(() => setRecMs(m => m + 1000), 1000);
        } catch (e) { setRecError("Mic permission denied."); }
    };

    const stopRecording = () => mediaRecorderRef.current?.stop();
    const cancelRecording = () => { recCancelledRef.current = true; mediaRecorderRef.current?.stop(); };

    const handleLeaveGroup = async () => {
        if (!confirm("Leave this group?")) return;
        try {
            const fd = new FormData();
            fd.append("group_id", String(id));
            fd.append("user_id", String(myUserId));
            const r = await apiClient.post("group_api.php?action=leave_group", fd);
            if (r.data.ok) window.location.href = "/groups";
        } catch (e) { alert("Error leaving group"); }
    };

    // Derived sidebar media
    const media = messages.filter(m => m.attachment_url && (isImage(m.attachment_url) || isVideo(m.attachment_url)));
    const files = messages.filter(m => m.attachment_url && !isImage(m.attachment_url) && !isVideo(m.attachment_url));
    const linkRegex = /https?:\/\/[^\s<>()"]+/gi;
    const links = messages.flatMap(m => m.message?.match(linkRegex) || []).map((u, i) => ({ id: i, url: u }));

    return (
        <div className="min-h-screen relative" style={{ background: "#08090e", color: "#e2e8f0" }}>
            {/* Blurry Background Spots */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(100px)" }} />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(100px)" }} />
            </div>

            <LeftNav sidebarWidth={72} navOpen={false} />
            <Header sidebarWidth={72} navOpen={false} />

            <div className="flex relative z-10" style={{ paddingLeft: 72, height: "100vh", paddingTop: 64 }}>
                {/* Chat Column */}
                <main className="flex-1 flex flex-col h-full bg-[rgba(0,0,0,0.2)]">
                    {/* Header */}
                    <div className="border-b p-4 flex-shrink-0 backdrop-blur-md flex justify-between items-center" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,9,14,0.6)" }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-display font-black shadow-lg" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "white" }}>
                                {group?.section_name?.charAt(0).toUpperCase() || "G"}
                            </div>
                            <div>
                                <div className="text-base font-bold text-white leading-tight">{group ? group.section_name : "Loading Group..."}</div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{members.length} Members Online</div>
                            </div>
                        </div>
                        <button onClick={() => setShowSidebar(true)} className="p-2 rounded-xl hover:bg-white/10 transition-all text-slate-400">
                            <MoreVertical size={20} />
                        </button>
                    </div>

                    {/* Message List */}
                    <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                        {messages.map((m) => {
                            const mine = m.user_id === myUserId;
                            return (
                                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                    <div className="max-w-[70%] group">
                                        {!mine && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">{m.username}</div>}
                                        <div className={`p-4 rounded-2xl text-sm shadow-xl transition-all ${mine ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none" : "bg-white/5 border border-white/10 text-slate-100 rounded-bl-none"}`}>
                                            {m.message && <div className="whitespace-pre-wrap leading-relaxed">{m.message}</div>}
                                            {m.attachment_url && (() => {
                                                const url = absUrl(m.attachment_url);
                                                const name = prettyName(m.attachment_url);
                                                const ext = getExt(m.attachment_url);
                                                return (
                                                    <div className="mt-3 space-y-2">
                                                        {isImage(url) && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={name} className="rounded-xl max-h-64 object-contain border border-white/10 shadow-lg" /></a>}
                                                        {isAudio(url) && <audio controls className="w-full h-10 rounded-lg outline-none [&::-webkit-media-controls-panel]:bg-white/90 shadow-md"><source src={url} /></audio>}
                                                        {isVideo(url) && <video controls className="w-full max-h-64 rounded-xl shadow-lg border border-white/10"><source src={url} /></video>}
                                                        {(isPDF(url) || (!isImage(url) && !isAudio(url) && !isVideo(url))) && (
                                                            <a href={url} target="_blank" rel="noreferrer" download={name}>
                                                                <FileChip name={name} ext={ext} className={mine ? "bg-black/20 border-white/10" : "bg-white/5 border-white/10"} />
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <div className="text-[10px] mt-2 opacity-50 text-right font-medium">
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Composer */}
                    <div className="p-4 border-t backdrop-blur-md" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,9,14,0.6)" }}>
                        <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-3 items-end">
                            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0])} />
                            
                            <button onClick={() => fileInputRef.current?.click()} className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400">
                                <Paperclip size={20} />
                            </button>

                            <button onClick={isRecording ? stopRecording : startRecording} className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${isRecording ? "bg-rose-500 text-white animate-pulse" : "hover:bg-white/10 text-slate-400"}`}>
                                <Mic size={20} />
                            </button>

                            <div className="flex-1 min-w-[200px] flex flex-col">
                                {file && (
                                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                        <FileChip name={file.name} ext={getExt(file.name)} />
                                        <button onClick={() => setFile(null)} className="ml-auto p-1 text-slate-500 hover:text-white transition-all"><X size={14} /></button>
                                    </div>
                                )}
                                {isRecording && (
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2 bg-rose-500/10 border border-rose-500/20">
                                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="text-xs font-bold text-rose-400">Recording... {fmtTime(recMs)}</span>
                                        <button onClick={cancelRecording} className="ml-auto text-xs font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition">Cancel</button>
                                    </div>
                                )}
                                <textarea
                                    className="w-full bg-transparent outline-none resize-none text-sm py-2 px-1 max-h-32 scrollbar-hide text-white placeholder-slate-600"
                                    placeholder="Communicate with your cohort..."
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? (e.preventDefault(), sendMessage()) : null}
                                />
                            </div>

                            <button onClick={sendMessage} disabled={loading || (!text.trim() && !file)} className="h-10 px-6 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                                Send
                            </button>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className={`fixed top-0 right-0 h-full w-80 bg-[#08090e] border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${showSidebar ? "translate-x-0" : "translate-x-full"}`}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-lg font-display font-black text-white italic">Group Space</h2>
                        <button onClick={() => setShowSidebar(false)} className="p-2 rounded-xl hover:bg-white/10 text-slate-500"><X size={20} /></button>
                    </div>

                    <div className="flex border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {["members", "media", "files", "links"].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-4 border-b-2 transition-all ${activeTab === t ? "border-cyan-500 text-cyan-400 bg-white/5" : "border-transparent hover:text-white"}`}>{t}</button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeTab === "members" && members.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center font-bold text-xs shadow-lg">{m.username?.charAt(0).toUpperCase()}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-100 truncate">{m.username}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{m.email}</div>
                                </div>
                                <ChevronRight size={14} className="text-slate-600" />
                            </div>
                        ))}

                        {activeTab === "media" && (
                            <div className="grid grid-cols-2 gap-2">
                                {media.map((m, i) => (
                                    <a key={i} href={absUrl(m.attachment_url)} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all">
                                        {isImage(m.attachment_url) ? <img src={absUrl(m.attachment_url)} className="w-full h-full object-cover" /> : <video src={absUrl(m.attachment_url)} className="w-full h-full object-cover" />}
                                    </a>
                                ))}
                            </div>
                        )}

                        {activeTab === "files" && files.map((m, i) => (
                            <a key={i} href={absUrl(m.attachment_url)} target="_blank" rel="noreferrer" download className="block p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all">
                                <FileChip name={prettyName(m.attachment_url)} ext={getExt(m.attachment_url)} />
                            </a>
                        ))}

                        {activeTab === "links" && links.map(l => (
                            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="block p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all text-xs text-cyan-400 italic truncate italic">
                                {l.url}
                            </a>
                        ))}
                    </div>

                    <div className="p-4 border-t border-white/10">
                        <button onClick={handleLeaveGroup} className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
                            <LogOut size={16} /> Exit This Node
                        </button>
                    </div>
                </aside>

                {showSidebar && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-500" onClick={() => setShowSidebar(false)} />}
            </div>
        </div>
    );
}
