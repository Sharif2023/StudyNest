import React, { useEffect, useState } from "react";
import { summarize, paraphrase } from "../lib/samparClient";

export default function SummarizingParaphrasing({ open, onClose }) {
  const [mode, setMode] = useState("summarize"); // "summarize" | "paraphrase"
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState(0.3);
  const [minSentences, setMinSentences] = useState(1);
  const [strength, setStrength] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  // prevent background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setOutput("");
    try {
      if (mode === "summarize") {
        const res = await summarize({
          text,
          ratio: Number(ratio),
          min_sentences: Number(minSentences),
        });
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-2xl mx-auto rounded-xl sm:rounded-2xl border border-[#001D36]/10 bg-white text-[#001D36] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-[#001D36]/10 bg-white shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-[#001D36]">Summarizer &amp; Paraphraser</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-content-center rounded-lg bg-[#F0F4F8] hover:bg-[#001D36]/10 text-[#66625C] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#66625C] mb-2">
              Select Mode
            </label>
            <div className="flex items-center gap-2 bg-[#F0F4F8] p-1 rounded-xl w-fit">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === "summarize"
                    ? "bg-white text-[#001D36] shadow-sm"
                    : "text-[#66625C] hover:text-[#001D36] hover:bg-black/5"
                }`}
                onClick={() => setMode("summarize")}
              >
                Summarize
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === "paraphrase"
                    ? "bg-white text-[#001D36] shadow-sm"
                    : "text-[#66625C] hover:text-[#001D36] hover:bg-black/5"
                }`}
                onClick={() => setMode("paraphrase")}
              >
                Paraphrase
              </button>
            </div>
          </div>

          {/* input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#66625C] mb-2">Input Text</label>
            <textarea
              className="w-full min-h-[140px] max-h-[50vh] p-4 rounded-xl bg-[#F0F4F8] border border-[#001D36]/10 text-[#001D36] focus:outline-none focus:bg-white focus:border-[#00808C]/40 resize-y transition-all text-sm shadow-inner"
              placeholder="Paste or write your text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* controls */}
          <div className="p-4 rounded-xl border border-[#001D36]/5 bg-[#001D36]/[0.02]">
            {mode === "summarize" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#66625C] mb-1.5">
                    Length Ratio (0.1–0.9)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="0.9"
                    className="w-full p-2.5 rounded-lg bg-white border border-[#001D36]/10 text-sm outline-none focus:border-[#00808C]/40"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#66625C] mb-1.5">
                    Minimum Sentences
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2.5 rounded-lg bg-white border border-[#001D36]/10 text-sm outline-none focus:border-[#00808C]/40"
                    value={minSentences}
                    onChange={(e) => setMinSentences(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#66625C] mb-1.5">
                  Variation Strength (0.1–1.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1"
                  className="w-full p-2.5 rounded-lg bg-white border border-[#001D36]/10 text-sm outline-none focus:border-[#00808C]/40"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setText("");
                setOutput("");
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-[#F0F4F8] text-[#66625C] hover:bg-[#001D36]/10"
            >
              Clear
            </button>
            <button
              onClick={run}
              disabled={loading || !text.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 bg-[#00808C] text-white shadow-md hover:bg-[#00808C]/90 disabled:shadow-none"
            >
              {loading ? "Processing…" : mode === "summarize" ? "Summarize Text" : "Paraphrase Text"}
            </button>
          </div>

          {/* output */}
          {output && (
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#00808C] mb-2">Output Result</label>
              <textarea
                readOnly
                className="w-full min-h-[120px] max-h-[40vh] p-4 rounded-xl bg-white border-2 border-[#00808C]/20 resize-y text-sm text-[#001D36] shadow-sm outline-none"
                value={output}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
