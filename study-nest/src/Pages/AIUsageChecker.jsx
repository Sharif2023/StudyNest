import React, { useState, useRef } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

export default function AIUsageChecker() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef();

    async function handleFile(f) {
        setFile(f);
        setResult(null);
    }

    async function runCheck() {
        if (!file) return;
        setLoading(true);
        // 🔽 Replace with real API later
        await new Promise((r) => setTimeout(r, 1200));
        setResult({ score: 0.32, feedback: "Mostly human-written with some AI-like sections." });
        setLoading(false);
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl">
            <LeftNav></LeftNav>
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
                <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Usage Checker</h1>
                        <p className="text-sm text-white">Check your AI usage %, Make it Huminize version.</p>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
                <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center bg-white">
                    {!file ? (
                        <>
                            <p className="text-sm text-zinc-600">Upload your essay or notes (PDF, DOCX, TXT)</p>
                            <label className="mt-3 inline-flex cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                                Choose file
                                <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                            </label>
                        </>
                    ) : (
                        <div>
                            <p className="text-sm font-semibold">{file.name}</p>
                            <button onClick={() => setFile(null)} className="mt-2 text-xs rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50">Remove</button>
                        </div>
                    )}
                </div>

                <button disabled={!file || loading} onClick={runCheck}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {loading ? "Analyzing…" : "Check AI Usage"}
                </button>
                {result && (
                    <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200">
                        <h2 className="text-lg font-semibold">Results</h2>
                        <p className="mt-2 text-sm">AI likelihood: <span className="font-bold">{Math.round(result.score * 100)}%</span></p>
                        <p className="mt-1 text-sm text-zinc-600">{result.feedback}</p>
                    </div>
                )}
                <button
                    onClick={() => {
                        const previewText = "Rewrite the intro and section 2 to be more personal.";
                        localStorage.setItem("studynest.humanize.pending", JSON.stringify({
                            text: previewText
                        }));
                        navigate("/humanize");
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    Humanize this
                </button>
            </div>
            <Footer />
        </main>
    );
}
