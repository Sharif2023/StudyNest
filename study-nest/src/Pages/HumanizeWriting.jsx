import React, { useEffect, useRef, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import apiClient from "../apiConfig";

const HUMANIZE_USE_BACKEND = true;

export default function HumanizeWriting() {
  const [file, setFile] = useState(null);
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [tone, setTone] = useState("conversational");
  const [level, setLevel] = useState("undergrad");
  const [course, setCourse] = useState("");
  const [name, setName] = useState("");
  const [anecdotes, setAnecdotes] = useState(true);
  const [variety, setVariety] = useState(true);
  const [citations, setCitations] = useState(false);

  const dropRef = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const COLLAPSED_W = 72;
  const EXPANDED_W = 248;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem("studynest.humanize.pending"));
      if (pending?.text) { setInput(pending.text); localStorage.removeItem("studynest.humanize.pending"); }
    } catch { }
  }, []);

  useEffect(() => {
    const el = dropRef.current; if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const over = (e) => { prevent(e); el.style.borderColor = "rgba(52,211,153,0.5)"; el.style.background = "rgba(52,211,153,0.06)"; };
    const leave = (e) => { prevent(e); el.style.borderColor = "rgba(255,255,255,0.1)"; el.style.background = "rgba(255,255,255,0.03)"; };
    const drop = async (e) => { prevent(e); leave(e); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) { setInput(await f.text()); } else { setInput(""); } } };
    el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  }, []);

  async function humanize() {
    if (!input.trim() && !file) { setErr("Paste text or upload a file."); return; }
    setErr(""); setLoading(true); setOut("");
    try {
      if (HUMANIZE_USE_BACKEND) {
        const body = new FormData();
        if (file) body.append("file", file);
        body.append("text", input);
        body.append("tone", tone);
        body.append("level", level);
        body.append("course", course);
        body.append("name", name);
        body.append("anecdotes", String(anecdotes));
        body.append("variety", String(variety));
        body.append("citations", String(citations));
        const res = await apiClient.post("humanize.php", body);
        const payload = res.data;
        setOut(payload.text || "");
      } else {
        await new Promise(r => setTimeout(r, 800));
        setOut(humanizeDemo(input || `Extract text on server for ${file?.name || "file"}`, { tone, level, course, name, anecdotes, variety, citations }));
      }
    } catch (e) { setErr(e.message || "Something went wrong"); }
    finally { setLoading(false); }
  }

  const selectStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "0.35rem 0.75rem", borderRadius: "0.75rem", fontSize: "0.75rem", outline: "none" };
  const inputFieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "0.5rem 0.75rem", borderRadius: "0.75rem", fontSize: "0.75rem", width: "100%", outline: "none", marginTop: "0.25rem" };

  return (
    <main className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-80 h-64 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #34d399, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #34d399, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Humanize Writing</h1>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Transform AI-generated text into natural, human-sounding prose</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-1">
            <div ref={dropRef} className="rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              {!file ? (
                <>
                  <p className="text-xs mb-3" style={{ color: "#475569" }}>Drag & drop .txt/.md/.pdf/.docx or paste text below</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
                    Choose file
                    <input type="file" className="hidden" onChange={async e => { const f = e.target.files?.[0]; setFile(f || null); if (f && (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name))) { setInput(await f.text()); } }} />
                  </label>
                </>
              ) : (
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{file.name}</p>
                  <p className="text-xs mt-1" style={{ color: "#475569" }}>{file.type || "file"} · {(file.size / 1024).toFixed(0)} KB</p>
                  <button onClick={() => setFile(null)} className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185" }}>Remove</button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#475569" }}>Writing Options</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#64748b" }}>Tone</span>
                  <select value={tone} onChange={e => setTone(e.target.value)} style={selectStyle}>
                    {["conversational","formal","reflective"].map(t => <option key={t} value={t} style={{ background: "#0d0f1a" }}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#64748b" }}>Level</span>
                  <select value={level} onChange={e => setLevel(e.target.value)} style={selectStyle}>
                    <option value="highschool" style={{ background: "#0d0f1a" }}>High School</option>
                    <option value="undergrad" style={{ background: "#0d0f1a" }}>Undergrad</option>
                    <option value="grad" style={{ background: "#0d0f1a" }}>Graduate</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs" style={{ color: "#64748b" }}>Course</label>
                  <input value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g., CSE220" style={inputFieldStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "#64748b" }}>Your name (optional)</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Used for personal touches" style={inputFieldStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
                {[[anecdotes, setAnecdotes, "Add personal touches"],[variety, setVariety, "Vary sentence length"],[citations, setCitations, "Citation placeholders"]].map(([val, setter, lbl], i) => (
                  <label key={i} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#64748b" }}>
                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />{lbl}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={humanize} disabled={loading || (!input.trim() && !file)}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #34d399, #7c3aed)", color: "white", boxShadow: "0 8px 24px rgba(52,211,153,0.2)" }}>
              {loading ? "✨ Rewriting…" : "Humanize"}
            </button>
            {err && <div className="text-xs text-center" style={{ color: "#fb7185" }}>{err}</div>}
          </section>

          <section className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Input Text</h3>
                <button onClick={() => navigator.clipboard.writeText(input)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>Copy</button>
              </div>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={10} placeholder="Paste or type AI-generated text here…"
                className="w-full rounded-xl p-4 text-sm resize-none outline-none transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
                onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.3)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>

            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Humanized Output</h3>
                <div className="flex gap-2">
                  <button onClick={() => setOut("")} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#475569" }}>Clear</button>
                  <button onClick={() => navigator.clipboard.writeText(out)} className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>Copy</button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm min-h-[200px]" style={{ color: out ? "#94a3b8" : "#334155", fontFamily: "inherit" }}>{out || "Run Humanize to see results here."}</pre>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function humanizeDemo(text, opts) {
  const { tone = "conversational", level = "undergrad", course = "", name = "", anecdotes = true, variety = true, citations = false } = opts || {};
  if (!text || !text.trim()) return "";
  let t = text.trim().replace(/\s+/g, " ").replace(/\.(?=\S)/g, ". ");
  const sents = t.split(/(?<=[.!?])\s+/);
  const outSents = [];
  for (let i = 0; i < sents.length; i++) {
    let s = sents[i];
    if (variety && i % 5 === 2 && s.length > 120) { s = splitAtComma(s); }
    if (variety && i % 7 === 3 && i + 1 < sents.length) { s = s + " " + sents[i + 1]; i++; }
    if (tone === "conversational") { s = s.replace(/\btherefore\b/gi, "so").replace(/\bhence\b/gi, "so").replace(/\bmoreover\b/gi, "also").replace(/\butilize\b/gi, "use"); }
    else if (tone === "reflective") { s = s.replace(/\bI conclude\b/gi, "I've noticed").replace(/\bIt is clear that\b/gi, "It seems to me that"); }
    if (level === "highschool") { s = s.replace(/\bconsequently\b/gi, "as a result"); }
    else if (level === "grad") { s = s.replace(/\bvery\b/gi, "highly"); }
    outSents.push(s);
  }
  let o = outSents.join(" ");
  o = o.replace(/As an AI language model,? /gi, "").replace(/This essay will (?:discuss|explore)/gi, "Let me walk through");
  const chips = [];
  if (anecdotes) chips.push(`From my experience${name ? `, ${name}` : ""}, this made more sense when I tried a small example.`);
  if (course) chips.push(`In ${course}, we discussed this during lab, which helped connect the theory to practice.`);
  if (citations) chips.push(`[ref: add course slides / textbook page here]`);
  if (chips.length) o += "\n\n" + chips.join("\n");
  return o;
}
function splitAtComma(s) {
  const idx = s.indexOf(",");
  if (idx > 40 && idx < s.length - 20) return s.slice(0, idx + 1) + "\n" + s.slice(idx + 1).trim();
  return s;
}
