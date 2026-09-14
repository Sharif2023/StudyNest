
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
        style={{ background: "rgba(255,255,255,0.98)", border: "1px solid rgba(0,29,54,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ask a question</h2>
          <button onClick={onClose} className="rounded-md p-2 text-[#001D36] hover:bg-[rgba(0,29,54,0.1)]" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#001D36]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., What is the intuition behind Dijkstra's algorithm?"
              className="w-full rounded-xl border border-[#001D36]/20 bg-[#F0F4F8] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00808C] text-[#001D36]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#001D36]">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share what you've tried and where you're stuck…"
              className="w-full resize-y rounded-xl border border-[#001D36]/20 bg-[#F0F4F8] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00808C] text-[#001D36]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#001D36]">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cse220, graph, algorithm"
              className="w-full rounded-xl border border-[#001D36]/20 bg-[#F0F4F8] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00808C] text-[#001D36]"
            />
            <p className="mt-1 text-xs text-[#001D36]">Comma‑separated. Keep it specific so others can find it.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[#001D36]">
            <input type="checkbox" className="h-4 w-4 rounded border-[#001D36]/20 text-[#00808C] focus:ring-[#00808C]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Post anonymously
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-[#001D36]/20 px-4 py-2 text-sm font-semibold text-[#66625C] hover:bg-[#001D36]/5">Cancel</button>
          <button onClick={submit} className="rounded-xl bg-[#00808C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00808C]/90 shadow-md">
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
        style={{ background: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(0, 29, 54, 0.1)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#001D36]/10 px-5 py-3" 
           style={{ background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md p-2 text-[#001D36] hover:bg-[rgba(0,29,54,0.1)]" aria-label="Close">
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-semibold text-[#001D36]">Question details</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full border border-[#001D36]/20 px-2 py-0.5 text-xs text-[#001D36] bg-[#F0F4F8]">#{t}</span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          <h2 className="text-xl font-semibold text-[#001D36]">{question.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#66625C]">
            <Avatar name={question.anonymous ? "Anonymous" : question.author} />
            <span>•</span>
            <span>{timeAgo(question.createdAt)}</span>
            <span>•</span>
            <span className="rounded-full bg-[rgba(0,29,54,0.1)] px-2 py-0.5">{question.answers.length} answers</span>
            {isQuestionOwner && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 text-xs">Your question</span>
            )}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-[#001D36]">{question.body}</p>
        </div>

        <div className="border-t border-[#001D36]/10 px-5 py-4" style={{ background: "#F0F4F8" }}>
          <h3 className="text-sm font-semibold text-[#001D36]">Your answer</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Be clear and share the reasoning. Cite sources if needed."
            className="mt-2 w-full resize-y rounded-xl border border-[#001D36]/20 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00808C] text-[#001D36]"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[#001D36]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#001D36]/20 text-[#00808C] focus:ring-[#00808C]" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              Post anonymously
            </label>
            <button onClick={submitAnswer} className="rounded-xl bg-[#00808C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00808C]/90 shadow-sm">Post answer</button>
          </div>
        </div>

        <div className="border-t border-[#001D36]/10 px-5 py-4 bg-white">
          <h3 className="text-sm font-semibold text-[#001D36]">Answers <span className="text-[#66625C]">({question.answers.length})</span></h3>
          <ul className="mt-3 space-y-4">
            {question.answers.map((a) => (
              <li key={a.id} className="rounded-2xl p-4 transition-all duration-300" 
                style={{ background: "#F0F4F8", border: "1px solid rgba(0,29,54,0.1)" }}>
                <div className="flex items-start gap-4">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2" 
                    style={{ background: "#FFFFFF", border: "1px solid rgba(0,29,54,0.1)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <IconButton label="Upvote" onClick={() => onVoteAnswer(question.id, a.id, +1)} pressed={a.user_vote === 1}>
                      <ChevronUp className="h-4 w-4" style={{ color: a.user_vote === 1 ? "#10b981" : "inherit" }} />
                    </IconButton>
                    <div className="my-1 text-sm font-bold tabular-nums" style={{ color: "#001D36" }}>{formatVotes(a.votes)}</div>
                    <IconButton label="Downvote" onClick={() => onVoteAnswer(question.id, a.id, -1)} pressed={a.user_vote === -1}>
                      <ChevronDown className="h-4 w-4" style={{ color: a.user_vote === -1 ? "#ef4444" : "inherit" }} />
                    </IconButton>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#001D36]">
                      <Avatar name={a.author} />
                      {a.isAccepted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          <Check className="h-3.5 w-3.5" /> Accepted
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#001D36]">{a.body}</p>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onPeerReview(question.id, a.id)}
                        className={"rounded-full border px-3 py-1 font-semibold transition-all duration-200 " + 
                          (a.user_helpful 
                            ? "border-[#00808C] bg-[#00808C]/10 text-[#00808C] hover:bg-[#00808C]/20" 
                            : "border-[#001D36]/20 text-[#66625C] bg-white hover:bg-[#001D36]/5")}
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
