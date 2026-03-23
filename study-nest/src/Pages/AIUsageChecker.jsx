import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import apiClient from "../apiConfig";

export default function AIUsageChecker() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef();

    const [navOpen, setNavOpen] = useState(false);
    const [anonymous, setAnonymous] = useState(false);
    const COLLAPSED_W = 72;
    const EXPANDED_W = 248;
    const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

    async function handleFile(f) {
        setFile(f);
        setResult(null);
    }

    async function runCheck() {
        if (!file) return;
        setLoading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await apiClient.post("check_ai.php", form);
            const data = res.data;
            setResult({ score: data.score, feedback: data.feedback });
        } catch (err) {
            setResult({ score: 0, feedback: err?.message || "Request failed. Check the Network tab for the response body." });
        } finally { setLoading(false); }
    }

    return (
        <main className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/3 w-80 h-64 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
                <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #fb7185, transparent)", filter: "blur(80px)" }} />
            </div>

            <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
            <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

            <div className="mx-auto max-w-2xl px-6 py-10 relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #fb7185, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI Usage Checker</h1>
                    <p className="text-sm mt-1" style={{ color: "#475569" }}>Detect AI-generated content in your documents</p>
                </div>

                <div className="space-y-5">
                    <div className="rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                        {!file ? (
                            <>
                                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(251,113,133,0.15)", border: "1px solid rgba(251,113,133,0.3)" }}>
                                    <span className="text-2xl">🔍</span>
                                </div>
                                <p className="text-sm mb-3" style={{ color: "#475569" }}>Upload your essay or notes (PDF, DOCX, TXT)</p>
                                <label className="inline-flex cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "rgba(251,113,133,0.15)", border: "1px solid rgba(251,113,133,0.3)", color: "#fb7185" }}>
                                    Choose file
                                    <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                                </label>
                            </>
                        ) : (
                            <div>
                                <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{file.name}</p>
                                <p className="text-xs mt-1" style={{ color: "#475569" }}>{file.type || "file"} · {(file.size / 1024).toFixed(0)} KB</p>
                                <button onClick={() => setFile(null)} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>Remove</button>
                            </div>
                        )}
                    </div>

                    <button disabled={!file || loading} onClick={runCheck}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #fb7185, #7c3aed)", color: "white", boxShadow: "0 8px 24px rgba(251,113,133,0.25)" }}>
                        {loading ? "🔍 Analyzing…" : "Check AI Usage"}
                    </button>

                    {result && (
                        <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Results</h2>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm" style={{ color: "#94a3b8" }}>AI Likelihood</span>
                                    <span className="text-2xl font-display font-black" style={{ color: result.score > 0.5 ? "#fb7185" : "#34d399" }}>{Math.round(result.score * 100)}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.round(result.score * 100)}%`, background: result.score > 0.5 ? "linear-gradient(90deg, #fbbf24, #fb7185)" : "linear-gradient(90deg, #34d399, #06b6d4)" }} />
                                </div>
                            </div>
                            <p className="text-sm" style={{ color: "#64748b" }}>{result.feedback}</p>
                        </div>
                    )}

                    <button disabled={!result}
                        onClick={() => {
                            localStorage.setItem("studynest.humanize.pending", JSON.stringify({ text: result?.excerpt || "Please paste the text you want to humanize.", notes: result?.feedback }));
                            navigate("/humanize");
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-30"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.25)" }}>
                        ✨ Humanize This
                    </button>
                </div>
            </div>
            <Footer />
        </main>
    );
}
