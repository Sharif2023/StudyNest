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
  <BentoCard className="lg:col-span-8 p-8" delay={0.1} accentColor="#001D36">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#66625C]">
        Study Statistics
      </h3>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#8AB100]/10 text-[#8AB100] border border-[#8AB100]/20">
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
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-5 transition-all duration-500 group-hover/stat:scale-110"
            style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
            <s.icon className="w-5.5 h-5.5" style={{ color: s.color }} />
          </div>
          <p className="text-3xl font-black leading-none mb-2 text-[#001D36]">
            <AnimatedCounter value={s.val} />
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#66625C]">
            {s.label}
          </p>
        </motion.div>
      ))}
    </div>

    <div className="mt-8 pt-6 border-t border-[#001D36]/10">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#66625C]">
          Academic Progress
        </p>
        <p className="text-sm font-black text-[#001D36]">Level 8 — 74%</p>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-[#001D36]/5 border border-[#001D36]/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "74%" }}
          transition={{ duration: 1.5, ease: "circOut", delay: 0.4 }}
          className="h-full rounded-full bg-[#00808C]"
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
  <BentoCard className="lg:col-span-4 p-8" delay={0.2} accentColor="#00808C">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em] mb-6 text-[#66625C]">
        Focus Timer
      </h3>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,29,54,0.05)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke="#00808C" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="263.9"
              strokeDashoffset={263.9 * (1 - timerProgress / 100)}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-[#001D36]">
              {timerMins}:{timerSecs}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 text-[#66625C]">
              {timerRunning ? "Focusing" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setTimerRunning(!timerRunning)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-300 flex justify-center items-center gap-2"
          style={{
            background: timerRunning ? "rgba(241,137,0,0.1)" : "#F18900",
            color: timerRunning ? "#F18900" : "#ffffff",
            border: timerRunning ? "1px solid rgba(241,137,0,0.2)" : "1px solid #F18900",
          }}>
          {timerRunning ? "Pause" : "Start Session"}
        </button>
        <button
          onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }}
          className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-300 bg-[#001D36]/5 text-[#001D36] hover:bg-[#001D36]/10">
          Reset
        </button>
      </div>
    </BentoCard>
);

export const StudyRoomsCard = ({ rooms, navigate }) => (
  <BentoCard className="lg:col-span-8 p-8" delay={0.3} accentColor="#001D36">
    <div className="flex items-center justify-between mb-7">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#66625C]">
        Active Study Rooms
      </h3>
      <Link to="/rooms"
        className="flex items-center gap-1.5 text-xs font-bold text-[#001D36]/60 hover:text-[#001D36] transition-colors group/link uppercase tracking-wider">
        View All <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
      </Link>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      {rooms.length > 0 ? rooms.map((r, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -4, scale: 1.02 }}
          className="p-5 rounded-2xl cursor-pointer transition-all duration-400 group/room bg-[#001D36]/5 border border-[#001D36]/10 hover:bg-[#001D36]/10"
        >
          <div className="mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-[#00808C]/10 text-[#00808C] mb-3">{r.course || "GENERAL"}</span>
            <h4 className="text-sm font-bold leading-snug text-[#001D36]">
              {r.title}
            </h4>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(u => (
                <div key={u} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#F0F4F8] border-2 border-white text-[#001D36]">
                  S
                </div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(`/rooms/${r.id}`)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F18900]/10 text-[#F18900] border border-[#F18900]/20 hover:bg-[#F18900] hover:text-white transition-colors">
              <PlayCircle className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      )) : (
        <div className="col-span-3 py-16 text-center rounded-3xl border-2 border-dashed border-[#001D36]/10 bg-[#001D36]/[0.02]">
          <Video className="w-8 h-8 mx-auto mb-3 text-[#66625C]/50" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#66625C]">
            No active rooms
          </p>
          <Link to="/rooms/newform" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-widest bg-[#001D36] text-white hover:bg-[#001D36]/90 transition-colors">
            <Plus className="w-4 h-4" /> Create Room
          </Link>
        </div>
      )}
    </div>
  </BentoCard>
);

export const TodoListCard = ({ todos }) => (
  <BentoCard className="lg:col-span-4 p-8" delay={0.35} accentColor="#8AB100">
    <div className="flex items-center justify-between mb-7">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#66625C]">
        Task List
      </h3>
      <Link to="/to-do-list"
        className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#001D36]/5 text-[#001D36] hover:bg-[#001D36] hover:text-white transition-colors">
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
          className="flex items-center gap-4 p-3 rounded-[14px] transition-all duration-200 hover:bg-[#001D36]/5 cursor-pointer"
        >
          <div className={`w-6 h-6 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-colors ${todo.status === 'completed' ? 'bg-[#8AB100]/15 border border-[#8AB100]/30' : 'bg-[#001D36]/5 border border-[#001D36]/15'}`}>
            {todo.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-[#8AB100]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold leading-none truncate ${todo.status === 'completed' ? 'line-through text-[#66625C]/50' : 'text-[#001D36]'}`}>
              {todo.title}
            </p>
            <p className="text-[10px] mt-1.5 font-bold uppercase tracking-wider text-[#66625C]">
              {new Date(todo.due_date).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      ))}
      {todos.length === 0 && (
        <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-[#66625C]">
          All clear! 🎯
        </div>
      )}
    </div>

    <Link to="/to-do-list"
      className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest bg-[#001D36]/5 text-[#001D36] hover:bg-[#001D36]/10 transition-colors">
      Manage Tasks <ArrowRight className="w-4 h-4" />
    </Link>
  </BentoCard>
);
