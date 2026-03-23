import { API_BASE } from "../../apiConfig";

export const absUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_BASE}/${String(p).replace(/^\/+/, "")}`;
};

export const getExt = (url = "") => {
    const s = String(url).toLowerCase();
    const q = s.split("?")[0];
    const i = q.lastIndexOf(".");
    return i >= 0 ? q.slice(i + 1) : "";
};

export const isImage = (url) => /^(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(getExt(url));
export const isAudio = (url) => /^(mp3|wav|ogg|m4a|aac|flac)$/.test(getExt(url));
export const isVideo = (url) => /^(mp4|webm|ogg|mov|mkv|m4v)$/.test(getExt(url));
export const isPDF = (url) => getExt(url) === "pdf";

export const fileBaseName = (p) => {
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

export const prettyName = (p) => {
    const base = fileBaseName(p);
    const m = base.match(/^(.+?)_[0-9a-f]{8,}\.(\w+)$/i);
    if (m) return `${m[1]}.${m[2]}`;
    return base;
};

export const AUDIO_MIME_CANDIDATES = [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
    "audio/webm",
];

export const pickAudioMime = () => {
    if (typeof MediaRecorder === "undefined") return "";
    for (const m of AUDIO_MIME_CANDIDATES) {
        try { if (MediaRecorder.isTypeSupported?.(m)) return m; } catch { }
    }
    return "";
};

export const extFromMime = (m) =>
    m?.includes("webm") ? "webm" :
        m?.includes("ogg") ? "ogg" :
            m?.includes("mp4") ? "m4a" : "webm";

export const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
};
