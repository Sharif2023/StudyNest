import React, { useEffect, useMemo, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import apiClient from "../apiConfig";

import { 
  freshnessBoost 
} from "../Components/QnA/QnAUtils";
import { 
  PlusIcon, 
  SearchIcon, 
  QuestionCard, 
  EmptyState 
} from "../Components/QnA/QnAComponents";
import { 
  AskQuestionModal, 
  QuestionDrawer 
} from "../Components/QnA/QnAModals";

export default function QnAForum() {
  const [questions, setQuestions] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sort, setSort] = useState("Hot");
  const [askOpen, setAskOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [navOpen, setNavOpen] = useState(window.innerWidth >= 1024);
  const [anonymous, setAnonymous] = useState(false);

  const openDetail = (id) => setDetail(id);
  const closeDetail = () => setDetail(null);

  const COLLAPSED_W = 80;
  const EXPANDED_W = 280;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  //  Points system: +10 for question, +2 for answer, +5 for accepted answer
  const syncUserPoints = async () => {
    try {
      const response = await apiClient.post("QnAForum.php", {
        action: "get_user_points"
      });
      const data = response.data;

      if (data.status === "success") {
        // Update localStorage
        const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
        const updatedAuth = { ...auth, points: data.points };
        localStorage.setItem('studynest.auth', JSON.stringify(updatedAuth));

        // Dispatch event to update UI
        window.dispatchEvent(new CustomEvent('studynest:points-updated', {
          detail: { points: data.points }
        }));

        return data.points;
      }
    } catch (error) {
      console.error("Error syncing points:", error);
    }
    return null;
  };

  // 🔹 Fetch all questions
  const fetchQuestions = () => {
    apiClient.get("QnAForum.php", {
      headers: { Accept: "application/json" }
    })
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) setQuestions(data);
        else {
          setQuestions([]);
        }
      })
      .catch((err) => {
        setQuestions([]);
      });
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  /* ---------------- Filtering ---------------- */
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
    const scoreHot = (q) => q.votes + q.answers.length * 2 + freshnessBoost(q.createdAt);
    const sorters = {
      Hot: (a, b) => scoreHot(b) - scoreHot(a),
      New: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      Top: (a, b) => b.votes - a.votes,
    };
    return [...list].sort(sorters[sort]);
  }, [questions, query, activeTag, sort]);

  /* ---------------- Actions ---------------- */
  const onCreateQuestion = (q) => {
    const tempId = `temp-${Date.now()}`;
    const newQuestion = {
      ...q,
      id: tempId,
      votes: 0,
      answers: [],
      createdAt: new Date().toISOString(),
    };
    setQuestions((prev) => [newQuestion, ...prev]);
    setAskOpen(false);

    apiClient.post("QnAForum.php", {
      action: "add_question",
      title: q.title,
      body: q.body,
      tags: q.tags,
      author: q.anonymous ? "Anonymous" : q.author,
    })
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          fetchQuestions();
          syncUserPoints();
        }
        else {
          setQuestions((prev) => prev.filter((x) => x.id !== tempId));
          alert("Error: " + (data.message || data.error || "Unknown error occurred."));
        }
      })
      .catch((err) => {
        setQuestions((prev) => prev.filter((x) => x.id !== tempId));
        alert("Error posting: " + err.message);
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
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, answers: [...q.answers, newAnswer] } : q
      )
    );

    apiClient.post("QnAForum.php", {
      action: "add_answer",
      question_id: qid,
      body: answer.body,
      author: answer.author,
    })
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          fetchQuestions();
          syncUserPoints();
        }
        else {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === qid
                ? { ...q, answers: q.answers.filter((a) => a.id !== tempAnswerId) }
                : q
            )
          );
          alert("Error adding answer: " + (data.message || data.error || "Unknown error occurred."));
        }
      })
      .catch((err) => {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qid
              ? { ...q, answers: q.answers.filter((a) => a.id !== tempAnswerId) }
              : q
          )
        );
        console.error(err);
      });
  };

  const onVoteQuestion = (id, delta) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, votes: Number(q.votes) + delta } : q
      )
    );
    apiClient.post("QnAForum.php", { action: "vote_question", id, delta })
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          fetchQuestions();
        } else {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === id ? { ...q, votes: q.votes - delta } : q
            )
          );
        }
      })
      .catch((err) => console.error(err));
  };

  const onVoteAnswer = (qid, aid, delta) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
            ...q,
            answers: q.answers.map((a) =>
              a.id === aid ? { ...a, votes: Number(a.votes) + delta } : a
            ),
          }
          : q
      )
    );
    apiClient.post("QnAForum.php", { action: "vote_answer", id: aid, delta })
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          fetchQuestions();
        } else {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === qid
                ? {
                  ...q,
                  answers: q.answers.map((a) =>
                    a.id === aid
                      ? { ...a, votes: Number(a.votes) - delta }
                      : a
                  ),
                }
                : q
            )
          );
        }
      })
      .catch((err) => console.error(err));
  };

  const onPeerReview = (qid, aid) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
            ...q,
            answers: q.answers.map((a) =>
              a.id === aid
                ? { ...a, helpful: Number(a.helpful) + 1 }
                : a
            ),
          }
          : q
      )
    );
    apiClient.post("QnAForum.php", { action: "peer_review", id: aid })
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          fetchQuestions();
        } else {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === qid
                ? {
                  ...q,
                  answers: q.answers.map((a) =>
                    a.id === aid
                      ? { ...a, helpful: Number(a.helpful) - 1 }
                      : a
                  ),
                }
                : q
            )
          );
          alert("Error: " + (data.message || data.error || "Unknown error occurred."));
        }
      })
      .catch((err) => console.error(err));
  };

  const onAcceptAnswer = (qid, aid) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, answers: q.answers.map((a) => ({ ...a, isAccepted: a.id === aid })) }
          : q
      )
    );
    apiClient.post("QnAForum.php", { action: "accept_answer", question_id: qid, answer_id: aid })
      .then((res) => {
        const data = res.data;
        if (data.status !== "success") {
          syncUserPoints();
        } else {
          console.error("Accept error:", data.message);
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: window.innerWidth < 1024 ? 0 : sidebarWidth, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-96 h-64 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #f1f5f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Q&amp;A Forum
          </h1>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Ask questions, share knowledge, earn points</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#475569" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions, tags..."
              className="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
              onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
          <div className="flex items-center gap-2">
            {["Hot", "New", "Top"].map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
                style={sort === s
                  ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", color: "#a78bfa" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
                {s}
              </button>
            ))}
            <button onClick={() => setAskOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
              <PlusIcon className="h-3.5 w-3.5" /> Ask Question
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((t) => (
            <button key={t} onClick={() => setActiveTag(t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={activeTag === t
                ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", color: "#a78bfa" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
              #{t}
            </button>
          ))}
        </div>

        {/* Question List */}
        {!Array.isArray(filtered) || filtered.length === 0 ? (
          <EmptyState onNew={() => setAskOpen(true)} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((q) => (
              <li key={q.id}>
                <QuestionCard question={q} onOpen={() => openDetail(q.id)} onVote={onVoteQuestion} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {askOpen && <AskQuestionModal onClose={() => setAskOpen(false)} onCreate={onCreateQuestion} />}
      {detail && (
        <QuestionDrawer question={questions.find((q) => q.id == detail)} onClose={closeDetail}
          onAddAnswer={onAddAnswer} onVoteAnswer={onVoteAnswer} onPeerReview={onPeerReview} onAccept={onAcceptAnswer} />
      )}
      <Footer />
    </div>
  );
}