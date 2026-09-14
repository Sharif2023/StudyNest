
import React, { useState } from "react";
import { formatVotes, timeAgo } from "./QnAUtils";

/* -------------------- Icons (inline SVG) -------------------- */
export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M11 4h2v16h-2z" /><path fill="currentColor" d="M4 11h16v2H4z" /></svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" /></svg>
  );
}

export function ChevronUp(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" /></svg>); }
export function ChevronDown(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z" /></svg>); }
export function XIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); }
export function Check(props) { return (<svg viewBox="0 0 24 24" className="h-4 w-4" {...props}><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>); }
export function QuestionMark(props) { return (<svg viewBox="0 0 24 24" className="h-7 w-7" {...props}><path fill="currentColor" d="M11 18h2v2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-.88-5h1.75v-1c0-1.09.31-1.57 1.34-2.36.94-.72 1.79-1.51 1.79-2.97 0-2.21-1.79-3.67-4.23-3.67-2.27 0-4.05 1.22-4.33 3.49l1.94.26c.18-1.29 1-2.12 2.34-2.12 1.38 0 2.33.76 2.33 1.98 0 .88-.45 1.36-1.27 1.96-1.21.91-1.7 1.78-1.66 3.43V15z" /></svg>); }

/* -------------------- Components -------------------- */
export function IconButton({ children, onClick, pressed, label }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={
        "grid place-items-center rounded-md p-1.5 transition-colors " +
        (pressed ? "bg-[#001D36] text-white" : "text-[#66625C] hover:bg-black/5 hover:text-[#001D36]")
      }
    >
      {children}
    </button>
  );
}

export function Avatar({ name }) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <span className="flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#001D36]/10 text-[10px] font-bold text-[#001D36]">
        {initial}
      </span>
      <span className="text-xs font-medium text-[#001D36]">{name}</span>
    </span>
  );
}

export function QuestionCard({ question, onOpen, onVote }) {
  const userVote = Number(question.user_vote || 0);

  const up = (e) => {
    e.stopPropagation();
    onVote(question.id, 1);
  };
  const down = (e) => {
    e.stopPropagation();
    onVote(question.id, -1);
  };

  return (
    <article
      className="flex gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-300 group/card bg-white border border-[#001D36]/10 hover:border-[#001D36]/30 hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 bg-[#F0F4F8]">
        <IconButton label="Upvote" onClick={up} pressed={userVote === 1}>
          <ChevronUp className="h-4 w-4" style={{ color: userVote === 1 ? "#10b981" : "inherit" }} />
        </IconButton>
        <div className="my-1 text-sm font-bold tabular-nums text-[#001D36]">{formatVotes(question.votes)}</div>
        <IconButton label="Downvote" onClick={down} pressed={userVote === -1}>
          <ChevronDown className="h-4 w-4" style={{ color: userVote === -1 ? "#ef4444" : "inherit" }} />
        </IconButton>
      </div>

      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="text-left w-full group-hover/card:opacity-90">
          <h3 className="line-clamp-1 text-base font-bold mb-1 transition-colors duration-200 text-[#001D36] group-hover/card:text-[#00808C]">
            {question.title}
          </h3>
          <p className="line-clamp-2 text-sm text-[#66625C]">{question.body}</p>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Avatar name={question.anonymous ? "Anonymous" : question.author} />
          <span className="text-[#66625C] opacity-50">·</span>
          <span className="text-xs text-[#66625C]">{timeAgo(question.createdAt)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#001D36]/5 text-[#001D36] font-medium border border-[#001D36]/10">{question.answers.length} answers</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {question.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#8AB100]/10 border border-[#8AB100]/20 text-[#6B8A00]">#{t}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function EmptyState({ onNew }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-[#001D36]/20 bg-white/80 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#00808C]/10 text-[#00808C]">
          <QuestionMark className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[#001D36]">No questions yet</h3>
        <p className="mt-1 text-sm text-[#66625C]">Start the discussion by asking your first question.</p>
        <button onClick={onNew} className="mt-4 rounded-xl bg-[#001D36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001D36]/90 shadow-md">Ask a question</button>
      </div>
    </div>
  );
}
