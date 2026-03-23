import React from "react";
import { motion } from "framer-motion";

export default function Gallery() {
  const imgs = [
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=3840&auto=format&fit=crop",
    "https://images.pexels.com/photos/15244082/pexels-photo-15244082/free-photo-of-hands-of-a-group-of-students-studying-together-around-a-table.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=85&w=3840&auto=format&fit=crop",
    "https://images.stockcake.com/public/b/2/3/b23d669d-d751-45e7-af44-94cc97af960c_large/students-studying-together-stockcake.jpg",
  ];

  return (
    <section className="bg-zinc-50 py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 flex items-center justify-between">
            <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">
                Life<span className="text-zinc-400">@StudyNest.</span>
            </h2>
            <div className="flex gap-2">
                <div className="w-12 h-1 bg-zinc-900 rounded-full" />
                <div className="w-4 h-1 bg-zinc-200 rounded-full" />
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {imgs.map((src, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="relative aspect-square overflow-hidden rounded-[2rem] bg-zinc-200 shadow-lg"
            >
              <img
                src={src}
                alt="StudyNest Student Life"
                loading="lazy"
                className="h-full w-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
