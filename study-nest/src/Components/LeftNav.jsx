// Components/LeftNav.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoUrl from "../assets/logo.png";
import SummarizingParaphrasing from "./SummarizingParaphrasing";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

/** Safely get backend origin from API_BASE (no crashes during import). */
function getBackendOrigin() {
  try {
    const m = String(API_BASE).match(/^https?:\/\/[^/]+/i);
    if (m && m[0]) return m[0]; // e.g., http://localhost
  } catch { }
  return (typeof window !== "undefined" && window.location.origin) || "http://localhost";
}

/** Build an absolute URL that points to the backend host. */
function toBackendUrl(url) {
  if (!url) return null;
  const ORIGIN = getBackendOrigin();
  if (/^https?:\/\//i.test(url)) return url;             // already absolute
  if (url.startsWith("/")) return ORIGIN + url;     // root-relative
  return ORIGIN + "/" + url.replace(/^\/+/, "");          // plain relative
}

const Button = ({ variant = "soft", className = "", ...props }) => {
  const base = "px-3 py-1.5 rounded-lg text-xs font-medium transition focus:outline-none";
  const variants = {
    soft: "bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-800 focus:ring-2 focus:ring-cyan-400/40",
    danger: "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 border-0 focus:ring-2 focus:ring-rose-400/50",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
};

const NavItem = ({ to, icon, label, expanded, onClick }) => {
  const collapsed = !expanded;
  return (
    <div className={`relative ${collapsed ? "group" : ""}`}>
      <Link
        to={to}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl
                   hover:bg-slate-800/50 transition
                   focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
      >
        <span className="text-xl text-slate-300 group-hover:text-white transition">{icon}</span>
        {expanded && <span className="text-sm text-slate-100">{label}</span>}
      </Link>
      {collapsed && (
        <div
          className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex z-[60] animate-fade-in"
          role="tooltip"
        >
          <div className="relative bg-slate-900/95 border border-slate-700 px-3 py-1.5 text-sm font-medium text-white rounded-lg shadow-lg">
            {label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rotate-45 bg-slate-900 border-l border-t border-slate-700" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function LeftNav({
  navOpen,
  setNavOpen,
  anonymous,
  setAnonymous,
  sidebarWidth = 72,
}) {
  const [moreVisible, setMoreVisible] = useState(false);
  const [spOpen, setSpOpen] = useState(false);

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.profile")) || null; } catch { return null; }
  });
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.auth")) || null; } catch { return null; }
  });

  // Stay in sync with storage + same-tab updates from Profile save
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "studynest.profile") {
        try { setProfile(JSON.parse(e.newValue) || null); } catch { setProfile(null); }
      }
      if (e.key === "studynest.auth") {
        try { setAuth(JSON.parse(e.newValue) || null); } catch { setAuth(null); }
      }
    };
    const onLocalProfile = () => {
      try { setProfile(JSON.parse(localStorage.getItem("studynest.profile")) || null); } catch { }
      try { setAuth(JSON.parse(localStorage.getItem("studynest.auth")) || null); } catch { }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("studynest:profile-updated", onLocalProfile);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("studynest:profile-updated", onLocalProfile);
    };
  }, []);

  const toggleMoreVisibility = () => setMoreVisible((v) => !v);

  const displayName = profile?.name || auth?.name || "Student";
  const studentId = profile?.student_id || auth?.student_id || auth?.id || "—";

  // Normalize picture URL to backend origin, add cache-buster via updated_at
  const rawPic = profile?.profile_picture_url || auth?.profile_picture_url || null;
  const profilePicUrl = rawPic ? `${toBackendUrl(rawPic)}?v=${encodeURIComponent(profile?.updated_at || Date.now())}` : null;

  return (
    <>
      <aside
        className="fixed top-0 left-0 h-screen border-r border-slate-800
                   bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950
                   backdrop-blur z-50 transition-[width] duration-300 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        {/* Brand + Toggle */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-800">
          <Link
            to="/home"
            className="h-8 w-8 rounded-xl bg-gradient-to-br from-[##001D35] to-[##001D35] grid place-content-center shadow-sm"
            title="Study Nest"
          >
            <img src={logoUrl} alt="Study Nest" className="h-8 w-8 object-contain" />
          </Link>
          {navOpen && <span className="font-semibold hidden xl:block text-white">Study Nest</span>}
          <button
            onClick={() => setNavOpen((v) => !v)}
            className="ml-auto h-8 w-8 grid place-content-center rounded-lg
                       bg-slate-900/70 border border-slate-700 text-slate-200
                       hover:bg-slate-900
                       focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            aria-label={navOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={navOpen ? "Collapse" : "Expand"}
          >
            <span className="opacity-90">
              {navOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
              )}
            </span>
          </button>
        </div>

        {/* Profile / points (only in expanded) */}
        {navOpen && (
          <div className="px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 grid place-content-center">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt={displayName} className="h-9 w-9 object-cover" />
                ) : (
                  <span className="text-white text-sm">
                    {String(displayName || "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium leading-tight text-white">{displayName}</div>
                <div className="font-medium leading-tight text-white">ID: {studentId}</div>
              </div>
            </div>

            {/* Points row unchanged */}
            <div className="mt-2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200">
              Points <span className="font-semibold">1,245</span>
            </div>
          </div>
        )}

        {/* Nav list */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-visible px-2 py-2 pb-20 custom-scroll">
          <nav className="space-y-1">
            <NavItem to="/search" label="Search" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>}
            />
            <NavItem to="/home" label="Dashboard" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
            />
            <NavItem to="/rooms" label="Study Rooms" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
            />
            <NavItem to="/resources" label="Resources" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4m6 6V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8" /></svg>}
            />
            <NavItem to="/forum" label="Q&A Forum" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="34" height="28" rx="4" ry="4" /><path d="M19 18a5 5 0 015-5 5 5 0 015 5c0 3-2 4-3 5s-1 2-1 3" /><circle cx="24" cy="30" r="1.5" /><rect x="28" y="28" width="34" height="28" rx="4" ry="4" /><line x1="45" y1="32" x2="45" y2="32" /><line x1="45" y1="38" x2="45" y2="48" /></svg>}
            />
            <NavItem to="/notes" label="Notes Repo" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125" /></svg>}
            />
            <NavItem to="/library" label="Shared Library" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-12v8m-16-8v8" /></svg>}
            />
            <NavItem to="/to-do-list" label="To-Do List" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="5" y1="8" x2="19" y2="8" /><circle cx="5" cy="8" r="1" /><line x1="5" y1="12" x2="19" y2="12" /><circle cx="5" cy="12" r="1" /><line x1="5" y1="16" x2="19" y2="16" /><circle cx="5" cy="16" r="1" /></svg>}
            />
            <NavItem to="/group-chats" label="Group Chats" expanded={navOpen}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M13 8H7" /><path d="M17 12H7" /></svg>}
            />
            <NavItem
              to="#"
              label="Paraphasing & Summarizing"
              expanded={navOpen}
              onClick={(e) => { e.preventDefault(); setSpOpen(true); }}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1l-2 3h4l-2-3z" /><line x1="7" y1="12" x2="17" y2="12" /><path d="M14 15l2 2-4 4-2-2 4-4z" /><path d="M17 19l4-4-4-4" /><path d="M7 19l-4-4 4-4" /></svg>}
            />
            <NavItem
              to="#"
              label="More Tools"
              expanded={navOpen}
              onClick={toggleMoreVisibility}
              icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>}
            />
            {moreVisible && (
              <div className="space-y-1 mt-2">
                <NavItem
                  to="/ai-check"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-6 h-6 flex-shrink-0 text-current"
                    >
                      <path
                        fill="currentColor"
                        d="m23.5 17l-5 5l-3.5-3.5l1.5-1.5l2 2l3.5-3.5zM6 2a2 2 0 0 0-2 2v16c0 1.11.89 2 2 2h7.81c-.36-.62-.61-1.3-.73-2H6V4h7v5h5v4.08c.33-.05.67-.08 1-.08c.34 0 .67.03 1 .08V8l-6-6M8 12v2h8v-2m-8 4v2h5v-2Z"
                      />
                    </svg>
                  }
                  label="AI File Check"
                  expanded={navOpen}
                />

                <NavItem
                  to="/ai-usage"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-6 h-6 flex-shrink-0 text-current"
                    >
                      <path
                        fill="currentColor"
                        d="M23 15v3c0 .5-.36.88-.83.97L20.2 17h.8v-1h-1.8l-.2-.2V14c0-2.76-2.24-5-5-5h-1.8l-2-2h.8V5.73c-.6-.34-1-.99-1-1.73c0-1.1.9-2 2-2s2 .9 2 2c0 .74-.4 1.39-1 1.73V7h1c3.87 0 7 3.13 7 7h1c.55 0 1 .45 1 1M8.5 13.5c-1.1 0-2 .9-2 2s.9 2 2 2s2-.89 2-2s-.89-2-2-2m13.61 7.96l-1.27 1.27l-.95-.95c-.27.14-.57.22-.89.22H5a2 2 0 0 1-2-2v-1H2c-.55 0-1-.45-1-1v-3c0-.55.45-1 1-1h1c0-2.47 1.29-4.64 3.22-5.89L1.11 3l1.28-1.27zm-4-1.46l-2.51-2.5h-.1a2 2 0 0 1-2-2v-.1L7.7 9.59C6.1 10.42 5 12.08 5 14v2H3v1h2v3z"
                      />
                    </svg>
                  }
                  label="AI Usage Check"
                  expanded={navOpen}
                />

                <NavItem
                  to="/humanize"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 32 32"
                      className="w-6 h-6 flex-shrink-0 text-current"
                    >
                      <path
                        fill="currentColor"
                        d="M28.19 13.71h1.52v10.67h-1.52Z"
                      />
                      <path
                        fill="currentColor"
                        d="M26.67 27.43H11.43v-1.52H9.9v1.52H8.38V32h21.33v-4.57h-1.52v-3.05h-1.52Zm0 3.05h-3.05v-1.53h3.05Zm0-18.29h1.52v1.52h-1.52Zm-3.05 1.52h1.52v4.58h-1.52Zm0-3.04h3.05v1.52h-3.05Zm-3.05-6.1h1.52V6.1h-1.52Zm1.52 0h1.53V0h-4.57v1.52h3.04zm-3.04 9.14h1.52v4.58h-1.52Zm0-7.61h1.52v1.52h-1.52Zm0-3.05h1.52v1.52h-1.52Zm-1.53-1.53h1.53v1.53h-1.53ZM16 3.05h1.52v1.52H16Zm-1.52 10.66H16v4.58h-1.52Z"
                      />
                      <path
                        fill="currentColor"
                        d="M14.48 10.67h9.14V9.14h-4.57V7.62h-1.53v1.52H16V4.57h-4.57V6.1h3.05zM9.9 15.24H8.38v1.52H9.9v3.05h1.53V6.1H9.9v3.04H8.38v1.53H9.9zm-1.52 9.14H9.9v1.53H8.38Zm-1.52-3.05h1.52v3.05H6.86Zm0-4.57h1.52v1.53H6.86Zm0-6.09h1.52v1.52H6.86Zm-1.53 7.62h1.53v3.04H5.33Zm0-6.1h1.53v1.52H5.33Zm-1.52 4.57h1.52v1.53H3.81Zm0-3.05h1.52v1.53H3.81Zm-1.52 1.53h1.52v1.52H2.29Z"
                      />
                    </svg>
                  }
                  label="Humanize Writing"
                  expanded={navOpen}
                />
              </div>
            )}
          </nav>
        </div>

        {/* Pinned footer */}
        <div className="px-3 py-3 border-t border-slate-800 space-y-2">
          {navOpen && (
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {anonymous ? (
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/3076/3076251.png"
                      alt="Anonymous"
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="text-xl">🙂</span>
                  )}
                </span>
                <div className="text-sm leading-tight">
                  <div className="font-medium text-white">Anonymous mode</div>
                  <div className="text-xs text-slate-400">Hide your name in rooms & Q&A.</div>
                </div>
                <button
                  onClick={() => setAnonymous((a) => !a)}
                  className={`ml-auto h-6 w-11 rounded-full relative transition ${anonymous ? "bg-emerald-600" : "bg-slate-700"}`}
                  aria-label="Toggle anonymous mode"
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${anonymous ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          )}
          <Link to={"/login"}>
            <Button variant="danger" className={`w-full flex items-center justify-center ${navOpen ? "gap-2 px-3" : "px-2"} py-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              {navOpen && <span className="text-sm">Sign out</span>}
            </Button>
          </Link>
        </div>
      </aside>

      <SummarizingParaphrasing open={spOpen} onClose={() => setSpOpen(false)} />
    </>
  );
}
