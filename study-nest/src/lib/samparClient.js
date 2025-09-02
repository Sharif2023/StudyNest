const BASE = import.meta?.env?.VITE_SAMPAR_URL ?? "http://127.0.0.1:5000";

export async function summarize({ text, ratio = 0.3, min_sentences = 1 }) {
  const res = await fetch(`${BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ratio, min_sentences }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Summarize failed");
  return data;
}

export async function paraphrase({ text, strength = 0.3 }) {
  const res = await fetch(`${BASE}/paraphrase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, strength }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Paraphrase failed");
  return data;
}
