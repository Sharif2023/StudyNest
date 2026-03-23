import React, { useState } from "react";

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const nav = [
    { label: "Home", href: "#home" },
    { label: "Why", href: "#why" },
    { label: "Inside", href: "#inside" },
    { label: "Process", href: "#process" },
    { label: "Team", href: "#team" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-white font-bold">
              <img src="/logo.png" alt="StudyNest" className="h-full w-full" />
            </span>
            <span className="font-semibold tracking-tight">StudyNest</span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-700">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href="/signup" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50">Signup</a>
            <a href="/login" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Login</a>
          </div>

          <button onClick={() => setOpen((s) => !s)} className="md:hidden inline-flex items-center justify-center rounded-xl p-2 text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400" aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="grid gap-4 text-sm">
              <a href="#home" onClick={() => setOpen(false)} className="py-1">Home</a>
              <a href="#why" onClick={() => setOpen(false)} className="py-1">Why</a>
              <a href="#inside" onClick={() => setOpen(false)} className="py-1">Inside</a>
              <a href="#process" onClick={() => setOpen(false)} className="py-1">Process</a>
              <a href="#team" onClick={() => setOpen(false)} className="py-1">Team</a>
              <a href="#contact" onClick={() => setOpen(false)} className="py-1">Contact</a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
