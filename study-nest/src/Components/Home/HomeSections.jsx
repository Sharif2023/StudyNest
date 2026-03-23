import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Trophy, Video, BookOpen, Zap, TrendingUp, 
  ChevronRight, PlayCircle, Plus, 
  CheckCircle2, ArrowRight
} from "lucide-react";
import { BentoCard, AnimatedCounter } from "./HomeComponents";

export const StatsRow = ({ stats, points }) => (
  <BentoCard className="lg:col-span-8 p-8" delay={0.1} accentColor="#7c3aed">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>
        Study Statistics
      </h3>
      <span className="badge-violet text-[10px] animate-pulse">
        <TrendingUp className="w-3 h-3" /> +24% Productivity
      </span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.08 }}
          className="group/stat cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 group-hover/stat:scale-110"
            style={{
              background: `${s.color}15`,
              border: `1px solid ${s.color}25`,
              boxShadow: `0 0 20px ${s.glow}`,
            }}>
            <s.icon className="w-5.5 h-5.5" style={{ color: s.color }} />
          </div>
          <p className="text-3xl font-bold leading-none mb-2"
            style={{ color: "#f1f5f9" }}>
            <AnimatedCounter value={s.val} />
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
            {s.label}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="mt-8 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
          Academic Progress
        </p>
        <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>Level 8 — 74%</p>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "74%" }}
          transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)" }}
        />
      </div>
    </div>
  </BentoCard>
);

export const FocusTimerCard = ({ 
  timerMins, 
  timerSecs, 
  timerRunning, 
  setTimerRunning, 
  setTimerSeconds, 
  timerProgress 
}) => (
  <BentoCard className="lg:col-span-4 p-8" delay={0.2} accentColor="#06b6d4">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em] mb-6" style={{ color: "#475569" }}>
        Focus Timer
      </h3>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke="url(#timer-grad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="263.9"
              strokeDashoffset={263.9 * (1 - timerProgress / 100)}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold" style={{ color: "#f1f5f9" }}>
              {timerMins}:{timerSecs}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: "#475569" }}>
              {timerRunning ? "Focusing" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setTimerRunning(!timerRunning)}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300"
          style={{
            background: timerRunning
              ? "rgba(251,113,133,0.12)"
              : "linear-gradient(135deg, #7c3aed, #06b6d4)",
            border: timerRunning ? "1px solid rgba(251,113,133,0.25)" : "none",
            color: timerRunning ? "#fb7185" : "white",
            boxShadow: timerRunning ? "none" : "0 8px 24px rgba(124,58,237,0.3)",
          }}>
          {timerRunning ? "⏸  Pause" : "▶  Start Session"}
        </button>
        <button
          onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
          Reset
        </button>
      </div>
    </BentoCard>
);

export const StudyRoomsCard = ({ rooms, navigate }) => (
  <BentoCard className="lg:col-span-8 p-8" delay={0.3}>
    <div className="flex items-center justify-between mb-7">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "#475569" }}>
        Active Study Rooms
      </h3>
      <Link to="/rooms"
        className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 group/link"
        style={{ color: "#64748b" }}
        onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
        onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
        View All <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
      </Link>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      {rooms.length > 0 ? rooms.map((r, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -4, scale: 1.02 }}
          className="p-5 rounded-2xl cursor-pointer transition-all duration-400 group/room"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(124,58,237,0.08)";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          }}
        >
          <div className="mb-4">
            <span className="badge-violet text-[10px] mb-3 inline-flex">{r.course || "GENERAL"}</span>
            <h4 className="text-sm font-bold leading-snug" style={{ color: "#e2e8f0" }}>
              {r.title}
            </h4>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(u => (
                <div key={u} className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "2px solid #08090e", color: "white" }}>
                  S
                </div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(`/rooms/${r.id}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
              <PlayCircle className="w-4.5 h-4.5" />
            </motion.button>
          </div>
        </motion.div>
      )) : (
        <div className="col-span-3 py-16 text-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Video className="w-8 h-8 mx-auto mb-3" style={{ color: "#334155" }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>
            No active rooms
          </p>
          <Link to="/rooms/newform" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200"
            style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
            <Plus className="w-3.5 h-3.5" /> Create Room
          </Link>
        </div>
      )}
    </div>
  </BentoCard>
);

export const TodoListCard = ({ todos }) => (
  <BentoCard className="lg:col-span-4 p-8" delay={0.35} accentColor="#34d399">
    <div className="flex items-center justify-between mb-7">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "#475569" }}>
        Task List
      </h3>
      <Link to="/to-do-list"
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.3)"; e.currentTarget.style.color = "#34d399"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}>
        <Plus className="w-4 h-4" />
      </Link>
    </div>

    <div className="space-y-3">
      {todos.map((todo, i) => (
        <motion.div
          key={todo.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex items-center gap-3 group/task cursor-pointer p-2 rounded-xl transition-all duration-200"
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${todo.status === 'completed' ? '' : 'group-hover/task:border-emerald-500/50'}`}
            style={{
              background: todo.status === 'completed' ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
              border: todo.status === 'completed' ? "1px solid rgba(52,211,153,0.35)" : "1px solid rgba(255,255,255,0.08)"
            }}>
            {todo.status === 'completed' && <CheckCircle2 className="w-3 h-3" style={{ color: "#34d399" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-none transition-all duration-300 truncate ${todo.status === 'completed' ? 'line-through' : ''}`}
              style={{ color: todo.status === 'completed' ? "#334155" : "#94a3b8" }}>
              {todo.title}
            </p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: "#334155" }}>
              {new Date(todo.due_date).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      ))}
      {todos.length === 0 && (
        <div className="py-10 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "#334155" }}>
          All clear! 🎯
        </div>
      )}
    </div>

    <Link to="/to-do-list"
      className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.25)"; e.currentTarget.style.color = "#34d399"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#64748b"; }}>
      Manage Tasks <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  </BentoCard>
);
