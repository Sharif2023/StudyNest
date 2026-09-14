import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

// ─── Animated Counter ─────────────────────────────────────────────────────────
export function AnimatedCounter({ value, duration = 1500 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const target = parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); return; }
      setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value, duration]);

  const raw = String(value);
  const prefix = raw.match(/^[^0-9]*/)?.[0] || "";
  const suffix = raw.match(/[^0-9]*$/)?.[0] || "";
  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ─── Glass Card Component ─────────────────────────────────────────────────────
export const BentoCard = ({ children, className = "", delay = 0, accentColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`relative overflow-hidden rounded-[2rem] bg-white transition-all duration-500 group ${className}`}
    style={{
      border: "1px solid rgba(0,29,54,0.08)",
      boxShadow: "0 4px 12px rgba(0,29,54,0.03)",
    }}
    whileHover={{
      y: -4,
      borderColor: accentColor || "rgba(0,29,54,0.2)",
      boxShadow: "0 12px 32px rgba(0,29,54,0.08)",
    }}
  >
    {accentColor && (
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem]"
        style={{ background: "transparent" }} />
    )}
    <div className="relative z-10 h-full">{children}</div>
  </motion.div>
);

// ─── Section Label ────────────────────────────────────────────────────────────
export const SectionLabel = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-4 mb-8">
    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-[#001D36]/5 border border-[#001D36]/10">
      <Icon className="w-5 h-5 text-[#001D36]" />
    </div>
    <h2 className="text-sm font-bold uppercase tracking-widest text-[#001D36]">
      {label}
    </h2>
    <div className="flex-1 h-px bg-[#001D36]/10" />
  </div>
);
