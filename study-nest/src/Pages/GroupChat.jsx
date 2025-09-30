import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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

// FileChip
const FileChip = ({ name, ext }) => {
    return (
        <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-slate-700/30 text-slate-200 text-sm">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-black/20 text-[10px] font-semibold">
                {ext.toUpperCase()}
            </span>
            <span className="truncate max-w-[220px]">{name}</span>
        </span>
    );
};

export default function GroupChat() {
    const { id } = useParams(); // group_id
    const [messages, setMessages] = useState([]);
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
    const [hasNew, setHasNew] = useState(false);

    const myUserId = 1; // TODO: replace with real logged-in user ID

    // Load messages
    const loadMessages = async () => {
        try {
            const res = await fetch(`${API_BASE}?action=messages&group_id=${id}`);
            const j = await res.json();
            if (j.ok) setMessages(j.messages || []);
        } catch (e) {
            console.warn("loadMessages failed", e);
        }
    };

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
        loadMessages();
        const t = setInterval(loadMessages, POLL_MS);
        return () => clearInterval(t);
    }, [id]);

    useEffect(() => {
  const el = listRef.current;
  if (!el) return;

  // Default values to avoid NaN
  const scrollHeight = el.scrollHeight || 0;
  const scrollTop = el.scrollTop || 0;
  const clientHeight = el.clientHeight || 0;

  const nearBottom = scrollHeight - scrollTop - clientHeight < 100;

  if (nearBottom) {
    el.scrollTo({ top: scrollHeight, behavior: "smooth" });
  }
}, [messages]);


    const [group, setGroup] = useState(null);

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


    useEffect(() => {
        let timer;
        if (recording && recordingStart) {
            timer = setInterval(() => {
                setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [recording, recordingStart]);


    // Send message
    const sendMessage = async () => {
        if (!text.trim() && !file && !audioBlob) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("group_id", String(id));
            if (text.trim()) fd.append("message", text.trim());
            if (file) fd.append("attachment", file);
            if (audioBlob) {
                fd.append("attachment", audioBlob, "voice_message.webm");
            }

            const res = await fetch(`${API_BASE}?action=send_message`, {
                method: "POST",
                body: fd,
            });
            const j = await res.json();
            if (j.ok) {
                setText("");
                setFile(null);
                setAudioBlob(null); // clear after send
                loadMessages();
            }
        } catch (e) {
            console.warn("sendMessage failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 text-slate-100 min-h-screen">
            <LeftNav sidebarWidth={72} />
            <Header sidebarWidth={72} />

            <div className="flex" style={{ paddingLeft: 72, height: "calc(100vh - 64px)" }}>
                {/* Right: group chat */}
                <main className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="border-b border-slate-700 p-3">
                        <div className="text-sm font-semibold">
                            {group ? group.section_name : "Loading..."}
                        </div>
                    </div>

                    {/* Messages */}
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

                                    {m.attachment_url && isAudio(m.attachment_url) && (
                                        <audio controls className="w-full mt-2">
                                            <source src={m.attachment_url} />
                                        </audio>
                                    )}

                                    {m.attachment_url && (() => {
                                        const url = m.attachment_url;
                                        const name = url.split("/").pop();
                                        const ext = getExt(url);
                                        return (
                                            <div className="mt-2 space-y-2">
                                                {isImage(url) && <img src={url} alt={name} className="rounded-lg max-h-72 object-contain" />}
                                                {isAudio(url) && <audio controls className="w-full"><source src={url} /></audio>}
                                                {isVideo(url) && <video controls className="w-full max-h-80 rounded-lg"><source src={url} /></video>}
                                                {isPDF(url) || (!isImage(url) && !isAudio(url) && !isVideo(url)) ? (
                                                    <a href={url} target="_blank" rel="noreferrer" download={name}>
                                                        <FileChip name={name} ext={ext} />
                                                    </a>
                                                ) : null}
                                            </div>
                                        );
                                    })()}

                                    <div className="text-[11px] mt-1 text-right opacity-70">
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Composer */}
                    <div className="border-t border-slate-700 p-3 flex flex-wrap gap-2 items-center">
                        <input
                            className="flex-1 min-w-[220px] bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                            placeholder="Write a message…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey ? (e.preventDefault(), sendMessage()) : null}
                            disabled={loading}
                        />

                        <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white grid place-items-center"
                            title="Attach a file"
                            disabled={loading}
                        >
                            📎
                        </button>
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
                                    <button
                                        onClick={() => setAudioBlob(null)}
                                        className="text-xs px-2 py-1 bg-red-600 rounded-md"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {recording && (
                            <div className="flex items-center gap-2 bg-red-600/20 px-3 py-2 rounded-lg text-red-400 text-sm">
                                🔴 Recording... {elapsed}s
                                <button
                                    onClick={stopRecording}
                                    className="ml-3 px-2 py-1 bg-red-600 text-white rounded-md text-xs"
                                >
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
                </main>
            </div>
        </div>
    );
}
