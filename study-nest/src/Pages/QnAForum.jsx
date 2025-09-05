import React, { useEffect, useMemo, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
// We'll remove the LeftNav and Footer imports since their components are not provided.
// import LeftNav from "../Components/LeftNav";
// import Footer from "../Components/Footer";

/**
 * StudyNest — Q&A Forum (Peer Review & Voting)
 * -------------------------------------------------------------
 * - Question list with search, tags, and sort (Hot/New/Top)
 * - Ask Question modal (with Anonymous toggle and tags)
 * - Question details drawer with answers
 * - Upvote/Downvote on questions & answers (local session)
 * - Peer review on answers ("Helpful" count) & accept answer
 * - No external deps; TailwindCSS for styling
 *
 * Integration: add a route like `<Route path="/forum" element={<QnAForum/>}/>`
 * You can swap the mock API with your real backend later.
 */

const API_ENDPOINT = 'http://localhost/studynest/study-nest/src/api/QnAForum.php';

export default function QnAForum() {
  const [questions, setQuestions] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sort, setSort] = useState("Hot"); // Hot | New | Top
  const [askOpen, setAskOpen] = useState(false);
  const [detail, setDetail] = useState(null); // question id

  // Fetch all questions from the backend on initial load
  useEffect(() => {
    fetch(API_ENDPOINT)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Check if the response is an array before setting the state
        if (Array.isArray(data)) {
          // Data is now pre-sorted by the backend (newest first)
          setQuestions(data);
        } else {
          console.error("API did not return an array:", data);
          setQuestions([]); // Reset state if response is not an array
        }
      })
      .catch((error) => {
        console.error('Error fetching questions:', error);
        setQuestions([]); // Also set to empty on fetch error
      });
  }, []);

  const tags = useMemo(() => {
    const t = new Set(["All"]);
    questions.forEach((q) => q.tags.forEach((x) => t.add(x)));
    return [...t];
  }, [questions]);

  const filtered = useMemo(() => {
    let list = questions;
    if (activeTag !== "All") list = list.filter((q) => q.tags.includes(activeTag));
    if (query.trim()) {
      const ql = query.toLowerCase();
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(ql) ||
          q.body.toLowerCase().includes(ql) ||
          q.tags.some((t) => t.toLowerCase().includes(ql))
      );
    }
    // score for "Hot": votes + answers + freshness
    const scoreHot = (q) => q.votes + q.answers.length * 2 + freshnessBoost(q.createdAt);
    const sorters = {
      Hot: (a, b) => scoreHot(b) - scoreHot(a),
      New: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      Top: (a, b) => b.votes - a.votes,
    };
    return [...list].sort(sorters[sort]);
  }, [questions, query, activeTag, sort]);

  const openDetail = (qid) => setDetail(qid);
  const closeDetail = () => setDetail(null);

  const onCreateQuestion = (q) => {
    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const newQuestion = {
      ...q,
      id: tempId,
      votes: 0,
      answers: [],
      createdAt: new Date().toISOString()
    };
    setQuestions(prev => [newQuestion, ...prev]);
    setAskOpen(false);

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_question',
        title: q.title,
        body: q.body,
        tags: q.tags.join(','),
        author: q.author,
        anonymous: q.anonymous ? 1 : 0
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Replace temp question with real data from server
          setQuestions(prev => prev.map(item => item.id === tempId ? { ...newQuestion, id: data.id } : item));
        } else {
          // Revert on error
          setQuestions(prev => prev.filter(item => item.id !== tempId));
          alert('Error creating question: ' + data.message);
        }
      })
      .catch(error => {
        setQuestions(prev => prev.filter(item => item.id !== tempId));
        alert('Error: ' + error.message);
      });
  };

  const onVoteQuestion = (id, delta) => {
    // Optimistic update
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: Number(q.votes) + delta } : q));
    
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote_question', id, delta }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status !== 'success') {
            // Revert on error
            setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes - delta } : q));
            console.error('Error voting on question:', data.message);
        }
      })
      .catch(error => {
          setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes - delta } : q));
          console.error('Error:', error)
      });
  };

  const onAddAnswer = (qid, answer) => {
    const tempAnswerId = `temp-ans-${Date.now()}`;
    const newAnswer = {
        ...answer,
        id: tempAnswerId,
        votes: 0,
        helpful: 0,
        isAccepted: false,
        createdAt: new Date().toISOString(),
    };
    
    // Optimistic update
    setQuestions(prev => prev.map(q => 
        q.id === qid ? { ...q, answers: [...q.answers, newAnswer] } : q
    ));

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_answer',
        question_id: qid,
        body: answer.body,
        author: answer.author
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Re-fetch all questions to get the final state with the new answer ID
          fetch(API_ENDPOINT).then(res => res.json()).then(setQuestions);
        } else {
          // Revert on error
          setQuestions(prev => prev.map(q => 
            q.id === qid ? { ...q, answers: q.answers.filter(a => a.id !== tempAnswerId) } : q
          ));
          console.error('Error adding answer:', data.message);
        }
      })
      .catch(error => {
        setQuestions(prev => prev.map(q => 
            q.id === qid ? { ...q, answers: q.answers.filter(a => a.id !== tempAnswerId) } : q
        ));
        console.error('Error:', error);
      });
  };

  const onVoteAnswer = (qid, aid, delta) => {
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, votes: Number(a.votes) + delta } : a) } : q));
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote_answer', id: aid, delta }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status !== 'success') {
          setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, votes: a.votes - delta } : a) } : q));
          console.error('Error voting on answer:', data.message);
        }
      })
      .catch(error => {
        setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, votes: a.votes - delta } : a) } : q));
        console.error('Error:', error);
      });
  };

  const onPeerReview = (qid, aid) => {
   setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, helpful: Number(a.helpful) + 1 } : a) } : q));
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'peer_review', id: aid }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status !== 'success') {
          setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, helpful: Number(a.helpful) - 1 } : a) } : q));
          console.error('Error marking as helpful:', data.message);
        }
      })
      .catch(error => {
        setQuestions(prev => prev.map(q => q.id === qid ? { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, helpful: Number(a.helpful) - 1 } : a) } : q));
        console.error('Error:', error);
      });
  };

  const onAcceptAnswer = (qid, aid) => {
    setQuestions(prev => prev.map(q =>
      q.id === qid ? { ...q, answers: q.answers.map(a => ({ ...a, isAccepted: a.id === aid })) } : q
    ));
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept_answer', question_id: qid, answer_id: aid }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status !== 'success') {
          console.error('Error accepting answer:', data.message);
          // Note: Reverting this optimistic update would be more complex, so we log the error.
          // For a production app, you might re-fetch the question's state.
        }
      })
      .catch(error => console.error('Error:', error));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl">
      <LeftNav></LeftNav>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Q&A Forum</h1>
              <p className="text-sm text-white">Ask questions, review peers, and vote on the best answers.</p>
            </div>
            <button
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" /> Ask a question
            </button>
          </div>
          {/* Search + Sort + Tags */}
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-xl w-full">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, text, or tag…"
                className="w-full rounded-xl border border-white-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {(["Hot", "New", "Top"]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={
                    "rounded-xl px-3 py-1.5 font-semibold " +
                    (sort === s
                      ? "bg-zinc-900 text-white"
                      : "border border-white text-white hover:bg-zinc-500")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* Tag row */}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-semibold " +
                  (activeTag === t
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-white text-white hover:bg-zinc-500")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 && !query ? (
          <EmptyState onNew={() => setAskOpen(true)} />
        ) : (
          <ul className="grid gap-4">
            {filtered.map((q) => (
              <li key={q.id}>
                <QuestionCard
                  question={q}
                  onOpen={() => openDetail(q.id)}
                  onVote={onVoteQuestion}
                />
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* Ask modal */}
      {askOpen && (
        <AskQuestionModal onClose={() => setAskOpen(false)} onCreate={onCreateQuestion} />
      )}

      {/* Detail drawer */}
      {detail && (
        <QuestionDrawer
          question={questions.find((q) => q.id == detail)}
          onClose={closeDetail}
          onAddAnswer={onAddAnswer}
          onVoteAnswer={onVoteAnswer}
          onPeerReview={onPeerReview}
          onAccept={onAcceptAnswer}
        />
      )}
      <Footer />
    </div>
  );
}

/* -------------------- Components -------------------- */
function QuestionCard({ question, onOpen, onVote }) {
  const [sessionVote, setSessionVote] = useState(0); // -1,0,1
  const up = () => {
    if (sessionVote === 1) return;
    const delta = sessionVote === -1 ? 2 : 1;
    setSessionVote(1);
    onVote(question.id, delta);
  };
  const down = () => {
    if (sessionVote === -1) return;
    const delta = sessionVote === 1 ? -2 : -1;
    setSessionVote(-1);
    onVote(question.id, delta);
  };

  return (
    <article className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-50 py-2">
        <IconButton label="Upvote" onClick={up} pressed={sessionVote === 1}>
          <ChevronUp className="h-5 w-5" />
        </IconButton>
        <div className="my-1 text-sm font-bold tabular-nums">{formatVotes(question.votes)}</div>
        <IconButton label="Downvote" onClick={down} pressed={sessionVote === -1}>
          <ChevronDown className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="text-left">
          <h3 className="line-clamp-1 text-lg font-semibold text-zinc-900 hover:underline">
            {question.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-700">{question.body}</p>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <Avatar name={question.anonymous ? "Anonymous" : question.author} />
          <span>•</span>
          <span>{timeAgo(question.createdAt)}</span>
          <span>•</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">{question.answers.length} answers</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full border border-zinc-300 px-2 py-0.5 text-zinc-700">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function AskQuestionModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    onCreate({ title: title.trim(), body: body.trim(), tags: parseTags(tags), anonymous, author: "You" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={onClose}>
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ask a question</h2>
          <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., What is the intuition behind Dijkstra's algorithm?"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share what you've tried and where you're stuck…"
              className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cse220, graph, algorithm"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-zinc-500">Comma‑separated. Keep it specific so others can find it.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Post anonymously
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50">Cancel</button>
          <button onClick={submit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Post question
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionDrawer({ question, onClose, onAddAnswer, onVoteAnswer, onPeerReview, onAccept }) {
  const [answer, setAnswer] = useState("");
  const [anon, setAnon] = useState(false);
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
      <div className="relative ml-auto h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl ring-1 ring-zinc-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
              <XIcon className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-semibold text-zinc-600">Question details</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.tags.map((t) => (
              <span key={t} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">#{t}</span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          <h2 className="text-xl font-semibold text-zinc-900">{question.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <Avatar name={question.anonymous ? "Anonymous" : question.author} />
            <span>•</span>
            <span>{timeAgo(question.createdAt)}</span>
            <span>•</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5">{question.answers.length} answers</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-800">{question.body}</p>
        </div>

        <div className="border-t border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Your answer</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Be clear and share the reasoning. Cite sources if needed."
            className="mt-2 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              Post anonymously
            </label>
            <button onClick={submitAnswer} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Post answer</button>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Answers <span className="text-zinc-500">({question.answers.length})</span></h3>
          <ul className="mt-3 space-y-4">
            {question.answers.map((a) => (
              <li key={a.id} className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                <div className="flex items-start gap-4">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-white py-2 ring-1 ring-zinc-200">
                    <IconButton label="Upvote" onClick={() => onVoteAnswer(question.id, a.id, +1)}>
                      <ChevronUp className="h-4 w-4" />
                    </IconButton>
                    <div className="my-1 text-sm font-bold tabular-nums">{formatVotes(a.votes)}</div>
                    <IconButton label="Downvote" onClick={() => onVoteAnswer(question.id, a.id, -1)}>
                      <ChevronDown className="h-4 w-4" />
                    </IconButton>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <Avatar name={a.author} />
                      {a.isAccepted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          <Check className="h-3.5 w-3.5" /> Accepted
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{a.body}</p>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button onClick={() => onPeerReview(question.id, a.id)} className="rounded-full border border-zinc-300 px-3 py-1 font-semibold text-zinc-700 hover:bg-white">
                        Mark Helpful ({a.helpful})
                      </button>
                      <button onClick={() => onAccept(question.id, a.id)} className="rounded-full border border-zinc-300 px-3 py-1 font-semibold text-zinc-700 hover:bg-white">
                        Accept Answer
                      </button>
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

function EmptyState({ onNew }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <QuestionMark className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No questions yet</h3>
        <p className="mt-1 text-sm text-zinc-600">Start the discussion by asking your first question.</p>
        <button onClick={onNew} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Ask a question</button>
      </div>
    </div>
  );
}

function IconButton({ children, onClick, pressed, label }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={
        "grid place-items-center rounded-md p-1.5 " +
        (pressed ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100")
      }
    >
      {children}
    </button>
  );
}

function Avatar({ name }) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
      {initial}
    </span>
  );
}

/* -------------------- Icons (inline SVG) -------------------- */
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M11 4h2v16h-2z" /><path fill="currentColor" d="M4 11h16v2H4z" /></svg>
  );
}
function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" /></svg>
  );
}
function ChevronUp(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" /></svg>); }
function ChevronDown(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z" /></svg>); }
function XIcon(props) { return (<svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.29-6.3 6.3 1.42 1.41 6.29-6.29 6.3 6.3 1.41-1.41-6.29-6.3 6.29-6.29z" /></svg>); }
function Check(props) { return (<svg viewBox="0 0 24 24" className="h-4 w-4" {...props}><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>); }
function QuestionMark(props) { return (<svg viewBox="0 0 24 24" className="h-7 w-7" {...props}><path fill="currentColor" d="M11 18h2v2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-.88-5h1.75v-1c0-1.09.31-1.57 1.34-2.36.94-.72 1.79-1.51 1.79-2.97 0-2.21-1.79-3.67-4.23-3.67-2.27 0-4.05 1.22-4.33 3.49l1.94.26c.18-1.29 1-2.12 2.34-2.12 1.38 0 2.33.76 2.33 1.98 0 .88-.45 1.36-1.27 1.96-1.21.91-1.7 1.78-1.66 3.43V15z" /></svg>); }

/* -------------------- Utilities -------------------- */
function parseTags(s) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}
function timeAgo(ts) {
  if (!ts) return "some time ago";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const units = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [100, "y"],
  ];
  let n = diff;
  let u = "s";
  for (let i = 0; i < units.length; i++) {
    const [step, label] = units[i];
    if (n < step) { u = label; break; }
    n /= step;
    u = label;
  }
  return `${Math.floor(n)}${u} ago`;
}
function freshnessBoost(ts) {
  if (!ts) return 0;
  const hours = (Date.now() - new Date(ts).getTime()) / 36e5;
  return Math.max(0, Math.floor(24 - Math.min(24, hours))); // boost if <24h old
}
function formatVotes(votes) {
  if (votes > 0) {
    return `+${votes}`;
  }
  return votes; // Automatically handles 0 and negative numbers
}