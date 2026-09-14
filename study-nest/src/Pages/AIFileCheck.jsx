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
    const leave = (e) => { prevent(e); el.style.borderColor = "rgba(0,29,54,0.2)"; el.style.background = "rgba(255,255,255,0.03)"; };
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
    <main className="min-h-screen relative" style={{ background: "#F0F4F8", paddingLeft: sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full opacity-[0.06]" style={{ background: "transparent", filter: "none" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "transparent", filter: "none" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "transparent", color: "#001D36" }}>AI File Check</h1>
          <p className="text-sm mt-1" style={{ color: "#66625C" }}>Upload a file and get AI-powered academic feedback</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1 space-y-4">
            <div ref={dropRef} className="rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 shadow-sm" style={{ borderColor: "rgba(0,29,54,0.1)", background: "white" }}>
              {!file ? (
                <>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-inner" style={{ background: "#F0F4F8" }}>
                    <span className="text-3xl">🤖</span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-4 text-[#001D36]">Drag & drop your file</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-md transition-shadow" style={{ background: "#001D36", color: "white" }}>
                    Browse File
                    <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </label>
                  <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-[#66625C]">Supports .txt, .md, .pdf, .docx</p>
                </>
              ) : (
                <div className="text-left">
                  <p className="text-sm font-black" style={{ color: "#001D36" }}>{file.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#66625C]">{file.type || "file"} · {(file.size / 1024).toFixed(0)} KB</p>
                  {text && (
                    <div className="mt-3 rounded-xl p-4 text-xs max-h-32 overflow-auto border border-[#001D36]/5 bg-[#F0F4F8] shadow-inner font-medium text-[#001D36]">
                      <pre className="whitespace-pre-wrap font-sans">{text.slice(0, 600)}</pre>
                      {text.length > 600 && <p className="mt-2 text-[#00808C] font-bold">…truncated</p>}
                    </div>
                  )}
                  <button onClick={() => { setFile(null); setText(""); setResult(null); }} className="mt-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 hover:bg-red-100 transition-colors">Remove</button>
                </div>
              )}
            </div>

            <div className="rounded-3xl p-6 shadow-sm border border-[#001D36]/5 bg-white">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-5" style={{ color: "#66625C" }}>Analysis Options</h3>
              <div className="space-y-4">
                <Toggle label="Summarize" value={opts.summarize} onChange={v => setOpts({ ...opts, summarize: v })} />
                <Toggle label="Key Points" value={opts.keypoints} onChange={v => setOpts({ ...opts, keypoints: v })} />
                <Toggle label="Study Tips" value={opts.tips} onChange={v => setOpts({ ...opts, tips: v })} />
                <Toggle label="Grammar & Style" value={opts.grammar} onChange={v => setOpts({ ...opts, grammar: v })} />
                <Toggle label="Similarity (beta)" value={opts.similarity} onChange={v => setOpts({ ...opts, similarity: v })} />
                <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-[#001D36]">
                  <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} className="w-4 h-4 rounded border-[#001D36]/20 text-[#00808C] focus:ring-[#00808C]" />
                  Post as Anonymous
                </label>
              </div>
            </div>

            <div className="rounded-3xl p-6 shadow-sm border border-[#001D36]/5 bg-white">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: "#66625C" }}>File Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Words" value={stats.words} />
                <Metric label="Chars" value={stats.chars} />
                <Metric label="Tokens" value={stats.tokens} />
              </div>
            </div>

            <button disabled={!file || loading} onClick={runCheck}
              className="w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-40 shadow-md bg-[#00808C] hover:bg-[#00606B] text-white">
              {loading ? "⚡ Analyzing…" : "Run AI Check"}
            </button>
            {error && <div className="text-xs text-center" style={{ color: "#fb7185" }}>{error}</div>}
          </section>

          <section className="lg:col-span-2 space-y-4">
            {!result ? (
              <div className="grid place-items-center rounded-[2.5rem] border-2 border-dashed bg-white shadow-sm py-24 text-center" style={{ borderColor: "rgba(0,29,54,0.1)" }}>
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[#F0F4F8] shadow-inner">
                  <span className="text-3xl">📝</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#66625C]">Upload a file and click <span className="text-[#00808C] font-black">Run AI Check</span></p>
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
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[11px] font-bold text-[#001D36] uppercase tracking-wider">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className="relative h-6 w-11 rounded-full transition-all duration-300" style={{ background: value ? "#00808C" : "#E2E8F0" }}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-sm ${value ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-2xl p-4 text-center bg-[#F0F4F8] shadow-inner border border-[#001D36]/5">
      <div className="text-lg font-black text-[#00808C]">{value.toLocaleString()}</div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] mt-1 text-[#66625C]">{label}</div>
    </div>
  );
}
function Card({ title, content }) {
  return (
    <article className="rounded-[2rem] p-8 bg-white shadow-sm border border-[#001D36]/5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#001D36]">{title}</h3>
        {content && <CopyBtn text={content} />}
      </div>
      <pre className="whitespace-pre-wrap text-sm font-medium leading-relaxed font-sans text-[#001D36]">{content}</pre>
    </article>
  );
}
function ListCard({ title, items, icon }) {
  return (
    <article className="rounded-[2rem] p-8 bg-white shadow-sm border border-[#001D36]/5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#001D36]">{title}</h3>
        <CopyBtn text={(items || []).map((x, i) => `${i + 1}. ${x}`).join("\n")} />
      </div>
      <ul className="space-y-3">
        {(items || []).map((x, i) => (
          <li key={i} className="flex items-start gap-3 text-sm font-medium text-[#001D36]">
            <span className="mt-0.5 text-[#00808C] font-black">{icon || "▸"}</span>
            <span className="leading-relaxed">{x}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
function CopyBtn({ text }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(text || "")} className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-[#F0F4F8] text-[#66625C] hover:bg-[#001D36]/10 transition-colors">Copy</button>
  );
}
function SimilarityCard({ data }) {
  return (
    <article className="rounded-[2rem] p-8 bg-white shadow-sm border border-[#001D36]/5">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 text-[#001D36]">Similarity (beta)</h3>
      <div className="text-sm font-bold mb-5 text-[#66625C]">Overall: <strong className="text-[#E11D48] text-lg font-black">{Math.round((data.score || 0) * 100)}%</strong> similar</div>
      <ul className="space-y-4">
        {(data.matches || []).map((m, i) => (
          <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
            <div className="truncate pr-2 text-xs font-bold text-[#001D36]">{m.title}</div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-32 h-2 rounded-full overflow-hidden bg-[#F0F4F8] shadow-inner">
                <div className="h-full rounded-full bg-[#E11D48]" style={{ width: `${Math.round(m.pct)}%` }} />
              </div>
              <span className="text-xs font-black text-[#E11D48]">{Math.round(m.pct)}%</span>
              {m.link && <a className="text-[9px] font-black uppercase tracking-widest text-[#00808C] hover:underline" href={m.link} target="_blank" rel="noreferrer">Open</a>}
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
