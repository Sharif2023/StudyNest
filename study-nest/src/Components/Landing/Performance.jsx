import React from "react";
import { motion } from "framer-motion";
import { useCountUp, QuoteIcon } from "./LandingShared";

export default function Performance() {
  const { ref, value } = useCountUp({ target: 15420, duration: 2500 });
  const testimonials = [
    {
      quote: "StudyNest synchronized our entire CSE220 squad. We hit milestones faster than ever.",
      author: "Rafi Ahmed",
      role: "Engineering, UIU",
    },
    {
      quote: "The resource management is pure gold. No more hunting for lecture notes in lost group chats.",
      author: "Nusrat Jahan",
      role: "Business, UIU",
    },
  ];

  return (
    <section className="bg-white py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-24 lg:grid-cols-2 items-center">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-6 block">Real Impact</span>
            <h2 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
              Exponential<br />
              <span className="text-zinc-400 italic font-light">Growth.</span>
            </h2>
            
            <div ref={ref} className="mt-12 group bg-zinc-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden transition-transform hover:-rotate-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <span className="block text-sm font-black uppercase tracking-widest text-white/50 mb-2">Sessions Synchronized</span>
                <span className="text-5xl sm:text-7xl font-black tracking-tight">{value.toLocaleString()}</span>
                <div className="mt-8 flex items-center gap-2">
                    <div className="w-8 h-1 bg-cyan-500 rounded-full" />
                    <span className="text-xs font-bold text-white/60">Rising Daily</span>
                </div>
            </div>
          </div>

          <div className="grid gap-8">
            {testimonials.map((t, idx) => (
              <motion.figure
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: idx * 0.2 }}
                className="relative rounded-3xl bg-zinc-50 p-8 pt-12 ring-1 ring-zinc-200"
              >
                <div className="absolute top-0 left-8 -translate-y-1/2 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-zinc-100">
                    <QuoteIcon className="h-5 w-5 text-zinc-300" />
                </div>
                <blockquote className="text-xl font-medium text-zinc-800 tracking-tight leading-snug">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-200" />
                  <div>
                    <span className="block font-black text-zinc-900 text-sm">{t.author}</span>
                    <span className="block text-xs text-zinc-400 font-bold uppercase tracking-wider">{t.role}</span>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
