import React from "react";

export default function LandingFooter() {
  const socials = [
    { name: "Facebook", href: "https://www.facebook.com/sharif.me2018" },
    { name: "Instagram", href: "https://www.instagram.com/shariful_islam10/" },
    { name: "Linkedin", href: "https://www.linkedin.com/in/sharif-cse/" },
    { name: "GitHub", href: "https://github.com/sharif2023" },
    { name: "YouTube", href: "https://www.youtube.com/@sharif-me2018" },
  ];

  return (
    <footer className="bg-white pt-12 pb-8 border-t border-zinc-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#home" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center p-2 shadow-lg shadow-black/10">
                <img src="src/assets/logo.png" alt="StudyNest" className="w-full h-full object-contain invert" />
              </div>
              <span className="text-xl font-black tracking-tight text-zinc-900">StudyNest</span>
            </a>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs leading-relaxed">
              The ultimate academic vault for UIU scholars. 
              Synchronize your journey, master your courses.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Network</h4>
            <ul className="space-y-4">
              {['Home', 'Why', 'Inside', 'Team', 'Gallery'].map(item => (
                <li key={item}>
                  <a href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Column */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Connect</h4>
            <ul className="space-y-4">
              {socials.map(s => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                    {s.name}
                  </a>
                </li>
              ))}
              <li>
                <a href="https://engineer-sharif.infinityfreeapp.com/#contact" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-colors">
                  Support Protocol
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-zinc-50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
            © {new Date().getFullYear()} UIU StudyNest — All protocols reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
