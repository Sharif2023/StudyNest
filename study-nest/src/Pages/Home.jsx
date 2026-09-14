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
      const results = await Promise.allSettled([
        apiClient.get("meetings.php"),
        apiClient.get("QnAForum.php"),
        storedProfile.id ? apiClient.get(`todo.php?user_id=${storedProfile.id}`) : Promise.resolve({ data: { todos: [] } }),
        apiClient.get("getLeaderboard.php"),
      ]);
      const [roomsRes, qaRes, todoRes, leaderRes] = results.map((result) =>
        result.status === "fulfilled" ? result.value : { data: {} }
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") console.error("Dashboard widget load failed:", index, result.reason);
      });
        setData({
          rooms: roomsRes.data?.rooms?.slice(0, 3) || [],
          qa: qaRes.data?.data?.slice(0, 3) || (Array.isArray(qaRes.data) ? qaRes.data.slice(0, 3) : []),
          todos: todoRes.data?.todos?.slice(0, 5) || [],
          leaderboard: leaderRes.data?.leaderboard?.slice(0, 5) || [],
        });
    })();
  }, []);
 
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await apiClient.get("meetings.php");
        setData((d) => ({ ...d, rooms: res.data?.rooms?.slice(0, 3) || [] }));
      } catch {
        // Keep the current dashboard data if the refresh pulse fails.
      }
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
    { label: "Study Points",  val: points,    icon: Trophy,   color: "#F18900" },
    { label: "Live Rooms",    val: 12,         icon: Video,    color: "#00808C" },
    { label: "Resources",     val: 42,         icon: BookOpen, color: "#8AB100" },
    { label: "Global Rank",   val: "#4",       icon: Zap,      color: "#A7481E" },
  ];

  const quickNav = [
    { title: "Study Notes",     desc: "Academic Library",    icon: Files,        path: "/notes",      color: "#F18900" },
    { title: "AI Tools",        desc: "AI Assistant",    icon: Sparkles,     path: "/ai-check",   color: "#00808C" },
    { title: "Discussion",      desc: "Student Forum",      icon: MessageSquare, path: "/forum",     color: "#8AB100" },
    { title: "Leaderboard",     desc: "Top Students",       icon: Trophy,        path: "/points-leaderboard", color: "#A7481E" },
  ];

  return (
    <div className="min-h-screen relative bg-[#F0F4F8]">
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
                <div className="w-2.5 h-2.5 rounded-full bg-[#8AB100] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#66625C]">
                  Live · Online
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-black leading-none tracking-tighter">
                <span className="text-[#66625C]">Hello,</span>{" "}
                <span className="text-[#001D36]">
                  {profile.name?.split(' ')[0] || "Scholar"}.
                </span>
              </h1>
              <p className="text-base mt-4 max-w-md font-medium text-[#66625C]">
                Ready to level up? Your study dashboard is live and synced.
              </p>
            </motion.div>

            <div className="flex items-center gap-3">
              <Link to="/to-do-list" className="flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-300 bg-white border border-[#001D36]/10 text-[#001D36] hover:border-[#001D36]/30 hover:shadow-md">
                <Calendar className="w-4 h-4" /> Schedule
              </Link>
              <Link to="/rooms"
                className="flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-300 bg-[#001D36] text-white hover:bg-[#001D36]/90 hover:shadow-xl hover:shadow-[#001D36]/20">
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
              <BentoCard key={i} delay={0.4 + i * 0.07}>
                <Link to={r.path} className="block p-7 h-full group/qnav">
                  <div className="mb-5">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-6 transition-all duration-500 group-hover/qnav:scale-110"
                      style={{ background: `${r.color}15`, border: `1px solid ${r.color}25` }}>
                      <r.icon className="w-6 h-6" style={{ color: r.color }} />
                    </div>
                    <h4 className="text-lg font-bold mb-1 text-[#001D36]">{r.title}</h4>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#66625C]">{r.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/qnav:opacity-100 transition-opacity duration-300"
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
