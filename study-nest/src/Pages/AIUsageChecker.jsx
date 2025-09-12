import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

export default function AIUsageChecker() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef();

    //leftBar
    const [navOpen, setNavOpen] = useState(false);
    const [anonymous, setAnonymous] = useState(false);

    // Match LeftNav’s expected widths
    const COLLAPSED_W = 72;   // px
    const EXPANDED_W = 248;  // px
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

            const res = await fetch("http://localhost:8000/src/api/check_ai.php", {
                method: "POST",
                body: form,
            });

            const text = await res.text(); // read raw text first
            let data;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (e) {
                throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 300)}`);
            }

            if (!res.ok) {
                throw new Error(data?.error || `HTTP ${res.status}`);
            }

            setResult({ score: data.score, feedback: data.feedback });
        } catch (err) {
            setResult({
                score: 0,
                feedback:
                    err?.message ||
                    "Request failed. Check the Network tab for the response body.",
            });
        } finally {
            setLoading(false);
        }
    }



    return (
        <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl" style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}>
            <LeftNav
                navOpen={navOpen}
                setNavOpen={setNavOpen}
                anonymous={anonymous}
                setAnonymous={setAnonymous}
                sidebarWidth={sidebarWidth}
            />
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
                    disabled={!result}
                    onClick={() => {
                        localStorage.setItem(
                            "studynest.humanize.pending",
                            JSON.stringify({
                                text: result?.excerpt || "Please paste the text you want to humanize.",
                                notes: result?.feedback, // optional: carry tips forward
                            })
                        );
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
