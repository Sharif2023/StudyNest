import React from "react";

export default function CareersCTA() {
  return (
    <section id="contact" className="py-32 bg-white selection:bg-cyan-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900 p-12 sm:p-20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-6 block">Ready to Synchronize?</span>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.9]">
                Initiate your<br />
                <span className="text-white/40">Next Session.</span>
              </h2>
              <p className="mt-8 text-xl text-white/50 font-medium leading-relaxed max-w-md">
                Join the network of elite scholars at United International University. 
                Your academic vault is waiting.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6 lg:justify-end">
              <a
                href="/signup"
                className="px-10 py-5 rounded-2xl bg-white text-zinc-900 text-[11px] font-black uppercase tracking-[0.2em] hover:-translate-y-1 transition-transform shadow-2xl shadow-white/5"
              >
                Join Protocol
              </a>
              <a
                href="/signup"
                className="px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white border border-white/20 hover:bg-white/10 transition-colors"
              >
                Browse Groups
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
