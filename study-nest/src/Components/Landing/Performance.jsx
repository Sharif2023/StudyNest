import React from "react";
import { motion } from "framer-motion";
import { useCountUp, QuoteIcon } from "./LandingShared";

export default function Performance() {

  const testimonials = [
    {
      quote: "One day, all your hard work will pay off.",
      author: "Liam Porritt",
      role: "Internet personality",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToZlbQuHe8npFtz0FJLhx5Ey0TyUp260wltaODXDkE3gaVwPxdzi7eYXzfKvjU_VkjdY96Tc-bfjmb7lOe1iHlZ549HIEke0gxZiz8aO9cyQ&s=10",

    },
    {
      quote: "Education is the most powerful weapon which you can use to change the world.",
      author: "Nelson Mandela",
      role: "Revolutionary and former President of South Africa",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3nlZVpiS0TxJg9MvnmPyqrjeNaeYhpDPJEs4t53tzuLSfR_IhXQQMF3PN48VbydwlsEGbwn4tzu1z64FhdTPY6A2z_zcKpiVWJIuoJ_UZ&s=10",
    },
  ];

  return (
    <section className="bg-white py-10 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 lg:mb-24">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-4 block">Real Impact</span>
          <h2 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tighter leading-[0.9]">
            Exponential<br />
            <span className="text-zinc-400 italic font-light">Growth.</span>
          </h2>
        </div>
        
        <div className="grid gap-16 lg:gap-24 lg:grid-cols-2 items-center">
          <div>
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-zinc-200 aspect-[4/3] bg-zinc-50 transition-transform hover:-rotate-1">
                <img
                  src="https://media.tenor.com/TYOAmtDprC8AAAAM/chat-bot.gif"
                  alt="AI Chat Bot Assistant"
                  className="w-full h-full object-cover"
                />
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
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img
                        src={t.img}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                  </div>
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
