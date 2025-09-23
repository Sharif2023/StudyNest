import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";
const POLL_MS = 2500;

/* ---------- URL + type helpers (ONE copy only) ---------- */

// Make relative paths (e.g., "uploads/xyz.png") absolute for the browser.
const absUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

// Extract file extension (lowercased), ignoring query strings.
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

/* ---------- Filename prettifiers (ONE copy only) ---------- */

// Turn ".../uploads/name_ab12cd34.pdf" → "name_ab12cd34.pdf"
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

// Strip random suffix: "name_ab12cd34.pdf" → "name.pdf"
const prettyName = (p) => {
    const base = fileBaseName(p);
    const m = base.match(/^(.+?)_[0-9a-f]{8,}\.(\w+)$/i);
    if (m) return `${m[1]}.${m[2]}`;
    return base;
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

const MicIcon = ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.75" />
        <path d="M5 11a7 7 0 0014 0M12 21v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
);

// mm:ss
const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
};

/* ---------- Small icons / chips ---------- */

const PaperclipIcon = ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M21 7.5l-9.19 9.2a4 4 0 11-5.66-5.65L14.3 3.9a3 3 0 114.25 4.24L9.53 17.17a2 2 0 11-2.83-2.83L16.06 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const fileBadgeForExt = (ext) => {
    const e = (ext || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(e)) return { label: "IMG", color: "bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/30" };
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(e)) return { label: "AUD", color: "bg-violet-600/20 text-violet-300 border-violet-500/30" };
    if (["mp4", "webm", "ogg", "mov", "mkv", "m4v"].includes(e)) return { label: "VID", color: "bg-indigo-600/20 text-indigo-300 border-indigo-500/30" };
    if (e === "pdf") return { label: "PDF", color: "bg-red-600/20 text-red-300 border-red-500/30" };
    if (["ppt", "pptx"].includes(e)) return { label: "PPT", color: "bg-orange-600/20 text-orange-300 border-orange-500/30" };
    if (["doc", "docx"].includes(e)) return { label: "DOC", color: "bg-blue-600/20 text-blue-300 border-blue-500/30" };
    if (["xls", "xlsx", "csv"].includes(e)) return { label: "XLS", color: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" };
    if (["txt", "md", "rtf"].includes(e)) return { label: "TXT", color: "bg-slate-600/20 text-slate-300 border-slate-500/30" };
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

/* ===================== MAIN COMPONENT ===================== */

export default function Messages() {
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeCid, setActiveCid] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const composerRef = useRef(null);
    const listRef = useRef(null);
    const lastIdRef = useRef(0);

    // Voice note state/refs
    const [isRecording, setIsRecording] = useState(false);
    const [recMs, setRecMs] = useState(0);
    const [recError, setRecError] = useState("");

    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recChunksRef = useRef([]);
    const recTimerRef = useRef(null);
    const recCancelledRef = useRef(false);
    const recMimeRef = useRef("");

    // Send a Blob as an attachment (voice)
    const sendAttachmentBlob = async (blob, filename) => {
        if (!activeCid) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("conversation_id", String(activeCid));
            fd.append("attachment", new File([blob], filename, { type: blob.type || "application/octet-stream" }));

            const res = await fetch(`${API_BASE}/messages_api.php?action=messages_send`, {
                method: "POST",
                credentials: "include",
                body: fd,
            });
            const j = await res.json();
            if (j.ok && j.message) {
                setMessages((prev) => {
                    const arr = [...prev, j.message].sort((a, b) => a.id - b.id);
                    lastIdRef.current = arr.length ? arr[arr.length - 1].id : lastIdRef.current;
                    return arr;
                });
                setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 0);
            } else {
                console.warn("voice send error:", j.error);
            }
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        if (!activeCid) return;                 // need an open conversation
        setRecError("");
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setRecError("Recording not supported in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mime = pickAudioMime();         // choose best supported mime
            recMimeRef.current = mime || "";

            const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            mediaRecorderRef.current = mr;
            recChunksRef.current = [];
            recCancelledRef.current = false;

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recChunksRef.current.push(e.data);
            };
            mr.onstop = async () => {
                clearInterval(recTimerRef.current);
                (mediaStreamRef.current?.getTracks?.() || []).forEach((t) => t.stop());
                mediaStreamRef.current = null;
                setIsRecording(false);

                if (recCancelledRef.current) {
                    recChunksRef.current = [];
                    setRecMs(0);
                    return;
                }
                const mimeType = recMimeRef.current || recChunksRef.current[0]?.type || "audio/webm";
                const blob = new Blob(recChunksRef.current, { type: mimeType });
                const filename = `voice_${Date.now()}.${extFromMime(mimeType)}`;
                recChunksRef.current = [];
                setRecMs(0);
                await sendAttachmentBlob(blob, filename); // auto-send on stop
            };

            mr.start(250);                         // collect small chunks
            setIsRecording(true);
            setRecMs(0);
            recTimerRef.current = setInterval(() => setRecMs((ms) => ms + 1000), 1000);
        } catch (err) {
            console.warn(err);
            setRecError("Microphone permission denied.");
        }
    };

    const stopRecordingAndSend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelRecording = () => {
        recCancelledRef.current = true;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };

    // TODO: fetch from a session endpoint; used only for "mine" styling
    const myUserId = 1;

    // Cache userId -> {username,email}
    const [userCache, setUserCache] = useState(() => new Map());
    const cacheUsers = (users) => {
        setUserCache((prev) => {
            const copy = new Map(prev);
            (users || []).forEach((u) => copy.set(u.id, { username: u.username, email: u.email }));
            return copy;
        });
    };
    const labelForUser = (id, row) => {
        if (row?.other_username) return row.other_username;
        const c = userCache.get(id);
        if (c?.username) return c.username;
        if (c?.email) return c.email;
        return `User #${id}`;
    };

    /* ---------- Search ---------- */
    const searchUsers = async () => {
        const q = searchTerm.trim();
        if (!q) { setResults([]); return; }
        setSearching(true);
        try {
            const res = await fetch(
                `${API_BASE}/messages_api.php?action=users_search&q=${encodeURIComponent(q)}`,
                { credentials: "include" }
            );
            const j = await res.json();
            if (j.ok) { setResults(j.users || []); cacheUsers(j.users); }
        } catch (e) { console.warn(e); }
        finally { setSearching(false); }
    };

    const startChatWith = async (userId) => {
        if (!userId || userId === myUserId) return;
        try {
            const res = await fetch(`${API_BASE}/messages_api.php?action=conversations_ensure`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient_id: userId }),
            });
            const j = await res.json();
            if (!j.ok) return;
            await loadConversations();
            await openConversation(j.conversation_id);
            setResults([]); setSearchTerm("");
            setTimeout(() => composerRef.current?.focus(), 0);
        } catch (e) { console.warn(e); }
    };

    /* ---------- Conversations ---------- */
    const loadConversations = async () => {
        try {
            const res = await fetch(`${API_BASE}/messages_api.php?action=conversations_list`, { credentials: "include" });
            const j = await res.json();
            if (j.ok) {
                setConversations(j.conversations || []);
                (j.conversations || []).forEach((c) => {
                    if (c.other_username || c.other_email) {
                        setUserCache((prev) => {
                            const copy = new Map(prev);
                            const existed = copy.get(c.other_user_id) || {};
                            copy.set(c.other_user_id, {
                                username: c.other_username || existed.username,
                                email: c.other_email || existed.email,
                            });
                            return copy;
                        });
                    }
                });
            }
        } catch (e) { console.warn(e); }
    };

    /* ---------- Messages ---------- */
    const loadMessages = async (cid, sinceId = 0) => {
        if (!cid) return;
        try {
            const url = new URL(`${API_BASE}/messages_api.php`);
            url.searchParams.set("action", "messages_fetch");
            url.searchParams.set("conversation_id", cid);
            url.searchParams.set("since_id", sinceId);
            const res = await fetch(url, { credentials: "include" });
            const j = await res.json();
            if (!j.ok) return;

            let newMsgs = j.messages || [];
            if (sinceId === 0) newMsgs = [...newMsgs].reverse(); // API returns DESC for initial

            setMessages((prev) => {
                const map = new Map(prev.map((m) => [m.id, m]));
                newMsgs.forEach((m) => map.set(m.id, m));
                const arr = Array.from(map.values()).sort((a, b) => a.id - b.id);
                lastIdRef.current = arr.length ? arr[arr.length - 1].id : 0;
                return arr;
            });

            if (newMsgs.length) {
                const last = newMsgs[newMsgs.length - 1].id;
                await fetch(`${API_BASE}/messages_api.php?action=messages_mark_read`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversation_id: cid, last_read_message_id: last }),
                }).catch(() => { });
            }
        } catch (e) { console.warn(e); }
    };

    const openConversation = async (cid) => {
        setActiveCid(cid);
        setMessages([]);
        lastIdRef.current = 0;
        await loadMessages(cid, 0);
    };

    /* ---------- Attachments in composer ---------- */
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) setFile(f);
    };
    const clearAttachment = () => setFile(null);

    /* ---------- Send (single FormData implementation) ---------- */
    const sendMessage = async () => {
        if (!activeCid || (!text.trim() && !file)) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("conversation_id", String(activeCid));
            if (text.trim()) formData.append("body", text.trim());
            if (file) formData.append("attachment", file);

            const res = await fetch(`${API_BASE}/messages_api.php?action=messages_send`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            const j = await res.json();
            if (j.ok && j.message) {
                setText(""); setFile(null);
                setMessages((prev) => {
                    const arr = [...prev, j.message].sort((a, b) => a.id - b.id);
                    lastIdRef.current = arr[arr.length - 1]?.id || lastIdRef.current;
                    return arr;
                });
                setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 0);
            } else if (!j.ok) {
                console.warn("messages_send error:", j.error);
            }
        } catch (e) { console.warn(e); }
        finally { setLoading(false); }
    };

    /* ---------- Effects ---------- */
    useEffect(() => { loadConversations(); }, []);
    useEffect(() => {
        const t = setInterval(loadConversations, POLL_MS * 2);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        if (!activeCid) return;
        const t = setInterval(() => { loadMessages(activeCid, lastIdRef.current || 0); }, POLL_MS);
        return () => clearInterval(t);
    }, [activeCid]);
    useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

    const activePreview = useMemo(
        () => conversations.find((c) => c.conversation_id === activeCid),
        [conversations, activeCid]
    );

    return (
        <div className="bg-slate-900 text-slate-100 min-h-screen">
            <LeftNav sidebarWidth={72} />
            <Header sidebarWidth={72} />

            <div className="flex" style={{ paddingLeft: 72, height: "calc(100vh - 64px)" }}>
                {/* Left: conversations + search */}
                <aside className="w-80 border-r border-slate-700 p-3 overflow-y-auto">
                    <div className="text-sm font-semibold mb-2">Chats</div>

                    <div className="flex gap-2 mb-2">
                        <input
                            className="flex-1 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                            placeholder="Search users by username, email, ID…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => (e.key === "Enter" ? searchUsers() : null)}
                        />
                        <button
                            onClick={searchUsers}
                            disabled={searching}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm"
                        >
                            {searching ? "…" : "Search"}
                        </button>
                    </div>

                    {/* Search results */}
                    {results.length > 0 && (
                        <div className="mb-3">
                            <div className="text-xs text-slate-400 mb-1">Results</div>
                            <div className="space-y-1">
                                {results.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => startChatWith(u.id)}
                                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/70 transition"
                                        title={u.email}
                                    >
                                        <div className="text-sm">
                                            {u.username || u.student_id || u.email || `User #${u.id}`}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {u.student_id ? `ID: ${u.student_id}` : u.email}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-slate-700 my-2" />
                        </div>
                    )}

                    {/* Conversation list */}
                    <div className="space-y-1">
                        {conversations.map((c) => (
                            <button
                                key={c.conversation_id}
                                onClick={() => openConversation(c.conversation_id)}
                                className={`w-full text-left p-2 rounded-lg hover:bg-slate-800/70 transition ${activeCid === c.conversation_id ? "bg-slate-800 ring-1 ring-cyan-500/40" : ""
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm">{labelForUser(c.other_user_id, c)}</div>
                                    {c.unread > 0 && (
                                        <span className="text-xs bg-cyan-600/80 px-2 py-0.5 rounded-full">{c.unread}</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-1">
                                    {c.last_message || "No messages yet"}
                                </div>
                            </button>
                        ))}
                        {conversations.length === 0 && results.length === 0 && (
                            <div className="text-xs text-slate-400">No conversations yet. Try searching above ➜</div>
                        )}
                    </div>
                </aside>

                {/* Right: thread */}
                <main className="flex-1 flex flex-col">
                    {/* HEADER: only other user's name */}
                    <div className="border-b border-slate-700 p-3">
                        <div className="text-sm font-semibold">
                            {activePreview ? labelForUser(activePreview.other_user_id, activePreview) : "Select a conversation"}
                        </div>
                    </div>

                    {/* MESSAGES */}
                    <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                        {activeCid &&
                            messages.map((m) => {
                                const mine = m.sender_id === myUserId;
                                return (
                                    <div
                                        key={m.id}
                                        className={`max-w-[72%] md:max-w-[70%] p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap border ${mine
                                            ? "ml-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent"
                                            : "bg-slate-800/90 text-slate-100 border-slate-700/60"
                                            }`}
                                    >
                                        {/* message text */}
                                        {m.body && <div>{m.body}</div>}

                                        {/* attachment preview / chip */}
                                        {m.attachment_url && (() => {
                                            const url = absUrl(m.attachment_url);
                                            const name = prettyName(m.attachment_url);
                                            const ext = getExt(m.attachment_url);

                                            const showImg = isImage(m.attachment_url);
                                            const showAud = isAudio(m.attachment_url);
                                            const showVid = isVideo(m.attachment_url);
                                            const showPdf = isPDF(m.attachment_url);

                                            return (
                                                <div className="mt-2 space-y-2">
                                                    {showImg && (
                                                        <a href={url} target="_blank" rel="noreferrer" title={name}>
                                                            <img
                                                                src={url}
                                                                alt={name}
                                                                loading="lazy"
                                                                className="rounded-lg max-h-72 object-contain border border-slate-700/50"
                                                            />
                                                        </a>
                                                    )}

                                                    {showAud && (
                                                        <audio controls className="w-full">
                                                            <source src={url} />
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    )}

                                                    {showVid && (
                                                        <video controls className="w-full max-h-80 rounded-lg">
                                                            <source src={url} />
                                                            Your browser does not support the video element.
                                                        </video>
                                                    )}

                                                    {(showPdf || (!showImg && !showAud && !showVid)) && (
                                                        <a href={url} target="_blank" rel="noreferrer" download={name} title={name}>
                                                            <FileChip name={name} ext={ext} />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* timestamp bottom-right */}
                                        <div className={`text-[11px] mt-1 text-right ${mine ? "opacity-80 text-white" : "text-slate-400"}`}>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                );
                            })}

                        {activeCid && messages.length === 0 && (
                            <div className="text-xs text-slate-400">No messages in this conversation.</div>
                        )}
                    </div>

                    {/* COMPOSER with pretty attachment button/chip */}
                    <div className="border-t border-slate-700 p-3 flex flex-wrap gap-2 items-center">
                        <input
                            ref={composerRef}
                            className="flex-1 min-w-[220px] bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                            placeholder={activeCid ? "Write a message…" : "Select a conversation first"}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? (e.preventDefault(), sendMessage()) : null}
                            disabled={!activeCid || loading || isRecording}
                        />

                        {/* Hidden file input (you already had this) */}
                        <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />

                        {/* Attachment (paperclip) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 grid place-items-center"
                            disabled={!activeCid || isRecording}
                            title="Attach a file"
                        >
                            <PaperclipIcon className="h-5 w-5" />
                        </button>

                        {/* Mic: click to start; click again to stop & auto-send */}
                        <button
                            type="button"
                            onClick={() => (isRecording ? stopRecordingAndSend() : startRecording())}
                            className={`h-10 px-4 rounded-full text-white shadow-md focus:outline-none focus:ring-2 grid place-items-center ${isRecording
                                    ? "bg-red-600 hover:bg-red-500 focus:ring-red-400/60"
                                    : "bg-gradient-to-br from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 focus:ring-pink-400/60"
                                }`}
                            disabled={!activeCid || loading}
                            title={isRecording ? "Stop & send" : "Record voice note"}
                        >
                            <MicIcon className="h-5 w-5" />
                        </button>

                        {/* While recording: show a small pill with time + cancel */}
                        {isRecording && (
                            <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-600/15 text-red-200 text-xs">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                Recording… {fmtTime(recMs)}
                                <button
                                    type="button"
                                    onClick={cancelRecording}
                                    className="ml-1 px-1.5 py-0.5 rounded bg-red-700/50 hover:bg-red-700 text-white"
                                    title="Cancel"
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                        {/* Selected file chip you already render (keep as before) */}
                        {file && (
                            <div className="flex items-center gap-2">
                                <FileChip name={file.name} ext={getExt(file.name)} />
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="px-1.5 py-0.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600"
                                    title="Remove file"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <button
                            onClick={sendMessage}
                            disabled={!activeCid || loading || (!text.trim() && !file) || isRecording}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm shadow"
                        >
                            Send
                        </button>

                        {/* tiny error text for mic permission */}
                        {recError && <div className="basis-full text-xs text-red-300 mt-1">{recError}</div>}
                    </div>

                </main>
            </div>
        </div>
    );
}
