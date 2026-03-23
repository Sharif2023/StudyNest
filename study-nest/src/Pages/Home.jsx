import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Trophy, BookOpen, Sparkles, Calendar, LayoutGrid,
  ArrowRight, Video, PlayCircle, ChevronRight, Files, TrendingUp, Zap, MessageSquare
} from "lucide-react";
import apiClient from "../apiConfig";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { BentoCard, SectionLabel } from "../Components/Home/HomeComponents";
import { StatsRow, FocusTimerCard, StudyRoomsCard, TodoListCard } from "../Components/Home/HomeSections";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const SIDEBAR_W = navOpen ? 280 : 80;
  const [profile, setProfile] = useState({});
  const [data, setData] = useState({ rooms: [], qa: [], todos: [], leaderboard: [] });
  const [points, setPoints] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const storedProfile = JSON.parse(localStorage.getItem("studynest.profile") || "{}");
    setProfile(storedProfile);
    setPoints(storedProfile.points || 0);

    (async () => {
      try {
        const [roomsRes, qaRes, todoRes, leaderRes] = await Promise.all([
          apiClient.get("meetings.php"),
          apiClient.get("QnAForum.php"),
          storedProfile.id ? apiClient.get(`todo.php?user_id=${storedProfile.id}`) : Promise.resolve({ data: { todos: [] } }),
          apiClient.get("getLeaderboard.php"),
        ]);
        setData({
          rooms: roomsRes.data?.rooms?.slice(0, 3) || [],
          qa: qaRes.data?.data?.slice(0, 3) || (Array.isArray(qaRes.data) ? qaRes.data.slice(0, 3) : []),
          todos: todoRes.data?.todos?.slice(0, 5) || [],
          leaderboard: leaderRes.data?.leaderboard?.slice(0, 5) || [],
        });
      } catch (err) { console.error("Dashboard load:", err); }
    })();
  }, []);
 
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await apiClient.get("meetings.php");
        setData((d) => ({ ...d, rooms: res.data?.rooms?.slice(0, 3) || [] }));
      } catch { }
    };
    window.addEventListener("studynest:rooms-refresh", refresh);
    return () => window.removeEventListener("studynest:rooms-refresh", refresh);
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) { clearInterval(timerRef.current); setTimerRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const timerMins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const timerSecs = String(timerSeconds % 60).padStart(2, "0");
  const timerProgress = (1 - timerSeconds / (25 * 60)) * 100;

  const stats = [
    { label: "Study Points",  val: points,    icon: Trophy,   color: "#a78bfa", glow: "rgba(139,92,246,0.4)" },
    { label: "Live Rooms",    val: 12,         icon: Video,    color: "#22d3ee", glow: "rgba(6,182,212,0.4)" },
    { label: "Resources",     val: 42,         icon: BookOpen, color: "#34d399", glow: "rgba(52,211,153,0.4)" },
    { label: "Global Rank",   val: "#4",       icon: Zap,      color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
  ];

  const quickNav = [
    { title: "Study Notes",     desc: "Academic Library",    icon: Files,        path: "/notes",      color: "#a78bfa", glow: "rgba(139,92,246,0.3)" },
    { title: "AI Tools",        desc: "AI Assistant",    icon: Sparkles,     path: "/ai-check",   color: "#22d3ee", glow: "rgba(6,182,212,0.3)" },
    { title: "Discussion",      desc: "Student Forum",      icon: MessageSquare, path: "/forum",     color: "#34d399", glow: "rgba(52,211,153,0.3)" },
    { title: "Leaderboard",     desc: "Top Students",       icon: Trophy,        path: "/points-leaderboard", color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  ];

  return (
    <div className="min-h-screen relative" style={{ background: "#08090e" }}>
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={SIDEBAR_W} />
      <Header sidebarWidth={SIDEBAR_W} setNavOpen={setNavOpen} navOpen={navOpen} />

      <main
        style={{ paddingLeft: window.innerWidth < 1024 ? 0 : SIDEBAR_W }}
        className="transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen relative z-10"
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-10 lg:py-16">

          {/* ── Welcome Header ── */}
          <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.7)" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
                  Live · Online
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-black leading-none tracking-tighter">
                <span style={{ color: "#94a3b8" }}>Hello,</span>{" "}
                <span style={{
                  background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  {profile.name?.split(' ')[0] || "Scholar"}.
                </span>
              </h1>
              <p className="text-base mt-4 max-w-md" style={{ color: "#475569" }}>
                Ready to level up? Your study dashboard is live and synced.
              </p>
            </motion.div>

            <div className="flex items-center gap-3">
              <Link to="/to-do-list" className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; e.currentTarget.style.color = "#e2e8f0"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; }}>
                <Calendar className="w-4 h-4" /> Schedule
              </Link>
              <Link to="/rooms"
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 12px 32px rgba(124,58,237,0.5)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,58,237,0.3)"}>
                <Plus className="w-4 h-4" /> Join Study Room
              </Link>
            </div>
          </header>

          {/* ── Stats & Timer Row ── */}
          <div className="grid lg:grid-cols-12 gap-5 mb-8">
            <StatsRow stats={stats} points={points} />
            <FocusTimerCard 
              timerMins={timerMins}
              timerSecs={timerSecs}
              timerRunning={timerRunning}
              setTimerRunning={setTimerRunning}
              setTimerSeconds={setTimerSeconds}
              timerProgress={timerProgress}
            />
          </div>

          {/* ── Study Rooms & Todo ── */}
          <div className="grid lg:grid-cols-12 gap-5 mb-8">
            <StudyRoomsCard rooms={data.rooms} navigate={navigate} />
            <TodoListCard todos={data.todos} />
          </div>

          {/* ── Quick Navigation ── */}
          <SectionLabel label="Quick Access" icon={LayoutGrid} />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {quickNav.map((r, i) => (
              <BentoCard key={i} delay={0.4 + i * 0.07} accentColor={r.glow.replace("0.3)", "1)")}>
                <Link to={r.path} className="block p-7 h-full group/qnav">
                  <div className="mb-5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover/qnav:scale-110"
                      style={{
                        background: `${r.color}18`,
                        border: `1px solid ${r.color}28`,
                        boxShadow: `0 0 20px ${r.glow}`,
                      }}>
                      <r.icon className="w-5 h-5" style={{ color: r.color }} />
                    </div>
                    <h4 className="text-base font-bold mb-1" style={{ color: "#e2e8f0" }}>{r.title}</h4>
                    <p className="text-xs font-medium" style={{ color: "#475569" }}>{r.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover/qnav:opacity-100 transition-opacity duration-300"
                    style={{ color: r.color }}>
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </BentoCard>
            ))}
          </div>

        </div>
        <Footer sidebarWidth={SIDEBAR_W} />
      </main>
    </div>
  );
}
