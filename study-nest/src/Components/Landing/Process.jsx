import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "./LandingShared";

export default function Process() {
  const steps = [
    {
      n: "01",
      title: "Session Formation",
      body: "Establish your perimeter. Create open or encrypted study groups tailored to your academic trajectory.",
      img: "https://www.uiu.ac.bd/wp-content/uploads/2023/12/IMG_1752-Edited.jpg",
    },
    {
      n: "02",
      title: "Resource Injection",
      body: "Upload lecture payloads, past protocols, and verified links. Everything stays indexed and instantly accessible.",
      img: "https://i.ytimg.com/vi/xVXGTvoLndw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBkdO5k77WuIIbXf_rSvC3NSolgvQ",
    },
  ];

  return (
    <section id="process" className="py-32 bg-white selection:bg-cyan-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20 flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-6 block">The Protocol</span>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-tight">
              Streamlining the<br />
              <span className="text-zinc-400">Scholastic Flow.</span>
            </h2>
          </div>
          <a href="/signup" className="group flex items-center gap-4 text-sm font-black uppercase tracking-widest text-zinc-900">
            Start the sequence <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center transition-transform group-hover:translate-x-2"><ArrowRight className="h-4 w-4" /></div>
          </a>
        </div>

        <div className="grid gap-16 md:grid-cols-2">
          {steps.map((s, idx) => (
            <motion.article
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: idx * 0.2 }}
              className="group relative"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-[2.5rem] bg-zinc-100 shadow-2xl">
                <img src={s.img} alt="" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-10">
                <div className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.4em] mb-3 leading-none italic">{s.n} / Core Phase</div>
                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter leading-none">{s.title}</h3>
                <p className="mt-6 text-lg text-zinc-500 font-medium leading-relaxed max-w-md">{s.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
