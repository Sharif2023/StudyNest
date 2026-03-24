import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Twitter, Instagram, Facebook, Youtube, Sparkles, Linkedin } from "lucide-react";
import logoUrl from "../assets/logo.png";

export default function Footer({ sidebarWidth = 80 }) {
  const socials = [
    { name: "Facebook", icon: <Facebook className="w-4 h-4" />, href: "https://www.facebook.com/sharif.me2018" },
    { name: "Instagram", icon: <Instagram className="w-4 h-4" />, href: "https://www.instagram.com/shariful_islam10/" },
    { name: "Linkedin", icon: <Linkedin className="w-4 h-4" />, href: "https://www.linkedin.com/in/sharif-cse/" },
    { name: "GitHub", icon: <Github className="w-4 h-4" />, href: "https://github.com/sharif2023" },
    { name: "YouTube", icon: <Youtube className="w-4 h-4" />, href: "https://www.youtube.com/@sharif-me2018" },
  ];

  const links = ["Privacy", "Terms", "Support"];

  return (
    <footer
      className="relative mt-24"
      style={{ paddingLeft: sidebarWidth }}
    >
      {/* Top divider glow */}
      <div className="w-full h-px mb-12"
        style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.3), rgba(6,182,212,0.2), transparent)" }} />

      <div className="max-w-7xl mx-auto px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl p-10 overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at bottom left, rgba(124,58,237,0.06), transparent 60%)" }} />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center p-2"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))",
                  border: "1px solid rgba(124,58,237,0.25)"
                }}>
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div>
                <span className="text-sm font-display font-black tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #f1f5f9, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>
                  StudyNest
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
                  style={{ color: "#334155" }}>
                  UIU · Group Study Platform
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socials.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  whileHover={{ y: -3, scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#475569"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(124,58,237,0.1)";
                    e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
                    e.currentTarget.style.color = "#a78bfa";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(124,58,237,0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "#475569";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  title={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-6">
              {links.map((item) => (
                <a key={item}
                  href={item === "Privacy" ? "#" : item === "Terms" ? "#" : item === "Support" ? "https://engineer-sharif.infinityfreeapp.com/#contact" : "#"}
                  className="text-xs font-semibold uppercase tracking-widest transition-colors duration-200"
                  style={{ color: "#475569" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                  onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Bottom copyright */}
          <div className="relative z-10 mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[11px] font-medium" style={{ color: "#334155" }}>
              © {new Date().getFullYear()} UIU StudyNest — All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#475569" }}>
                Built for Students
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
