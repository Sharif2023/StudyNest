import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import apiClient from "../apiConfig";

const DEMO_MODE = false;

export default function AIFileCheck() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [opts, setOpts] = useState({ summarize: true, keypoints: true, tips: true, grammar: true, similarity: false });
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const dropRef = useRef(null);

  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const COLLAPSED_W = 72;
  const EXPANDED_W = 248;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const over = (e) => { prevent(e); el.style.borderColor = "rgba(124,58,237,0.5)"; el.style.background = "rgba(124,58,237,0.08)"; };
    const leave = (e) => { prevent(e); el.style.borderColor = "rgba(255,255,255,0.1)"; el.style.background = "rgba(255,255,255,0.03)"; };
    const drop = async (e) => { prevent(e); leave(e); const f = e.dataTransfer.files?.[0]; if (f) await handleFile(f); };
    el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  }, []);

  async function handleFile(f) {
    setError(""); setResult(null); setFile(f);
    if (f.type.startsWith("text/") || /\.(md|txt)$/i.test(f.name)) {
      const content = await f.text(); setText(content);
    } else { setText(""); }
  }

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const tokens = Math.ceil(chars / 4);
    return { words, chars, tokens };
  }, [text]);

  async function runCheck() {
    if (!file) { setError("Please select a file first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 1200));
        setResult(makeDemoResult(file, text, opts));
      } else {
        const body = new FormData();
        body.append("file", file);
        body.append("options", JSON.stringify(opts));
        body.append("anonymous", String(anon));
        if (text) body.append("text", text);
        const res = await apiClient.post("AIFileCheck.php", body);
        let data = res.data;
        setResult(data);
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #a78bfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI File Check</h1>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Upload a file and get AI-powered academic feedback</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1 space-y-4">
            <div ref={dropRef} className="rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              {!file ? (
                <>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                    <span className="text-2xl">🤖</span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: "#475569" }}>Drag & drop your file here</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                    Choose file
                    <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </label>
                  <p className="mt-3 text-xs" style={{ color: "#334155" }}>Supports .txt, .md, .pdf, .docx</p>
                </>
              ) : (
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{file.name}</p>
                  <p className="mt-1 text-xs" style={{ color: "#475569" }}>{file.type || "file"} · {(file.size / 1024).toFixed(0)} KB</p>
                  {text && (
                    <div className="mt-2 rounded-xl p-3 text-xs max-h-32 overflow-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
                      <pre className="whitespace-pre-wrap">{text.slice(0, 600)}</pre>
                      {text.length > 600 && <p className="mt-1 opacity-60">…truncated</p>}
                    </div>
                  )}
                  <button onClick={() => { setFile(null); setText(""); setResult(null); }} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>Remove</button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#475569" }}>Analysis Options</h3>
              <div className="space-y-3">
                <Toggle label="Summarize" value={opts.summarize} onChange={v => setOpts({ ...opts, summarize: v })} />
                <Toggle label="Key Points" value={opts.keypoints} onChange={v => setOpts({ ...opts, keypoints: v })} />
                <Toggle label="Study Tips" value={opts.tips} onChange={v => setOpts({ ...opts, tips: v })} />
                <Toggle label="Grammar & Style" value={opts.grammar} onChange={v => setOpts({ ...opts, grammar: v })} />
                <Toggle label="Similarity (beta)" value={opts.similarity} onChange={v => setOpts({ ...opts, similarity: v })} />
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#475569" }}>
                  <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} />
                  Post as Anonymous
                </label>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#475569" }}>File Stats</h3>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Words" value={stats.words} />
                <Metric label="Chars" value={stats.chars} />
                <Metric label="~Tokens" value={stats.tokens} />
              </div>
            </div>

            <button disabled={!file || loading} onClick={runCheck}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7c3aed, #22d3ee)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
              {loading ? "⚡ Analyzing…" : "Run AI Check"}
            </button>
            {error && <div className="text-xs text-center" style={{ color: "#fb7185" }}>{error}</div>}
          </section>

          <section className="lg:col-span-2 space-y-4">
            {!result ? (
              <div className="grid place-items-center rounded-3xl border-2 border-dashed py-20 text-center" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <span className="text-2xl">🤖</span>
                </div>
                <p className="text-sm" style={{ color: "#334155" }}>Upload a file and click <span className="font-bold" style={{ color: "#a78bfa" }}>Run AI Check</span></p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.summary && <Card title="Summary" content={result.summary} />}
                {result.keypoints && <ListCard title="Key Points" items={result.keypoints} />}
                {result.tips && <ListCard title="Study Tips" items={result.tips} icon="💡" />}
                {result.grammar && <Card title="Grammar & Style" content={result.grammar} />}
                {result.similarity && <SimilarityCard data={result.similarity} />}
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs" style={{ color: "#64748b" }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)} className="relative h-5 w-9 rounded-full transition-all duration-300" style={{ background: value ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)", border: `1px solid ${value ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}` }}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-sm ${value ? "left-4" : "left-0.5"}`} />
      </button>
    </label>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-base font-black" style={{ color: "#a78bfa" }}>{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#475569" }}>{label}</div>
    </div>
  );
}
function Card({ title, content }) {
  return (
    <article className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>{title}</h3>
        {content && <CopyBtn text={content} />}
      </div>
      <pre className="whitespace-pre-wrap text-sm" style={{ color: "#94a3b8", fontFamily: "inherit" }}>{content}</pre>
    </article>
  );
}
function ListCard({ title, items, icon }) {
  return (
    <article className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>{title}</h3>
        <CopyBtn text={(items || []).map((x, i) => `${i + 1}. ${x}`).join("\n")} />
      </div>
      <ul className="space-y-2">
        {(items || []).map((x, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5" style={{ color: "#a78bfa" }}>{icon || "▸"}</span>
            <span style={{ color: "#94a3b8" }}>{x}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
function CopyBtn({ text }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(text || "")} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>Copy</button>
  );
}
function SimilarityCard({ data }) {
  return (
    <article className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Similarity (beta)</h3>
      <div className="text-sm mb-3" style={{ color: "#94a3b8" }}>Overall: <strong style={{ color: "#a78bfa" }}>{Math.round((data.score || 0) * 100)}%</strong> similar</div>
      <ul className="space-y-3">
        {(data.matches || []).map((m, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <div className="truncate pr-2 text-xs" style={{ color: "#64748b" }}>{m.title}</div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round(m.pct)}%`, background: "linear-gradient(90deg, #7c3aed, #22d3ee)" }} />
              </div>
              <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>{Math.round(m.pct)}%</span>
              {m.link && <a className="text-xs font-bold" href={m.link} target="_blank" rel="noreferrer" style={{ color: "#22d3ee" }}>open</a>}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function makeDemoResult(file, text, opts) {
  return {
    summary: opts.summarize ? `This file covers the core ideas in a concise way. It appears to introduce the topic, explain 2–3 main concepts, and end with a brief recap.\n\nFocus areas:\n• Define key terms clearly\n• Connect sections with transitions\n• Add 1–2 concrete examples` : undefined,
    keypoints: opts.keypoints ? ["Main thesis is introduced within the first 2 paragraphs", "Three supporting arguments: A, B, C", "Includes definitions but needs examples", "Conclusion could link back to intro more strongly"] : undefined,
    tips: opts.tips ? ["Add headings (H2/H3) to break long sections", "Replace passive voice in 3–4 sentences", "Include a short summary box per section", "Add 2 practice questions at the end"] : undefined,
    grammar: opts.grammar ? `Style notes:\n- Prefer active voice where possible\n- Standardize capitalization for headings\n- Watch for run‑on sentences in section 2` : undefined,
    similarity: opts.similarity ? { score: 0.21, matches: [{ title: "Intro to Topic (Lecture 3 notes)", pct: 18, link: "#" }, { title: "Wikipedia overview", pct: 12, link: "https://wikipedia.org" }, { title: "Peer study guide", pct: 9 }] } : undefined,
  };
}
