import React from "react";
import { motion } from "framer-motion";

export default function Gallery() {
  const imgs = [
    "https://nsrit.com/wp-content/uploads/2025/11/Is-This-You-Frustrated-by-IT-Animated-GIF.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyMW95eWdobDRzcG82dmpjcGUzOGgwcnZtODRqd3NyaXM1bXh6dHp6cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fXo1IT0aoGCWXw4lzd/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyNzVxc3k0dDFicmwzbTByNjhpZ2lleTJmdnUweXB5azV2YXN4eHhkdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SVZDSEPldhypJpmhPv/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyY2R1OG55ZXAwam51anZlZWl4YndueXl5cmF0bnU4YzY3eGozZmEwOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fSYjlNlW2eDJCSgGvt/giphy.gif",
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
