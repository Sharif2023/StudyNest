import React from "react";
import { motion } from "framer-motion";
import { classNames, StarIcon } from "./LandingShared";

export default function Inside() {
  const features = [
    {
      title: "Intelligent Groups",
      body: "Discover peers by subject, semester, or niche interest with our matching engine.",
      color: "bg-cyan-500",
    },
    {
      title: "Resource Forge",
      body: "A centralized vault for notes, recordings, and validated academic payloads.",
      color: "bg-indigo-500",
    },
    {
      title: "Pulse Scheduling",
      body: "Synchronize availability with integrated calendars and real-time polling.",
      color: "bg-fuchsia-500",
    },
    {
      title: "Scholar Network",
      body: "Engage in high-level discussions and build a lasting academic community.",
      color: "bg-zinc-900",
    },
  ];

  return (
    <section id="inside" className="bg-zinc-50 py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20 grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-6 block">The Ecosystem</span>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-tight">
                Architected for<br />
                <span className="text-zinc-400">Peak Performance.</span>
            </h2>
          </div>
          <p className="max-w-xl text-lg text-zinc-500 font-medium leading-relaxed lg:pb-1">
            Every tool in StudyNest is precision-engineered to reduce friction in your academic workflow, 
            allowing you to focus entirely on mastery and collaboration.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              className="group relative rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-zinc-200 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:ring-zinc-300"
            >
              <div className={classNames("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3", f.color)}>
                <StarIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-8 text-xl font-black text-zinc-900 tracking-tight">
                {f.title}
              </h3>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed font-medium">{f.body}</p>
              
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 transition-colors">
                Module Active <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
