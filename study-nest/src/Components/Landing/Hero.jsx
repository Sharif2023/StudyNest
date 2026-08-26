import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const images = [
    "https://www.uiu.ac.bd/wp-content/uploads/2023/12/IMG_1752-Edited.jpg",
    "https://ciac.uiu.ac.bd/wp-content/uploads/2022/01/canteen.jpg",
    "https://westcoastuniversity.edu/wp-content/uploads/2023/03/WCU-Blog_StudyBuddy-VirtualStudyGroup.jpg",
    "https://img.magnific.com/free-photo/close-up-businessman-writing-summary_1098-2566.jpg?semt=ais_hybrid&w=740&q=80",
    "https://static.vecteezy.com/system/resources/thumbnails/005/858/609/small/q-and-a-text-over-wooden-table-business-concept-free-photo.jpg",
    "https://media.tenor.com/TYOAmtDprC8AAAAM/chat-bot.gif",
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section id="home" className="relative pt-16 pb-16 lg:pt-10 lg:pb-24 overflow-hidden bg-white">
      {/* Subtle background glow - Static to prevent scroll lag */}
      <div className="absolute inset-0 -z-10 transform-gpu">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-zinc-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-zinc-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* LEFT CONTENT - Restored Original Colors */}
          <div className="relative transform-gpu">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="will-change-transform"
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/5 border border-zinc-900/10 mb-8">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Academic Synergy Platform</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
                Study<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900 pb-2 inline-block">
                  Nest.
                </span>
              </h1>

              <p className="mt-8 text-xl text-zinc-500 max-w-lg leading-relaxed font-medium">
                The high-performance collaborative environment for modern students at UIU.
                Synchronize, study, and succeed together.
              </p>

              <div className="mt-12 flex flex-wrap items-center gap-6">
                <a
                  href="/login"
                  className="px-10 py-5 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:-translate-y-1 transition-transform"
                >
                  Join a group
                </a>
                <a
                  href="#why"
                  className="px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                >
                  Documentation
                </a>
              </div>
            </motion.div>
          </div>

          {/* RIGHT VISUAL - New Bento Layout but Light Theme & Hardware Accelerated */}
          <div className="relative lg:h-[600px] w-full perspective-1000 transform-gpu">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative w-full h-full flex items-center justify-center lg:justify-end will-change-transform"
            >
              {/* Optional backdrop ambient glow */}
              <div className="absolute -inset-10 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 blur-3xl opacity-50 transform-gpu" />

              {/* Main Image Container */}
              <div className="relative w-[90%] sm:w-[80%] aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-zinc-200 shadow-2xl z-10 group bg-zinc-100 transform-gpu">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />

                <AnimatePresence mode="wait">
                  <motion.img
                    key={current}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    src={images[current]}
                    alt="Modern Study Environment"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 will-change-transform"
                  />
                </AnimatePresence>

                {/* Glass overlay on main image */}
                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <div className="h-1 w-full bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Element 1 - Top Left */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[5%] -left-[5%] z-20 w-48 p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white shadow-xl hidden sm:block will-change-transform transform-gpu"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Join a</div>
                    <div className="text-sm font-black text-zinc-900">Study Room</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Element 2 - Bottom Left */}
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute bottom-[10%] -left-[10%] z-30 w-56 p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl will-change-transform transform-gpu"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Growing Community
                  </span>

                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-green-500"
                  />
                </div>

                {/* Chart */}
                <div className="flex items-end gap-1.5 h-12">
                  {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                    <div
                      key={i}
                      className="w-full h-full bg-zinc-200 rounded-sm relative overflow-hidden"
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{
                          duration: 1,
                          delay: i * 0.1,
                        }}
                        className="absolute bottom-0 left-0 w-full bg-zinc-900 rounded-sm will-change-transform"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Floating Element 3 - Top Right (Small badge) */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-[25%] -right-[5%] z-20 w-16 h-16 rounded-2xl bg-zinc-900 p-[2px] shadow-2xl shadow-zinc-900/20 hidden md:block will-change-transform transform-gpu"
              >
                <div className="w-full h-full bg-zinc-900 rounded-2xl flex items-center justify-center">
                  <svg fill="white" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="size-6"><path d="M23.849 14.91c-.24 2.94-2.73 5.22-5.7 5.19h-3.15l-6 3.9v-3.9l6-3.9h3.15c.93.03 1.71-.66 1.83-1.59.18-3 .18-6-.06-9-.06-.84-.75-1.47-1.56-1.53-2.04-.09-4.2-.18-6.36-.18s-4.32.06-6.36.21c-.84.06-1.5.69-1.56 1.53-.21 3-.24 6-.06 9 .09.93.9 1.59 1.83 1.56h3.15v3.9h-3.15a5.644 5.644 0 01-5.7-5.19c-.21-3.21-.18-6.39.06-9.6a5.57 5.57 0 015.19-5.1c2.1-.15 4.35-.21 6.6-.21s4.5.06 6.63.24a5.57 5.57 0 015.19 5.1c.21 3.18.24 6.39.03 9.57z" /></svg>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
