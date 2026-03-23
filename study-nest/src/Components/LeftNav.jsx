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
import logoUrl from "../assets/logo.png";
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
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
          style={{ background: "linear-gradient(180deg, #7c3aed, #06b6d4)" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}

      {/* Glow bg for active */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl"
          style={{ background: "radial-gradient(ellipse at left, rgba(124,58,237,0.1), transparent 70%)" }} />
      )}

      <div className={`flex-shrink-0 w-5 h-5 transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`}
        style={{
          color: isActive ? "#a78bfa" : "inherit",
          filter: isActive ? "drop-shadow(0 0 6px rgba(139,92,246,0.5))" : "none"
        }}>
        {icon}
      </div>

      <AnimatePresence mode="wait">
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-[13px] font-semibold whitespace-nowrap relative z-10 text-left"
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
      background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
      border: isActive ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
      color: isActive ? "#a78bfa" : "#475569",
    },
    onMouseEnter: e => {
      if (!isActive) {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.color = "#94a3b8";
      }
    },
    onMouseLeave: e => {
      if (!isActive) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#475569";
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
            background: "rgba(13,15,26,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
            color: "#e2e8f0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
          }}
        >
          {label}
          <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
            style={{ background: "rgba(13,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRight: "none", borderTop: "none" }} />
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
        className={`fixed top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: sidebarWidth,
          background: "rgba(8,9,14,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          boxShadow: navOpen ? "20px 0 50px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* Ambient glow top */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 70%)" }} />

        {/* Brand Header */}
        <div className="h-20 flex items-center px-4 flex-shrink-0 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <Link to="/home" className="flex items-center gap-3.5 flex-1 min-w-0 group/logo">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 p-2 relative"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))",
                border: "1px solid rgba(124,58,237,0.3)",
                boxShadow: "0 0 20px rgba(124,58,237,0.2)"
              }}
            >
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
            <AnimatePresence mode="wait">
              {navOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -10, filter: "blur(8px)" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="text-base font-bold tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, #f1f5f9, #a78bfa)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text"
                    }}>
                    StudyNest
                  </span>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5"
                    style={{ color: "#334155" }}>
                    UIU Platform
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Toggle Button */}
          {navOpen && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setNavOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ml-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#475569"
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.button>
          )}
          {!navOpen && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setNavOpen(true)}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-200"
              style={{
                background: "rgba(13,15,26,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#a78bfa",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 custom-scroll">

          {/* Main Menu */}
          <div className="space-y-1 mb-6">
            {navOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 mb-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#334155" }}
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
          <div className="mx-4 mb-6" style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />

          {/* Tools */}
          <div className="space-y-1">
            {navOpen && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 mb-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#334155" }}
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
                 <div className="mx-4 my-4" style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
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
                className="relative block p-4 rounded-2xl overflow-hidden group/pts transition-all duration-300"
                style={{
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(124,58,237,0.14)";
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(124,58,237,0.08)";
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover/pts:opacity-100 transition-opacity duration-300"
                  style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.1), transparent 70%)" }} />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 15px rgba(124,58,237,0.4)" }}>
                    <Trophy className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>
                      Study Points
                    </p>
                    <p className="text-xl font-bold leading-none mt-0.5"
                      style={{ color: "#a78bfa", textShadow: "0 0 15px rgba(139,92,246,0.5)" }}>
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