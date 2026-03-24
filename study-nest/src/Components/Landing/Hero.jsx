import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Hero() {
  const images = [
    "https://www.uiu.ac.bd/wp-content/uploads/2023/12/IMG_1752-Edited.jpg",
    "https://ciac.uiu.ac.bd/wp-content/uploads/2022/01/canteen.jpg",
    "https://westcoastuniversity.edu/wp-content/uploads/2023/03/WCU-Blog_StudyBuddy-VirtualStudyGroup.jpg",
    "https://i.pinimg.com/1200x/95/42/dc/9542dcfeeb674eb281caf1bf1977677b.jpg",
    "https://i.pinimg.com/1200x/44/8e/b3/448eb3654f309cde7392d18ec811f95b.jpg",
    "https://i.pinimg.com/1200x/73/fb/bd/73fbbd7f9b4d0faf3248be25aeb74ed8.jpg",
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section id="home" className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden bg-white">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-zinc-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-zinc-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* LEFT CONTENT */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/5 border border-zinc-900/10 mb-8">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Academic Synergy Platform</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
                Study<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900">Nest.</span>
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

          {/* RIGHT VISUAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-10 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 blur-3xl opacity-50" />
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl">
              <div className="absolute inset-0 bg-zinc-900/10 mix-blend-overlay" />
              <img
                src={images[current]}
                alt="UIU Student Life"
                className="aspect-square sm:aspect-[4/5] md:aspect-square w-full object-cover transition-transform duration-1000"
              />
              
              {/* Floating UI element */}
              <div className="absolute bottom-8 left-8 right-8 p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex -space-x-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-white/20 bg-zinc-800" />
                        ))}
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-black text-white/60 uppercase tracking-widest">Active Pulse</span>
                        <span className="block text-sm font-bold text-white tracking-tight">2.4k Students Online</span>
                    </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
