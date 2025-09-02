import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * StudyNest — Humanize Writing
 * -------------------------------------------------------------
 * Convert AI-ish writing into a more human, personal, course-specific voice.
 * Frontend demo works without a backend (HUMANIZE_USE_BACKEND=false).
 * Wire to your server later (POST /api/humanize) for real LLM rewriting.
 *
 * Route: <Route path="/humanize" element={<HumanizeWriting/>} />
 * Handoff: set localStorage key "studynest.humanize.pending" to preload text.
 */

const HUMANIZE_USE_BACKEND = false; // set true when your backend is ready

export default function HumanizeWriting(){
  const [file, setFile] = useState(null);
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [tone, setTone] = useState("conversational"); // conversational | formal | reflective
  const [level, setLevel] = useState("undergrad");     // highschool | undergrad | grad
  const [course, setCourse] = useState("");            // e.g., CSE220
  const [name, setName] = useState("");                // optional personal name
  const [anecdotes, setAnecdotes] = useState(true);     // add personal touches
  const [variety, setVariety] = useState(true);         // vary sentence length
  const [citations, setCitations] = useState(false);    // add citation placeholders

  const dropRef = useRef(null);

  // preload if coming from another page
  useEffect(()=>{
    try{
      const pending = JSON.parse(localStorage.getItem("studynest.humanize.pending"));
      if(pending?.text){ setInput(pending.text); localStorage.removeItem("studynest.humanize.pending"); }
    }catch{}
  },[]);

  useEffect(()=>{
    const el = dropRef.current; if(!el) return;
    const prevent = (e)=>{e.preventDefault(); e.stopPropagation();};
    const over = (e)=>{prevent(e); el.classList.add("ring-emerald-500","bg-emerald-50")};
    const leave = (e)=>{prevent(e); el.classList.remove("ring-emerald-500","bg-emerald-50")};
    const drop = async (e)=>{prevent(e); leave(e); const f = e.dataTransfer.files?.[0]; if(f){ setFile(f); if(f.type.startsWith("text/")||/\.(txt|md)$/i.test(f.name)){ setInput(await f.text()); } else { setInput(""); }}};
    el.addEventListener("dragover", over); el.addEventListener("dragleave", leave); el.addEventListener("drop", drop);
    return ()=>{ el.removeEventListener("dragover", over); el.removeEventListener("dragleave", leave); el.removeEventListener("drop", drop); };
  },[]);

  async function humanize(){
    if(!input.trim() && !file){ setErr("Paste text or upload a file."); return; }
    setErr(""); setLoading(true); setOut("");
    try{
      if(HUMANIZE_USE_BACKEND){
        const body = new FormData();
        if(file) body.append("file", file);
        body.append("text", input);
        body.append("tone", tone);
        body.append("level", level);
        body.append("course", course);
        body.append("name", name);
        body.append("anecdotes", String(anecdotes));
        body.append("variety", String(variety));
        body.append("citations", String(citations));
        const res = await fetch("/api/humanize", { method: "POST", body });
        if(!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        setOut(data.text || "");
      } else {
        // client-side demo
        await new Promise(r=>setTimeout(r, 800));
        setOut(humanizeDemo(input || `Extract text on server for ${file?.name||"file"}`, {tone,level,course,name,anecdotes,variety,citations}));
      }
    }catch(e){ setErr(e.message||"Something went wrong"); }
    finally{ setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Humanize Writing</h1>
            <p className="text-sm text-zinc-600">Make AI-ish text sound more personal, specific, and course-aware.</p>
          </div>
          <a href="/home" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Dashboard</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-3">
        {/* Left: input & options */}
        <section className="space-y-4 lg:col-span-1">
          <div ref={dropRef} className="rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-center ring-1 ring-transparent bg-white">
            {!file ? (
              <>
                <div className="text-sm text-zinc-600">Drag & drop a .txt/.md/.pdf/.docx or paste text below</div>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                  Choose file
                  <input type="file" className="hidden" onChange={async e=>{const f=e.target.files?.[0]; setFile(f||null); if(f&&(f.type.startsWith("text/")||/\.(txt|md)$/i.test(f.name))){ setInput(await f.text()); }}} />
                </label>
              </>
            ) : (
              <div className="text-left">
                <div className="text-sm font-semibold text-zinc-900">{file.name}</div>
                <div className="mt-1 text-xs text-zinc-600">{file.type||"file"} • {(file.size/1024).toFixed(0)} KB</div>
                <button onClick={()=>{setFile(null);}} className="mt-2 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Remove</button>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <h3 className="text-sm font-semibold">Options</h3>
            <div className="mt-3 grid gap-3 text-sm">
              <label className="flex items-center justify-between">Tone
                <select value={tone} onChange={e=>setTone(e.target.value)} className="ml-2 rounded-lg border border-zinc-300 px-2 py-1">
                  <option value="conversational">Conversational</option>
                  <option value="formal">Formal</option>
                  <option value="reflective">Reflective</option>
                </select>
              </label>
              <label className="flex items-center justify-between">Level
                <select value={level} onChange={e=>setLevel(e.target.value)} className="ml-2 rounded-lg border border-zinc-300 px-2 py-1">
                  <option value="highschool">High school</option>
                  <option value="undergrad">Undergrad</option>
                  <option value="grad">Graduate</option>
                </select>
              </label>
              <label className="block">Course
                <input value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g., CSE220" className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1" />
              </label>
              <label className="block">Your name (optional)
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Used for personal touches" className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1" />
              </label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={anecdotes} onChange={e=>setAnecdotes(e.target.checked)} /> Add small personal touches</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={variety} onChange={e=>setVariety(e.target.checked)} /> Vary sentence length</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={citations} onChange={e=>setCitations(e.target.checked)} /> Add citation placeholders</label>
            </div>
          </div>

          <button onClick={humanize} disabled={loading || (!input.trim() && !file)} className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loading?"Rewriting…":"Humanize"}</button>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </section>

        {/* Right: editor */}
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Input</h3>
              <button onClick={()=>navigator.clipboard.writeText(input)} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Copy</button>
            </div>
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={10} placeholder="Paste or type your text here…" className="w-full rounded-lg border border-zinc-300 p-3 text-sm" />
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Humanized output</h3>
              <div className="space-x-2">
                <button onClick={()=>setOut("")} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Clear</button>
                <button onClick={()=>navigator.clipboard.writeText(out)} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50">Copy</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-zinc-800 min-h-[180px]">{out || "Run Humanize to see results here."}</pre>
          </div>
        </section>
      </div>

      <footer className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <p className="text-xs text-zinc-500">Use responsibly and follow your institution's academic integrity policy. Always review and edit the output.</p>
      </footer>
    </main>
  );
}

/* -------------------- Demo humanizer -------------------- */
function humanizeDemo(text, opts){
  const { tone, level, course, name, anecdotes, variety, citations } = opts;
  if(!text) return "";
  let t = text.trim();

  // Normalize whitespace & simple de-formalization
  t = t.replace(/\s+/g, " ").replace(/\.(?=\S)/g, ". ");

  // Split into sentences (very naive)
  const sents = t.split(/(?<=[.!?])\s+/);

  // Vary sentence lengths by joining/splitting
  let rewritten = [];
  for(let i=0;i<sents.length;i++){
    let s = sents[i];
    // Make some sentences shorter/longer
    if(variety && i%5===2 && s.length>120){ s = splitAtComma(s); }
    if(variety && i%7===3 && i+1<sents.length){ s = s + " " + sents[i+1]; i++; }

    // Tone adjustments
    if(tone === "conversational"){
      s = s.replace(/\btherefore\b/gi, "so").replace(/\bhence\b/gi, "so");
      s = s.replace(/\bmoreover\b/gi, "also").replace(/\butilize\b/gi, "use");
    } else if(tone === "reflective"){
      s = s.replace(/\bI conclude\b/gi, "I’ve noticed");
      s = s.replace(/\bIt is clear that\b/gi, "It seems to me that");
    }

    // Level tweaks
    if(level === "highschool"){
      s = s.replace(/\bconsequently\b/gi, "as a result");
    } else if(level === "grad"){
      s = s.replace(/\bvery\b/gi, "highly");
    }

    rewritten.push(s);
  }

  let out = rewritten.join(" ");

  // Insert personal touch & course context
  const chips = [];
  if(anecdotes){ chips.push(`From my experience${name?`, ${name}`:""}, this made more sense when I tried a small example.`); }
  if(course){ chips.push(`In ${course}, we discussed this during lab, which helped connect the theory to practice.`); }
  if(citations){ chips.push(`[ref: add course slides / textbook page here]`); }
  if(chips.length){ out += "\n\n" + chips.join("\n"); }

  // Light de-robotization: remove stock phrases
  out = out.replace(/As an AI language model,? /gi, "");
  out = out.replace(/This essay will (?:discuss|explore)/gi, "Let me walk through");

  return out;
}

function splitAtComma(s){
  const idx = s.indexOf(",");
  if(idx>40 && idx<s.length-20){ return s.slice(0,idx+1) + "\n" + s.slice(idx+1).trim(); }
  return s;
}
