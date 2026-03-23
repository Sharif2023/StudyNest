import axios from "axios";

const BASE = import.meta?.env?.VITE_SAMPAR_URL ?? "http://127.0.0.1:5000";

export async function summarize({ text, ratio = 0.3, min_sentences = 1 }) {
  const res = await axios.post(`${BASE}/summarize`, { text, ratio, min_sentences });
  const data = res.data;
  if (!data.ok) throw new Error(data.error || "Summarize failed");
  return data;
}

export async function paraphrase({ text, strength = 0.3 }) {
  const res = await axios.post(`${BASE}/paraphrase`, { text, strength });
  const data = res.data;
  if (!data.ok) throw new Error(data.error || "Paraphrase failed");
  return data;
}
