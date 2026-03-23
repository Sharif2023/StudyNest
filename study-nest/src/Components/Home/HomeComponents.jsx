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
    className={`relative overflow-hidden rounded-3xl transition-all duration-500 group ${className}`}
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}
    whileHover={{
      y: -4,
      boxShadow: accentColor
        ? `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}30`
        : "0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.15)",
    }}
  >
    {accentColor && (
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(ellipse at top left, ${accentColor}12, transparent 60%)` }} />
    )}
    <div className="relative z-10 h-full">{children}</div>
  </motion.div>
);

// ─── Section Label ────────────────────────────────────────────────────────────
export const SectionLabel = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
      <Icon className="w-4 h-4" style={{ color: "#a78bfa" }} />
    </div>
    <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#64748b" }}>
      {label}
    </h2>
    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
  </div>
);
