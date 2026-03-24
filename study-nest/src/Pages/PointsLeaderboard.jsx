import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../Components/Header';
import LeftNav from '../Components/LeftNav';
import Footer from '../Components/Footer';
import { Trophy, RefreshCw, Crown, Medal, Award, Zap, Users } from 'lucide-react';
import apiClient from "../apiConfig";

const RANK_CONFIG = {
  1: { label: "Gold",   icon: Crown,  color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", height: 160 },
  2: { label: "Silver", icon: Medal,  color: "#94a3b8", glow: "rgba(148,163,184,0.4)", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", height: 130 },
  3: { label: "Bronze", icon: Award,  color: "#f97316", glow: "rgba(249,115,22,0.4)",  bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)", height: 100 },
};

const POINT_ACTIONS = [
  { label: "Daily Login",   pts: "+5" },
  { label: "3-Day Streak", pts: "+8" },
  { label: "7-Day Streak", pts: "+12" },
  { label: "20-Day Streak",pts: "+20" },
  { label: "Create Room",  pts: "+30" },
  { label: "Join Meeting", pts: "+15" },
  { label: "Share Resource",pts:"+25" },
  { label: "Share Notes",  pts: "+20" },
  { label: "Ask Question", pts: "+15" },
  { label: "Accept Answer",pts: "+5" },
  { label: "Give Answer",  pts: "+2" },
];

export default function PointsLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const SIDEBAR_W = navOpen ? 280 : 80;

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
    const profile = JSON.parse(localStorage.getItem('studynest.profile') || '{}');
    setCurrentUser({ id: auth?.id || profile?.id, name: profile?.name || auth?.name || 'You', points: auth?.points || 0 });
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("getLeaderboard.php");
      const data = res.data;
      if (data.success) setLeaderboard(data.leaderboard || []);
    } catch {
      setLeaderboard([
        { id: 1, name: 'John Doe',      student_id: 'STU001', points: 1250, rank: 1 },
        { id: 2, name: 'Jane Smith',    student_id: 'STU002', points: 980,  rank: 2 },
        { id: 3, name: 'Mike Johnson',  student_id: 'STU003', points: 875,  rank: 3 },
        { id: 4, name: 'Sarah Wilson',  student_id: 'STU004', points: 760,  rank: 4 },
        { id: 5, name: 'Alex Chen',     student_id: 'STU005', points: 650,  rank: 5 },
      ]);
    } finally { setLoading(false); }
  };

  const top3 = leaderboard.filter(u => u.rank <= 3).sort((a,b) => {
    // Display order: 2-1-3 for podium effect
    const order = { 1: 1, 2: 0, 3: 2 };
    return order[a.rank] - order[b.rank];
  });
  const rest = leaderboard.filter(u => u.rank > 3);

  const userEntry = currentUser && leaderboard.find(u => u.id === currentUser.id);

  return (
    <div className="min-h-screen relative" style={{ background: "#08090e", paddingLeft: SIDEBAR_W, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-96 h-64 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #fbbf24, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={SIDEBAR_W} />
      <Header sidebarWidth={SIDEBAR_W} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Scholar Rankings
            </h1>
            <p className="text-sm mt-1" style={{ color: "#475569" }}>{leaderboard.length} students competing</p>
          </div>
          <button onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)"; e.currentTarget.style.color = "#fbbf24"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748b"; }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Your Rank Card */}
        {currentUser && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-8 p-5 rounded-2xl relative overflow-hidden"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at right, rgba(6,182,212,0.06), transparent 60%)" }} />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>Your Standing</p>
                  <p className="text-base font-bold" style={{ color: "#f1f5f9" }}>{currentUser.name}</p>
                  {userEntry && <p className="text-xs" style={{ color: "#475569" }}>Rank #{userEntry.rank}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-display font-black" style={{ color: "#a78bfa", textShadow: "0 0 20px rgba(139,92,246,0.5)" }}>
                  {(userEntry?.points || currentUser.points || 0).toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>Scholar Points</p>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 rounded-2xl shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="mb-10">
                <div className="flex items-end justify-center gap-6 mb-8" style={{ height: 220 }}>
                  {top3.map((user) => {
                    const cfg = RANK_CONFIG[user.rank] || RANK_CONFIG[3];
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: user.rank * 0.1, type: "spring", stiffness: 200 }}
                        className="relative flex flex-col items-center"
                        style={{ width: 130 }}
                      >
                        {/* User Name */}
                        <p className="text-xs font-bold text-center mb-3 leading-tight" style={{ color: "#e2e8f0", maxWidth: 100 }}>
                          {user.name}
                        </p>
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-lg font-display font-black"
                          style={{ background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}15)`, border: `2px solid ${cfg.color}`, boxShadow: `0 0 20px ${cfg.glow}`, color: cfg.color }}>
                          {user.name.substring(0, 1)}
                        </div>
                        {/* Podium block */}
                        <div className="w-full flex flex-col items-center justify-end rounded-t-2xl py-4 relative overflow-hidden"
                          style={{ height: cfg.height, background: cfg.bg, border: `1px solid ${cfg.border}`, borderBottom: "none" }}>
                          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at top, ${cfg.color}10, transparent 70%)` }} />
                          <Icon className="w-6 h-6 mb-2 relative z-10" style={{ color: cfg.color }} />
                          <p className="text-2xl font-display font-black leading-none relative z-10" style={{ color: cfg.color }}>#{user.rank}</p>
                          <p className="text-xs font-bold mt-1 relative z-10" style={{ color: cfg.color }}>{user.points.toLocaleString()} pts</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full ranked list */}
            <div className="rounded-2xl overflow-hidden mb-8" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>All Rankings</p>
                <div className="badge-violet text-[10px]"><Trophy className="w-3 h-3" /> {leaderboard.length} Students</div>
              </div>
              <div>
                {leaderboard.map((user, i) => {
                  const isUser = user.id === currentUser?.id;
                  const medal = user.rank <= 3 ? ["🥇","🥈","🥉"][user.rank - 1] : null;
                  return (
                    <motion.div key={user.id}
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, ease: "easeOut" }}
                      className="flex items-center px-6 py-4 border-b transition-colors duration-200"
                      style={{
                        borderColor: "rgba(255,255,255,0.04)",
                        background: isUser
                          ? "rgba(124,58,237,0.08)"
                          : "transparent",
                        borderLeft: isUser ? "3px solid rgba(124,58,237,0.6)" : "3px solid transparent",
                      }}
                      onMouseEnter={e => !isUser && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={e => !isUser && (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-display font-black mr-4 flex-shrink-0"
                        style={user.rank <= 3
                          ? { background: `${RANK_CONFIG[user.rank].color}18`, color: RANK_CONFIG[user.rank].color, border: `1px solid ${RANK_CONFIG[user.rank].border}` }
                          : { background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.07)" }}>
                        {medal || `#${user.rank}`}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold flex items-center gap-2" style={{ color: "#e2e8f0" }}>
                          {user.name} {isUser && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>You</span>}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>ID: {user.student_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-display font-black" style={{ color: user.rank <= 3 ? RANK_CONFIG[user.rank].color : "#94a3b8" }}>
                          {user.points.toLocaleString()}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: "#334155" }}>pts</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* How to Earn Points */}
        <div className="rounded-2xl p-6 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <Zap className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: "#64748b" }}>How to Earn Points</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {POINT_ACTIONS.map((action, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-xs font-black" style={{ color: "#34d399" }}>{action.pts}</span>
                <span className="text-xs" style={{ color: "#64748b" }}>{action.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer sidebarWidth={SIDEBAR_W} />
    </div>
  );
}