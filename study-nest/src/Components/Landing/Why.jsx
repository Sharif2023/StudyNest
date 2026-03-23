import React from "react";
import { motion } from "framer-motion";

export default function Why() {
  return (
    <section id="why" className="py-32 bg-white relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-3 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-right">
            <h2 className="text-4xl font-black text-zinc-900 tracking-tighter leading-tight mb-8">
              Why <span className="text-zinc-400">StudyNest?</span>
            </h2>
            <p className="text-xl text-zinc-500 leading-relaxed font-medium">
              Studying alone is a thing of the past. 
              StudyNest bridges the gap between isolation and achievement. 
            </p>
            <div className="mt-8 space-y-6">
                <div>
                    <h4 className="text-lg font-black text-zinc-900 tracking-tight">Dynamic Groups</h4>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">Form teams based on real-time course enrollment.</p>
                </div>
            </div>
          </div>

          {/* Center: Image with glass effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-100">
              <img
                src="https://images.stockcake.com/public/8/2/8/828a6567-801e-4b49-bb13-28ab39e847cb_large/group-study-session-stockcake.jpg"
                alt="Collaborative Study"
                className="w-full h-64 sm:h-[400px] md:h-[500px] object-cover"
              />
            </div>
          </motion.div>

          {/* Right: Text content */}
          <div className="text-center lg:text-left">
            <p className="text-xl text-zinc-500 leading-relaxed font-medium mb-8">
              By connecting with peers in a dedicated academic ecosystem, 
              you transform individual effort into collective success.
            </p>
            <div className="space-y-6">
                <div>
                    <h4 className="text-lg font-black text-zinc-900 tracking-tight">Resource Sync</h4>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">Instant sharing of notes and verified documents.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
