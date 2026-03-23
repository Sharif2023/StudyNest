
import React, { useState } from "react";
import { parseTags, timeAgo, formatVotes } from "./QnAUtils";
import { 
  XIcon, 
  Avatar, 
  IconButton, 
  ChevronUp, 
  ChevronDown, 
  Check 
} from "./QnAComponents";

export function AskQuestionModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    onCreate({ title: title.trim(), body: body.trim(), tags: parseTags(tags), anonymous, author: "You" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full mx-auto max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: "rgba(13,15,26,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ask a question</h2>
          <button onClick={onClose} className="rounded-md p-2 text-slate-300 hover:bg-[rgba(255,255,255,0.05)]" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., What is the intuition behind Dijkstra's algorithm?"
              className="w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share what you've tried and where you're stuck…"
              className="w-full resize-y rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cse220, graph, algorithm"
              className="w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-300">Comma‑separated. Keep it specific so others can find it.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-white/10 text-emerald-600 focus:ring-emerald-500" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Post anonymously
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-[rgba(255,255,255,0.03)]">Cancel</button>
          <button onClick={submit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Post question
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionDrawer({ question, onClose, onAddAnswer, onVoteAnswer, onPeerReview, onAccept }) {
  const [answer, setAnswer] = useState("");
  const [anon, setAnon] = useState(false);

  const getCurrentUserId = () => {
    try {
      const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
      return auth.id || auth.userId || auth.user_id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  const currentUserId = getCurrentUserId();
  const isQuestionOwner = currentUserId && question && question.questionOwnerId != null &&
    question.questionOwnerId.toString() === currentUserId.toString();

  if (!question) return null;

  const submitAnswer = () => {
    if (!answer.trim()) return;
    onAddAnswer(question.id, { body: answer.trim(), author: anon ? "Anonymous" : "You" });
    setAnswer("");
    setAnon(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-3xl overflow-y-auto shadow-2xl"
        style={{ background: "rgba(13, 17, 28, 0.98)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 px-5 py-3" 
           style={{ background: "rgba(13, 17, 28, 0.5)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md p-2 text-slate-300 hover:bg-[rgba(255,255,255,0.05)]" aria-label="Close">
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-semibold text-slate-200">Question details</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 text-xs">#{t}</span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          <h2 className="text-xl font-semibold text-white">{question.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <Avatar name={question.anonymous ? "Anonymous" : question.author} />
            <span>•</span>
            <span>{timeAgo(question.createdAt)}</span>
            <span>•</span>
            <span className="rounded-full bg-[rgba(255,255,255,0.05)] px-2 py-0.5">{question.answers.length} answers</span>
            {isQuestionOwner && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 text-xs">Your question</span>
            )}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-200">{question.body}</p>
        </div>

        <div className="border-t border-white/5 px-5 py-4" style={{ background: "rgba(255,255,255,0.02)" }}>
          <h3 className="text-sm font-semibold text-white">Your answer</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Be clear and share the reasoning. Cite sources if needed."
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-white/10 text-emerald-600 focus:ring-emerald-500" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              Post anonymously
            </label>
            <button onClick={submitAnswer} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Post answer</button>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Answers <span className="text-slate-300">({question.answers.length})</span></h3>
          <ul className="mt-3 space-y-4">
            {question.answers.map((a) => (
              <li key={a.id} className="rounded-2xl p-4 transition-all duration-300" 
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-start gap-4">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2" 
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <IconButton label="Upvote" onClick={() => onVoteAnswer(question.id, a.id, +1)} pressed={a.user_vote === 1}>
                      <ChevronUp className="h-4 w-4" style={{ color: a.user_vote === 1 ? "#a78bfa" : "#475569" }} />
                    </IconButton>
                    <div className="my-1 text-sm font-bold tabular-nums" style={{ color: "#e2e8f0" }}>{formatVotes(a.votes)}</div>
                    <IconButton label="Downvote" onClick={() => onVoteAnswer(question.id, a.id, -1)} pressed={a.user_vote === -1}>
                      <ChevronDown className="h-4 w-4" style={{ color: a.user_vote === -1 ? "#fb7185" : "#475569" }} />
                    </IconButton>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                      <Avatar name={a.author} />
                      {a.isAccepted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          <Check className="h-3.5 w-3.5" /> Accepted
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{a.body}</p>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onPeerReview(question.id, a.id)}
                        className={"rounded-full border px-3 py-1 font-semibold transition-all duration-200 " + 
                          (a.user_helpful 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                            : "border-white/10 text-slate-200 hover:bg-[rgba(255,255,255,0.02)]")}
                      >
                        Helpful ({a.helpful})
                      </button>

                      {isQuestionOwner && !a.isAccepted && (
                        <button
                          onClick={() => onAccept(question.id, a.id)}
                          className="rounded-full border border-green-600 bg-green-600 px-3 py-1 font-semibold text-white hover:bg-green-700"
                        >
                          Accept Answer
                        </button>
                      )}

                      {isQuestionOwner && a.isAccepted && (
                        <button
                          onClick={() => onAccept(question.id, null)}
                          className="rounded-full border border-red-600 bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700"
                        >
                          Unaccept Answer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
