import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Music } from "lucide-react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api/group_api.php";
const POLL_MS = 2500;

// Helpers
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

const FileChip = ({ name, ext }) => (
    <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-slate-700/30 text-slate-200 text-sm">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-black/20 text-[10px] font-semibold">
            {ext.toUpperCase()}
        </span>
        <span className="truncate max-w-[220px]">{name}</span>
    </span>
);

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
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingStart, setRecordingStart] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const [activeTab, setActiveTab] = useState("members");

    // Logged-in user
    const stored = localStorage.getItem("studynest.auth");
    const me = stored ? JSON.parse(stored) : null;
    const myUserId = me?.id;

    // Load messages
    const loadMessages = async () => {
        try {
            const res = await fetch(`${API_BASE}?action=messages&group_id=${id}`, {
                credentials: "include",
            });
            const j = await res.json();
            if (j.ok) setMessages(j.messages || []);
        } catch (e) {
            console.warn("loadMessages failed", e);
        }
    };

    // Load group meta
    useEffect(() => {
        fetch(`http://localhost/StudyNest/study-nest/src/api/admin_api.php?action=list_groups&k=MYKEY123`)
            .then((r) => r.json())
            .then((j) => {
                if (j.ok) {
                    const g = j.groups.find((x) => String(x.id) === String(id));
                    setGroup(g);
                }
            });
    }, [id]);

    // Load members (try group_api first; fallback to group.members if present)
    const loadMembers = async () => {
        try {
            const r = await fetch(`${API_BASE}?action=members&group_id=${id}`, { credentials: "include" });
            const j = await r.json();
            if (j.ok && Array.isArray(j.members)) {
                setMembers(j.members);
                return;
            }
        } catch (_) { }
        if (group?.members) setMembers(group.members);
    };

    useEffect(() => {
        loadMessages();
        const t = setInterval(loadMessages, POLL_MS);
        return () => clearInterval(t);
    }, [id]);

    useEffect(() => {
        loadMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, group?.id]);

    // Auto-scroll when near bottom
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const scrollHeight = el.scrollHeight || 0;
        const scrollTop = el.scrollTop || 0;
        const clientHeight = el.clientHeight || 0;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (nearBottom) el.scrollTo({ top: scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            let chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                chunks = [];
            };
            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
            setRecordingStart(Date.now());
            setElapsed(0);
        } catch (err) {
            console.error("Mic error:", err);
            alert("Microphone access is blocked. Please allow it in your browser.");
        }
    };
    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
            setRecordingStart(null);
            setElapsed(0);
        }
    };
    useEffect(() => {
        let timer;
        if (recording && recordingStart) {
            timer = setInterval(() => setElapsed(Math.floor((Date.now() - recordingStart) / 1000)), 1000);
        }
        return () => clearInterval(timer);
    }, [recording, recordingStart]);

    // Send message
    const sendMessage = async () => {
        if (!text.trim() && !file && !audioBlob) return;
        if (!myUserId) {
            alert("You must be logged in to send messages.");
            return;
        }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("group_id", String(id));
            fd.append("user_id", String(myUserId));
            if (text.trim()) fd.append("message", text.trim());
            if (file) fd.append("attachment", file);
            if (audioBlob) fd.append("attachment", audioBlob, "voice_message.webm");

            const res = await fetch(`${API_BASE}?action=send_message`, {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            const j = await res.json();
            if (j.ok) {
                setText("");
                setFile(null);
                setAudioBlob(null);
                loadMessages();
            }
        } catch (e) {
            console.warn("sendMessage failed", e);
        } finally {
            setLoading(false);
        }
    };

    // Derived data for sidebar
    // Media: only images + videos
    const media = messages.filter(
        (m) =>
            m.attachment_url &&
            (isImage(m.attachment_url) || isVideo(m.attachment_url))
    );

    // Files: everything else (pdf, audio, docs, zips, etc.)
    const files = messages.filter(
        (m) =>
            m.attachment_url &&
            !isImage(m.attachment_url) &&
            !isVideo(m.attachment_url)
    );



    const linkRegex = /https?:\/\/[^\s<>()"]+/gi;
    const links = messages
        .flatMap((m) => (m.message ? (m.message.match(linkRegex) || []) : []))
        .map((u, idx) => ({ id: idx + "-" + u, url: u }));


    // Leave group
    const handleLeaveGroup = async () => {
        if (!confirm("Are you sure you want to leave this group?")) return;
        try {
            const fd = new FormData();
            fd.append("group_id", String(id));
            fd.append("user_id", String(myUserId || ""));
            const r = await fetch(`${API_BASE}?action=leave_group`, {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            const j = await r.json();
            if (j.ok) {
                alert("You left the group.");
                setShowMenu(false);
                // Optional: navigate away or refresh members/messages
                loadMembers();
            } else {
                alert(j.error || "Failed to leave group.");
            }
        } catch (e) {
            alert("Network error while leaving the group.");
        }
    };

    return (
        <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col">
            <LeftNav sidebarWidth={72} />
            <Header sidebarWidth={72} />

            {/* Full-height chat area; only the message list scrolls */}
            <div className="flex" style={{ paddingLeft: 72, height: "calc(100vh - 64px)" }}>
                <main className="flex-1 flex flex-col relative h-full">

                    {/* Header (fixed) */}
                    <div className="shrink-0 border-b border-slate-700 p-3 flex justify-between items-center bg-slate-900">
                        <div className="text-sm font-semibold truncate">
                            {group ? group.section_name : "Loading..."}
                        </div>
                        <button
                            onClick={() => setShowMenu(true)}
                            className="p-2 rounded-lg hover:bg-slate-700"
                            title="Group Info"
                        >
                            ⋮
                        </button>
                    </div>

                    {/* Messages (scrollable) */}
                    <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.map((m) => {
                            const mine = m.user_id === myUserId;
                            return (
                                <div
                                    key={m.id}
                                    className={`max-w-[72%] md:max-w-[70%] p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap border ${mine
                                        ? "ml-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent"
                                        : "bg-slate-800/90 text-slate-100 border-slate-700/60"
                                        }`}
                                >
                                    <div className="font-semibold mb-1">{m.username}</div>
                                    {m.message && <div>{m.message}</div>}

                                    {m.attachment_url &&
                                        (() => {
                                            const url = m.attachment_url;
                                            const name = url.split("/").pop();
                                            const ext = getExt(url);
                                            return (
                                                <div className="mt-2 space-y-2">
                                                    {isImage(url) && (
                                                        <img src={url} alt={name} className="rounded-lg max-h-72 object-contain" />
                                                    )}
                                                    {isAudio(url) && (
                                                        <div className="flex items-center gap-3 p-2 bg-slate-700/40 rounded-lg">
                                                            {/* 🎵 Audio icon */}
                                                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-600 text-white">
                                                                <Music size={20} />
                                                            </div>


                                                            {/* File name + player */}
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium truncate">{name}</div>
                                                                <audio controls className="w-full mt-1">
                                                                    <source src={url} />
                                                                </audio>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isVideo(url) && (
                                                        <video controls className="w-full max-h-80 rounded-lg">
                                                            <source src={url} />
                                                        </video>
                                                    )}
                                                    {isPDF(url) ||
                                                        (!isImage(url) && !isAudio(url) && !isVideo(url)) ? (
                                                        <a href={url} target="_blank" rel="noreferrer" download={name}>
                                                            <FileChip name={name} ext={ext} />
                                                        </a>
                                                    ) : null}
                                                </div>
                                            );
                                        })()}

                                    <div className="text-[11px] mt-1 text-right opacity-70">
                                        {new Date(m.created_at).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Composer (fixed) */}
                    <div className="shrink-0 border-t border-slate-700 p-3 flex flex-wrap gap-2 items-center bg-slate-900">
                        <input
                            className="flex-1 min-w-[220px] bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                            placeholder="Write a message…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && !e.shiftKey ? (e.preventDefault(), sendMessage()) : null
                            }
                            disabled={loading}
                        />

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white grid place-items-center"
                            title="Attach a file"
                            disabled={loading}
                        >
                            📎
                        </button>

                        {/* Mic + Recording */}
                        <div className="flex gap-2 items-center">
                            {!recording ? (
                                <button
                                    onClick={startRecording}
                                    className="h-10 w-10 rounded-full bg-emerald-600 text-white grid place-items-center"
                                    title="Start Recording"
                                >
                                    🎤
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="h-10 w-10 rounded-full bg-red-600 text-white grid place-items-center animate-pulse"
                                    title="Stop Recording"
                                >
                                    ⏹️
                                </button>
                            )}

                            {audioBlob && (
                                <div className="flex items-center gap-2">
                                    <audio controls src={URL.createObjectURL(audioBlob)} />
                                    <button onClick={() => setAudioBlob(null)} className="text-xs px-2 py-1 bg-red-600 rounded-md">
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {recording && (
                            <div className="flex items-center gap-2 bg-red-600/20 px-3 py-2 rounded-lg text-red-400 text-sm">
                                🔴 Recording... {elapsed}s
                                <button onClick={stopRecording} className="ml-3 px-2 py-1 bg-red-600 text-white rounded-md text-xs">
                                    Stop
                                </button>
                            </div>
                        )}

                        {file && (
                            <div className="flex items-center gap-2">
                                <FileChip name={file.name} ext={getExt(file.name)} />
                                <button onClick={() => setFile(null)} className="px-1.5 py-0.5 text-xs rounded-md bg-slate-700 hover:bg-slate-600">
                                    ✕
                                </button>
                            </div>
                        )}

                        <button
                            onClick={sendMessage}
                            disabled={loading || (!text.trim() && !file && !audioBlob)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm shadow"
                        >
                            Send
                        </button>
                    </div>

                    {/* Right Sidebar */}
                    <div
                        className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col
            ${showMenu ? "translate-x-0" : "translate-x-full"}`}
                    >
                        {/* Sidebar Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700 bg-slate-800">
                            <h2 className="text-base font-semibold">
                                {group ? group.section_name : "Group Info"}
                            </h2>
                            <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-slate-700 rounded-lg">
                                ✕
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700 text-sm bg-slate-800">
                            {[
                                { key: "members", label: "Members" },
                                { key: "media", label: "Media" },
                                { key: "files", label: "Files" },
                                { key: "links", label: "Links" },
                            ].map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex-1 px-3 py-2 ${activeTab === t.key ? "bg-slate-700 text-cyan-400" : "hover:bg-slate-700"}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Content (scrollable) */}
                        <div className="p-4 overflow-y-auto flex-1 text-sm space-y-2">
                            {activeTab === "members" && (
                                <div className="space-y-2">
                                    {members?.length > 0 ? (
                                        members.map((m) => (
                                            <div key={m.id} className="flex items-center gap-3 p-2 bg-slate-700/40 rounded-lg">
                                                <div className="h-8 w-8 rounded-full bg-slate-600 grid place-items-center text-xs">
                                                    {String(m.username || "U").slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium">{m.username}</div>
                                                    {m.email && <div className="text-[11px] text-slate-400">{m.email}</div>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400">No members found.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === "media" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {media.length === 0 && <p className="col-span-2 text-slate-400">No media yet.</p>}
                                    {media.map((m, i) => (
                                        <a key={i} href={m.attachment_url} target="_blank" rel="noreferrer">
                                            {isImage(m.attachment_url) ? (
                                                <img src={m.attachment_url} alt="" className="rounded-lg" />
                                            ) : (
                                                <video src={m.attachment_url} className="rounded-lg" />
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {activeTab === "files" && (
                                <div className="space-y-2">
                                    {files.length === 0 && <p className="text-slate-400">No files yet.</p>}
                                    {files.map((m, i) => {
                                        const url = m.attachment_url;
                                        const name = url.split("/").pop();
                                        const ext = getExt(url);

                                        // 🎵 Audio files
                                        if (isAudio(url)) {
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-3 p-2 bg-slate-700/40 rounded-lg"
                                                >
                                                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-600 text-white text-2xl leading-none">
                                                        🎵
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium truncate">{name}</div>
                                                        <audio controls className="w-full mt-1">
                                                            <source src={url} />
                                                        </audio>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // 📄 Other file types (pdf, docx, zip, etc.)
                                        return (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-2 bg-slate-700/40 rounded-lg hover:bg-slate-600"
                                            >
                                                <div className="h-8 w-8 rounded-md bg-slate-600 grid place-items-center text-xs font-bold">
                                                    {ext.toUpperCase()}
                                                </div>
                                                <span className="truncate">{name}</span>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}



                            {activeTab === "links" && (
                                <div className="space-y-2">
                                    {links.length === 0 && <p className="text-slate-400">No links yet.</p>}
                                    {links.map((l) => (
                                        <a
                                            key={l.id}
                                            href={l.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block p-2 bg-slate-700/40 rounded-lg hover:bg-slate-600 break-all"
                                        >
                                            🔗 {l.url}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Leave Group (sticky bottom) */}
                        <div className="border-t border-slate-700 p-3 bg-slate-800">
                            <button
                                onClick={handleLeaveGroup}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white"
                            >
                                🚪 Leave group
                            </button>
                        </div>
                    </div>

                    {/* Overlay */}
                    {showMenu && (
                        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMenu(false)}></div>
                    )}
                </main>
            </div>
        </div>
    );
}
