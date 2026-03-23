import React from "react";
import { motion } from "framer-motion";

export default function Team() {
  const people = [
    {
      name: "Shariful Islam",
      role: "Team Leader & Full Stack Developer",
      img: "https://i.pinimg.com/736x/0d/15/73/0d15737be04a874f1ddcd7e0858d5f07.jpg",
    },
    {
      name: "Mahmudul Hasan",
      role: "Team Member & Full Stack Developer",
      img: "https://i.pinimg.com/1200x/82/6f/d5/826fd55fd0a04225cc625368d7e8476c.jpg",
    },
  ];

  return (
    <section id="team" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Meet the team
          </h2>
          <p className="mt-3 text-zinc-600">
            A passionate group of students and builders behind StudyNest.
          </p>
        </div>

        {/* Centered cards with flexbox */}
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-12">
          {people.map((p, idx) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.2 }}
              className="group relative w-full sm:w-72"
            >
              {/* Vibrant accent pulse */}
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
              
              <a 
                href={p.name === "Shariful Islam" ? "https://engineer-sharif.infinityfreeapp.com/" : "#"} 
                target={p.name === "Shariful Islam" ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="relative rounded-[2rem] bg-white p-5 text-center shadow-xl shadow-black/5 ring-1 ring-zinc-200 transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl block"
              >
                <div className="relative overflow-hidden rounded-2xl aspect-square mb-6">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h3 className="text-xl font-black text-zinc-900 tracking-tight group-hover:text-cyan-600 transition-colors">
                  {p.name}
                </h3>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {p.role}
                </p>
                
                <div className="mt-6 flex items-center justify-center gap-4 border-t border-zinc-100 pt-6">
                    {/* Social icons placeholders or simple dots for design */}
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
