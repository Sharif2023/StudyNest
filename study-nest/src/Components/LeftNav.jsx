import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  Video,
  Files,
  MessageSquare,
  Database,
  CheckSquare,
  Trophy,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  Zap,
  Users,
  HelpCircle,
  Shield
} from "lucide-react";

import SummarizingParaphrasing from "./SummarizingParaphrasing";
import { API_BASE } from "../apiConfig";

const NavItem = ({ to, icon, label, expanded, isActive, onClick }) => {
  const isButton = !!onClick;
  
  const innerContent = (
    <>
      {/* Active left bar */}
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#001D36]"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}

      {/* Glow bg for active */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-[#001D36]/5" />
      )}

      <div className={`flex-shrink-0 w-5 h-5 transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
        style={{ color: isActive ? "#001D36" : "inherit" }}>
        {icon}
      </div>

      <AnimatePresence mode="wait">
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -10, filter: "none" }}
            animate={{ opacity: 1, x: 0, filter: "none" }}
            exit={{ opacity: 0, x: -10, filter: "none" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-[13px] font-bold whitespace-nowrap relative z-10 text-left"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  const commonProps = {
    className: "flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden w-full",
    style: {
      background: isActive ? "rgba(0,29,54,0.05)" : "transparent",
      color: isActive ? "#001D36" : "#66625C",
    },
    onMouseEnter: e => {
      if (!isActive) {
        e.currentTarget.style.background = "rgba(0,29,54,0.02)";
        e.currentTarget.style.color = "#001D36";
      }
    },
    onMouseLeave: e => {
      if (!isActive) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#66625C";
      }
    }
  };

  return (
    <div className="relative group px-3">
      {isButton ? (
        <button onClick={onClick} {...commonProps}>
          {innerContent}
        </button>
      ) : (
        <Link to={to} {...commonProps}>
          {innerContent}
        </Link>
      )}

      {/* Collapsed Tooltip */}
      {!expanded && (
        <div
          className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-[100]"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(0,29,54,0.15)",
            backdropFilter: "blur(16px)",
            color: "#001D36",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
          }}
        >
          {label}
          <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
            style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,29,54,0.15)", borderRight: "none", borderTop: "none" }} />
        </div>
      )}
    </div>
  );
};

export default function LeftNav({ navOpen, setNavOpen, sidebarWidth = 80 }) {
  const location = useLocation();
  const [spOpen, setSpOpen] = useState(false);
    const [points, setPoints] = useState(0);
    const [userRole, setUserRole] = useState("User");
  
    useEffect(() => {
      const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
      if (auth?.points) setPoints(auth.points);
      if (auth?.role) setUserRole(auth.role);
    const handlePointsUpdate = (e) => e.detail?.points !== undefined && setPoints(e.detail.points);
    window.addEventListener('studynest:points-updated', handlePointsUpdate);
    return () => window.removeEventListener('studynest:points-updated', handlePointsUpdate);
  }, []);

  const isAdmin = userRole?.toLowerCase() === 'admin';

  const navItems = [
    { to: isAdmin ? "/admin" : "/home", label: "Dashboard", icon: <LayoutGrid className="w-5 h-5" /> },
    ...(!isAdmin ? [
      { to: "/rooms",     label: "Study Rooms",  icon: <Video className="w-5 h-5" /> },
      { to: "/resources", label: "Resources",    icon: <Database className="w-5 h-5" /> },
      { to: "/forum",     label: "Q&A Forum",    icon: <MessageSquare className="w-5 h-5" /> },
      { to: "/notes",     label: "My Notes",     icon: <Files className="w-5 h-5" /> },
      { to: "/my-resources", label: "My Resources", icon: <LayoutGrid className="w-5 h-5" /> },
      { to: "/to-do-list", label: "Planner",     icon: <CheckSquare className="w-5 h-5" /> },
    ] : []),
  ];

  const bottomNavItems = [
    { label: "Help Center", icon: <HelpCircle className="w-5 h-5" />, to: "/help" },
  ];

  const toolItems = !isAdmin ? [
    { label: "AI Check",                   icon: <Sparkles className="w-5 h-5" />, to: "/ai-check" },
    { label: "Paraphrasing & Summarizing", icon: <Zap className="w-5 h-5" />,      onClick: () => setSpOpen(true) },
    { label: "Leaderboard",                icon: <Trophy className="w-5 h-5" />,   to: "/points-leaderboard" },
  ] : [];

  return (
    <>
      <aside
        onMouseEnter={() => setNavOpen && setNavOpen(true)}
        onMouseLeave={() => setNavOpen && setNavOpen(false)}
        className={`fixed top-20 left-0 flex flex-col z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          height: "calc(100vh - 80px)",
          width: sidebarWidth,
          background: "rgba(255,255,255,0.98)", // White
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(0,29,54,0.1)",
          boxShadow: navOpen ? "20px 0 50px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Ambient glow top */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-b from-[#001D36]/[0.02] to-transparent" />

        {/* Brand Header */}
        <div className="h-20 flex items-center px-4 flex-shrink-0 border-b border-[#001D36]/10 relative">
          <Link to="/home" className="flex items-center gap-3.5 flex-1 min-w-0 group/logo">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 relative"
            >
              <img src="/logo.ico" alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
            <AnimatePresence mode="wait">
              {navOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20, filter: "none" }}
                  animate={{ opacity: 1, x: 0, filter: "none" }}
                  exit={{ opacity: 0, x: -10, filter: "none" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="text-base font-bold tracking-tight text-[#001D36]">
                    StudyNest
                  </span>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5 text-[#66625C]">
                    UIU Platform
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Toggle Button for Desktop */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] z-50 hidden lg:block">
            {navOpen ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setNavOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 bg-white border border-[#001D36]/15 text-[#66625C] hover:bg-[#001D36]/5 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setNavOpen(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 bg-white border border-[#001D36]/15 text-[#001D36] hover:bg-[#001D36]/5 shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 custom-scroll mt-2">

          {/* Main Menu */}
          <div className="space-y-1 mb-6">
            {navOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#66625C]"
              >
                Navigation
              </motion.p>
            )}
            {navItems.map((item) => (
              <NavItem
                key={`nav-${item.to}`}
                {...item}
                expanded={navOpen}
                isActive={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="mx-4 mb-6" style={{ height: "1px", background: "rgba(0,29,54,0.05)" }} />

          {/* Tools */}
          <div className="space-y-1">
            {navOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#66625C]"
              >
                Tools
              </motion.p>
            )}
            {toolItems.map((item) => (
              <NavItem
                key={`tool-${item.label}`}
                {...item}
                expanded={navOpen}
                isActive={item.path ? location.pathname === item.path : false}
              />
            ))}
            
            {isAdmin && (
              <>
                 <div className="mx-4 my-4" style={{ height: "1px", background: "rgba(0,29,54,0.05)" }} />
                 <NavItem
                    to="/admin"
                    label="Admin Console"
                    icon={<Shield className="w-5 h-5" />}
                    expanded={navOpen}
                    isActive={location.pathname === "/admin"}
                 />
              </>
            )}
          </div>
        </div>

        {/* Points Widget (expanded only) */}
        <AnimatePresence>
          {navOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="px-4 pb-4"
            >
              <Link
                to="/points-leaderboard"
                className="relative block p-4 rounded-2xl overflow-hidden group/pts transition-all duration-300 bg-[#F18900]/10 border border-[#F18900]/20 hover:bg-[#F18900]/15 hover:border-[#F18900]/30"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[#F18900]/20">
                    <Trophy className="w-4.5 h-4.5 text-[#F18900]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#66625C]">
                      Study Points
                    </p>
                    <p className="text-xl font-bold leading-none mt-0.5 text-[#001D36]">
                      {points.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

      </aside>

      <SummarizingParaphrasing open={spOpen} onClose={() => setSpOpen(false)} />
    </>
  );
}