import React, { useState } from "react";
import { summarize, paraphrase } from "../lib/samparClient";

export default function SummarizingParaphrasing({ open, onClose }) {
  const [mode, setMode] = useState("summarize"); // "summarize" | "paraphrase"
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState(0.3);
  const [minSentences, setMinSentences] = useState(1);
  const [strength, setStrength] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setOutput("");
    try {
      if (mode === "summarize") {
        const res = await summarize({ text, ratio: Number(ratio), min_sentences: Number(minSentences) });
        setOutput(res.summary || "");
      } else {
        const res = await paraphrase({ text, strength: Number(strength) });
        setOutput(res.paraphrase || "");
      }
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">Paraphrasing & Summarizing</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-content-center rounded-lg bg-slate-800 hover:bg-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* mode */}
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg border ${mode === "summarize" ? "bg-cyan-600 border-cyan-500" : "bg-slate-800 border-slate-700"}`}
              onClick={() => setMode("summarize")}
            >
              Summarize
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg border ${mode === "paraphrase" ? "bg-cyan-600 border-cyan-500" : "bg-slate-800 border-slate-700"}`}
              onClick={() => setMode("paraphrase")}
            >
              Paraphrase
            </button>
          </div>

          {/* input */}
          <div>
            <label className="block text-sm mb-1 text-slate-300">Input Text</label>
            <textarea
              className="w-full min-h-[140px] p-3 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              placeholder="Paste or write your text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* controls */}
          {mode === "summarize" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-slate-300">Ratio (0.1–0.9)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="0.9"
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-300">Min Sentences</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700"
                  value={minSentences}
                  onChange={(e) => setMinSentences(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1 text-slate-300">Strength (0.1–1.0)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1"
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
              />
            </div>
          )}

          {/* actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={run}
              disabled={loading || !text.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 disabled:opacity-60"
            >
              {loading ? "Processing…" : mode === "summarize" ? "Summarize" : "Paraphrase"}
            </button>
            <button
              onClick={() => { setText(""); setOutput(""); }}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
            >
              Clear
            </button>
          </div>

          {/* output */}
          <div>
            <label className="block text-sm mb-1 text-slate-300">Output</label>
            <textarea
              readOnly
              className="w-full min-h-[120px] p-3 rounded-lg bg-slate-900 border border-slate-700"
              value={output}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
