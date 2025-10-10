import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
/**
 * StudyNest — AI File Check
 * -------------------------------------------------------------
 * Frontend-only page to let users upload a file and get AI feedback.
 * You can wire it to your backend later (e.g., /api/ai-file-check).
 *
 * Features:
 * - Drag & drop file or picker (txt, md, pdf, docx supported via backend)
 * - Options: summarize, key points, study tips, grammar/style, similarity hint
 * - Anonymous toggle (do not store user identity)
 * - Word/char counts & coarse token estimate
 * - Progress UI and results sections with copy buttons
 * - Local demo mode fallback (no backend) to preview the UX
 *
 * Route: <Route path="/ai-check" element={<AIFileCheck/>} />
 */

const DEMO_MODE = false; // set false when you have a backend endpoint

export default function AIFileCheck() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [opts, setOpts] = useState({ summarize: true, keypoints: true, tips: true, grammar: true, similarity: false });
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const dropRef = useRef(null);

  //leftBar
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // Match LeftNav’s expected widths
  const COLLAPSED_W = 72;   // px
  const EXPANDED_W = 248;  // px
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  // File drop handlers
  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const over = (e) => { prevent(e); el.classList.add("ring-emerald-500", "bg-emerald-50"); };
    const leave = (e) => { prevent(e); el.classList.remove("ring-emerald-500", "bg-emerald-50"); };
    const drop = async (e) => { prevent(e); leave(e); const f = e.dataTransfer.files?.[0]; if (f) await handleFile(f); };
    el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  }, []);

  async function handleFile(f) {
    setError(""); setResult(null); setFile(f);
    if (f.type.startsWith("text/") || /\.(md|txt)$/i.test(f.name)) {
      const content = await f.text(); setText(content);
    } else {
      // For binary (pdf/docx), send to backend as-is; we'll show name only.
      setText("");
    }
  }

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const tokens = Math.ceil(chars / 4); // rough estimate
    return { words, chars, tokens };
  }, [text]);

  async function runCheck() {
    if (!file) { setError("Please select a file first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      if (DEMO_MODE) {
        // Simulate latency & return demo analysis
        await new Promise(r => setTimeout(r, 1200));
        setResult(makeDemoResult(file, text, opts));
      } else {
        const body = new FormData();
        body.append("file", file);
        body.append("options", JSON.stringify(opts));
        body.append("anonymous", String(anon));
        if (text) body.append("text", text);

        const res = await fetch("http://localhost/studynest/study-nest/src/api/AIFileCheck.php", {
          method: "POST",
          body
        });

        let data = null;
        try { data = await res.json(); } catch { }
        if (!res.ok) {
          throw new Error(data?.error || `Server error ${res.status}`);
        }
        setResult(data);
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
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
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-3">
        {/* Left: uploader & options */}
        <section className="lg:col-span-1 space-y-4">
          <div ref={dropRef} className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center ring-1 ring-transparent transition bg-white">
            {!file ? (
              <>
                <div className="text-3xl">🤖</div>
                <p className="mt-2 text-sm text-zinc-600">Drag & drop your file here</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                  Choose file
                  <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
                <p className="mt-2 text-xs text-zinc-500">Supports .txt, .md, .pdf, .docx (pdf/docx require backend extraction)</p>
              </>
            ) : (
              <div className="text-left">
                <div className="text-sm font-semibold text-zinc-900">{file.name}</div>
                <div className="mt-1 text-xs text-zinc-600">{file.type || "file"} • {(file.size / 1024).toFixed(0)} KB</div>
                {text && (
                  <div className="mt-2 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 max-h-40 overflow-auto ring-1 ring-zinc-200">
                    <pre className="whitespace-pre-wrap">{text.slice(0, 1000)}</pre>
                    {text.length > 1000 && <div className="mt-1 opacity-60">…truncated preview…</div>}
                  </div>
                )}
                <button onClick={() => { setFile(null); setText(""); setResult(null); }} className="mt-3 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Remove</button>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900">Options</h3>
            <div className="mt-2 space-y-2 text-sm text-zinc-700">
              <Toggle label="Summarize" value={opts.summarize} onChange={v => setOpts({ ...opts, summarize: v })} />
              <Toggle label="Key points" value={opts.keypoints} onChange={v => setOpts({ ...opts, keypoints: v })} />
              <Toggle label="Study tips" value={opts.tips} onChange={v => setOpts({ ...opts, tips: v })} />
              <Toggle label="Grammar & style" value={opts.grammar} onChange={v => setOpts({ ...opts, grammar: v })} />
              <Toggle label="Similarity hint (beta)" value={opts.similarity} onChange={v => setOpts({ ...opts, similarity: v })} />
              <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} /> Post as Anonymous (do not attach identity)
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 text-sm">
            <h3 className="text-sm font-semibold text-zinc-900">Counts</h3>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Metric label="Words" value={stats.words} />
              <Metric label="Chars" value={stats.chars} />
              <Metric label="~Tokens" value={stats.tokens} />
            </div>
          </div>

          <button disabled={!file || loading} onClick={runCheck} className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Analyzing…" : "Run AI Check"}
          </button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </section>

        {/* Right: results */}
        <section className="lg:col-span-2 space-y-4">
          {!result ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 py-16 text-center text-sm text-zinc-600">
              Upload a file and click <span className="mx-1 font-semibold">Run AI Check</span>.
            </div>
          ) : (
            <div className="space-y-4">
              {result.summary && <Card title="Summary" content={result.summary} />}
              {result.keypoints && <ListCard title="Key points" items={result.keypoints} />}
              {result.tips && <ListCard title="Study tips" items={result.tips} icon="💡" />}
              {result.grammar && <Card title="Grammar & style" content={result.grammar} />}
              {result.similarity && <SimilarityCard data={result.similarity} />}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}

/* -------------------- UI bits -------------------- */
function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={"h-6 w-11 rounded-full transition " + (value ? "bg-emerald-600" : "bg-zinc-300")}>
        <span className={"block h-5 w-5 rounded-full bg-white transition translate-y-0.5 " + (value ? "translate-x-6" : "translate-x-0.5")}></span>
      </button>
    </label>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-zinc-200">
      <div className="text-lg font-bold text-emerald-600">{value}</div>
      <div className="text-xs text-zinc-600">{label}</div>
    </div>
  );
}
function Card({ title, content }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {content && <CopyBtn text={content} />}
      </div>
      <div className="prose prose-sm max-w-none text-zinc-800"><pre className="whitespace-pre-wrap">{content}</pre></div>
    </article>
  );
}
function ListCard({ title, items, icon }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <CopyBtn text={(items || []).map((x, i) => `${i + 1}. ${x}`).join("\n")} />
      </div>
      <ul className="list-disc pl-5 text-sm text-zinc-800 space-y-1">
        {(items || []).map((x, i) => (
          <li key={i}><span className="mr-1">{icon || "•"}</span>{x}</li>
        ))}
      </ul>
    </article>
  );
}
function CopyBtn({ text }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(text || "")} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Copy</button>
  );
}
function SimilarityCard({ data }) {
  // data: {score:0-1, matches:[{title, pct, link?}]}
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <h3 className="text-sm font-semibold text-zinc-900">Similarity (beta)</h3>
      <div className="mt-2 text-sm text-zinc-700">Overall: <strong>{Math.round((data.score || 0) * 100)}%</strong> similar</div>
      <ul className="mt-2 space-y-2">
        {(data.matches || []).map((m, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <div className="truncate pr-2">{m.title}</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded bg-zinc-200 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${Math.round(m.pct)}%` }} /></div>
              <span className="text-xs text-zinc-600">{Math.round(m.pct)}%</span>
              {m.link && <a className="text-xs font-semibold underline" href={m.link} target="_blank" rel="noreferrer">open</a>}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* -------------------- Demo generator -------------------- */
function makeDemoResult(file, text, opts) {
  const base = text || `Demo content from ${file.name}`;
  return {
    summary: opts.summarize ? `This file covers the core ideas in a concise way. It appears to introduce the topic, explain 2–3 main concepts, and end with a brief recap.\n\nFocus areas:\n• Define key terms clearly\n• Connect sections with transitions\n• Add 1–2 concrete examples` : undefined,
    keypoints: opts.keypoints ? [
      "Main thesis is introduced within the first 2 paragraphs",
      "Three supporting arguments: A, B, C",
      "Includes definitions but needs examples",
      "Conclusion could link back to intro more strongly",
    ] : undefined,
    tips: opts.tips ? [
      "Add headings (H2/H3) to break long sections",
      "Replace passive voice in 3–4 sentences",
      "Include a short summary box per section",
      "Add 2 practice questions at the end",
    ] : undefined,
    grammar: opts.grammar ? `Style notes:\n- Prefer active voice where possible\n- Standardize capitalization for headings\n- Watch for run‑on sentences in section 2\n\nTypos (sample):\n- 'occured' → 'occurred'\n- 'recommand' → 'recommend'` : undefined,
    similarity: opts.similarity ? {
      score: 0.21,
      matches: [
        { title: "Intro to Topic (Lecture 3 notes)", pct: 18, link: "#" },
        { title: "Wikipedia overview", pct: 12, link: "https://wikipedia.org" },
        { title: "Peer study guide", pct: 9 },
      ],
    } : undefined,
  };
}
