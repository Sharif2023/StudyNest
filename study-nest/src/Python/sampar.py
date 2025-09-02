#Run with:
# python -m venv .venv
# .venv\Scripts\activate
 #Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
# Press Ctrl+Shift+P → Python: Select Interpreter → choose: .venv\Scripts\python.exe
# pip install -r flask flask-cors nltk
# python sampar.py


# sampar.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import math
import random

# --------------------------------------------
# Optional: better paraphrasing via NLTK WordNet
# --------------------------------------------
USE_NLTK = False
try:
    import nltk
    from nltk.corpus import wordnet as wn
    USE_NLTK = True
except Exception:
    USE_NLTK = False

app = Flask(__name__)
# Allow requests from your React dev server (and others during dev)
CORS(app)

# --------------------------------------------
# Data & Utilities
# --------------------------------------------
STOPWORDS = {
    "the", "and", "is", "in", "it", "of", "to", "a", "an", "that", "this",
    "on", "for", "with", "as", "are", "was", "were", "by", "be", "or", "from",
    "at", "which", "but", "not", "have", "has", "had", "they", "you", "we",
    "he", "she", "his", "her"
}

# Small fallback thesaurus (used if NLTK WordNet is unavailable)
FALLBACK_SYNS = {
    "good": ["great", "nice", "excellent", "solid"],
    "bad": ["poor", "subpar", "weak"],
    "important": ["crucial", "vital", "key"],
    "use": ["utilize", "employ", "apply"],
    "help": ["assist", "aid", "support"],
    "show": ["display", "present", "reveal"],
    "change": ["modify", "alter", "transform"],
    "make": ["create", "produce", "build"],
    "need": ["require", "necessitate"],
    "find": ["discover", "locate"],
    "get": ["obtain", "acquire"],
    "big": ["large", "substantial", "considerable"],
    "small": ["tiny", "compact", "minor"],
    "start": ["begin", "commence", "initiate"]
}

def split_sentences(text: str):
    text = text.strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def summarize_text(text: str, ratio: float = 0.3, min_sentences: int = 1):
    sentences = split_sentences(text)
    if len(sentences) <= min_sentences:
        return sentences

    words = re.findall(r'\w+', text.lower())
    freqs = {}
    for w in words:
        if w in STOPWORDS:
            continue
        freqs[w] = freqs.get(w, 0) + 1

    if freqs:
        maxf = max(freqs.values())
        for w in freqs:
            freqs[w] = freqs[w] / maxf

    sent_scores = []
    for s in sentences:
        s_words = re.findall(r'\w+', s.lower())
        score = 0.0
        for w in s_words:
            score += freqs.get(w, 0)
        score = score / (len(s_words) ** 0.5) if s_words else 0
        sent_scores.append((s, score))

    k = max(min_sentences, int(math.ceil(len(sentences) * ratio)))
    k = min(k, len(sentences))

    top_sentences = sorted(sent_scores, key=lambda x: x[1], reverse=True)[:k]
    chosen = set(s for s, _ in top_sentences)
    summary = [s for s in sentences if s in chosen]
    return summary

def synonym_for(word: str) -> str:
    if USE_NLTK:
        try:
            synsets = wn.synsets(word)
            for s in synsets:
                for lemma in s.lemmas():
                    name = lemma.name().replace('_', ' ')
                    if name.lower() != word and ' ' not in name:
                        return name
            if synsets:
                name = synsets[0].lemmas()[0].name().replace('_', ' ')
                return name
        except LookupError:
            # WordNet data might not be downloaded; fall back.
            pass
        except Exception:
            pass

    if word.lower() in FALLBACK_SYNS:
        return random.choice(FALLBACK_SYNS[word.lower()])

    if word.endswith("ing") and len(word) > 4:
        return word[:-3]
    return word

def paraphrase_text(text: str, strength: float = 0.3) -> str:
    sentences = split_sentences(text)
    paraphrased = []
    for s in sentences:
        tokens = re.findall(r"\w+|\W+", s)
        new_tokens = []
        for t in tokens:
            if re.match(r'^\w+$', t):
                if random.random() < strength:
                    candidate = synonym_for(t.lower())
                    if t[0].isupper():
                        candidate = candidate.capitalize()
                    new_tokens.append(candidate)
                else:
                    new_tokens.append(t)
            else:
                new_tokens.append(t)
        new_s = "".join(new_tokens)
        paraphrased.append(new_s)

    if len(paraphrased) > 1 and random.random() < 0.2 * strength:
        random.shuffle(paraphrased)
    return " ".join(paraphrased)

# --------------------------------------------
# Routes
# --------------------------------------------
@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "ok": True,
        "service": "sampar",
        "endpoints": {
            "POST /summarize": {"text": "string", "ratio": "float (0-1)", "min_sentences": "int >=1"},
            "POST /paraphrase": {"text": "string", "strength": "float (0-1)"},
            "GET /health": {}
        },
        "nltk_wordnet": USE_NLTK
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "nltk_wordnet": USE_NLTK})

@app.route("/summarize", methods=["POST"])
def api_summarize():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    try:
        ratio = float(data.get("ratio", 0.3))
    except Exception:
        ratio = 0.3
    try:
        min_sentences = int(data.get("min_sentences", 1))
    except Exception:
        min_sentences = 1

    if not text:
        return jsonify({"ok": False, "error": "No text provided."}), 400

    ratio = max(0.05, min(0.95, ratio))
    min_sentences = max(1, min_sentences)

    summary_sentences = summarize_text(text, ratio=ratio, min_sentences=min_sentences)
    summary = " ".join(summary_sentences)
    return jsonify({"ok": True, "summary": summary, "sentences": summary_sentences})

@app.route("/paraphrase", methods=["POST"])
def api_paraphrase():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    try:
        strength = float(data.get("strength", 0.3))
    except Exception:
        strength = 0.3

    if not text:
        return jsonify({"ok": False, "error": "No text provided."}), 400

    strength = max(0.0, min(1.0, strength))
    para = paraphrase_text(text, strength=strength)
    return jsonify({"ok": True, "paraphrase": para})

# --------------------------------------------
# Entrypoint
# --------------------------------------------
if __name__ == "__main__":
    print("Starting summarizer/paraphraser on http://127.0.0.1:5173")
    if USE_NLTK:
        print("NLTK WordNet support: available")
    else:
        print("NLTK WordNet support: NOT available (using fallback synonyms)")
    # Host defaults to 127.0.0.1 for dev; change to "0.0.0.0" if you need LAN access.
    app.run(host="127.0.0.1", port=5000, debug=True)
