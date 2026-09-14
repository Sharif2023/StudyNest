import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../Components/Header';
import LeftNav from '../Components/LeftNav';
import Footer from '../Components/Footer';
import { Trophy, RefreshCw, Crown, Medal, Award, Zap, Users } from 'lucide-react';
import apiClient from "../apiConfig";

const RANK_CONFIG = {
  1: { label: "Gold",   icon: Crown,  color: "#F59E0B", glow: "rgba(245,158,11,0.2)",  bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.2)", height: 160 },
  2: { label: "Silver", icon: Medal,  color: "#66625C", glow: "rgba(102,98,92,0.15)", bg: "rgba(102,98,92,0.05)", border: "rgba(102,98,92,0.15)", height: 130 },
  3: { label: "Bronze", icon: Award,  color: "#EA580C", glow: "rgba(234,88,12,0.15)",  bg: "rgba(234,88,12,0.05)",  border: "rgba(234,88,12,0.15)", height: 100 },
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
    <div className="min-h-screen relative" style={{ background: "#F0F4F8", paddingLeft: SIDEBAR_W, transition: "padding-left 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-96 h-64 rounded-full opacity-[0.07]" style={{ background: "transparent", filter: "none" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "transparent", filter: "none" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={SIDEBAR_W} />
      <Header sidebarWidth={SIDEBAR_W} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-display font-black tracking-tighter" style={{ background: "transparent", color: "#001D36" }}>
              Scholar Rankings
            </h1>
            <p className="text-sm mt-1" style={{ color: "#66625C" }}>{leaderboard.length} students competing</p>
          </div>
          <button onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 bg-white shadow-sm border border-[#001D36]/10 text-[#66625C] hover:text-[#001D36] hover:bg-[#001D36]/5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Your Rank Card */}
        {currentUser && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-8 p-6 rounded-[2rem] relative overflow-hidden bg-white shadow-sm border border-[#001D36]/5">
            <div className="absolute inset-0" style={{ background: "transparent" }} />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#00808C]/10 border border-[#00808C]/20 shadow-inner">
                  <Users className="w-6 h-6 text-[#00808C]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#66625C] mb-1">Your Standing</p>
                  <p className="text-lg font-black text-[#001D36]">{currentUser.name}</p>
                  {userEntry && <p className="text-xs font-bold text-[#00808C]">Rank #{userEntry.rank}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-display font-black text-[#001D36]">
                  {(userEntry?.points || currentUser.points || 0).toLocaleString()}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#66625C] mt-1">Scholar Points</p>
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
                        <p className="text-xs font-bold text-center mb-3 leading-tight" style={{ color: "#001D36", maxWidth: 100 }}>
                          {user.name}
                        </p>
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-lg font-display font-black bg-white shadow-sm"
                          style={{ border: `2px solid ${cfg.color}`, color: cfg.color }}>
                          {user.name.substring(0, 1)}
                        </div>
                        {/* Podium block */}
                        <div className="w-full flex flex-col items-center justify-end rounded-t-[1.5rem] py-4 relative overflow-hidden shadow-sm"
                          style={{ height: cfg.height, background: "white", border: `2px solid ${cfg.color}`, borderBottom: "none" }}>
                          <div className="absolute inset-0 opacity-10" style={{ background: cfg.color }} />
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
            <div className="rounded-[2rem] overflow-hidden mb-8 bg-white shadow-sm border border-[#001D36]/10">
              <div className="flex items-center justify-between px-8 py-5 border-b border-[#001D36]/5 bg-[#F0F4F8]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#66625C" }}>All Rankings</p>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#001D36]"><Trophy className="w-3.5 h-3.5 text-[#00808C]" /> {leaderboard.length} Students</div>
              </div>
              <div>
                {leaderboard.map((user, i) => {
                  const isUser = user.id === currentUser?.id;
                  const medal = user.rank <= 3 ? ["🥇","🥈","🥉"][user.rank - 1] : null;
                  return (
                    <motion.div key={user.id}
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, ease: "easeOut" }}
                      className="flex items-center px-8 py-5 border-b border-[#001D36]/5 transition-colors duration-200"
                      style={{
                        background: isUser ? "#00808C10" : "white",
                        borderLeft: isUser ? "4px solid #00808C" : "4px solid transparent",
                      }}
                      onMouseEnter={e => !isUser && (e.currentTarget.style.background = "#F0F4F8")}
                      onMouseLeave={e => !isUser && (e.currentTarget.style.background = "white")}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-display font-black mr-5 flex-shrink-0"
                        style={user.rank <= 3
                          ? { background: "white", color: RANK_CONFIG[user.rank].color, border: `2px solid ${RANK_CONFIG[user.rank].color}`, shadow: "sm" }
                          : { background: "#F0F4F8", color: "#66625C", border: "1px solid #E2E8F0" }}>
                        {medal || `#${user.rank}`}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black flex items-center gap-2" style={{ color: "#001D36" }}>
                          {user.name} {isUser && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-widest bg-[#00808C] text-white">You</span>}
                        </p>
                        <p className="text-[10px] font-bold mt-1 text-[#66625C] uppercase tracking-widest">ID: {user.student_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-display font-black" style={{ color: user.rank <= 3 ? RANK_CONFIG[user.rank].color : "#001D36" }}>
                          {user.points.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#66625C" }}>pts</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* How to Earn Points */}
        <div className="rounded-[2rem] p-8 overflow-hidden bg-white shadow-sm border border-[#001D36]/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#8AB100]/10 border border-[#8AB100]/20 shadow-inner">
              <Zap className="w-5 h-5 text-[#8AB100]" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#001D36]">How to Earn Points</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {POINT_ACTIONS.map((action, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-[#001D36]/5 bg-[#F0F4F8]">
                <span className="text-[11px] font-black text-[#8AB100]">{action.pts}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#001D36]">{action.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer sidebarWidth={SIDEBAR_W} />
    </div>
  );
}