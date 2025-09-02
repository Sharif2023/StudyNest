import React, { useState } from "react";
import { Link } from "react-router-dom";
import SummarizingParaphrasing from "./SummarizingParaphrasing";

const Button = ({ variant = "soft", className = "", ...props }) => {
    const base = "px-3 py-1.5 rounded-lg text-xs font-medium transition focus:outline-none";
    const variants = {
        soft:
            "bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-800 focus:ring-2 focus:ring-cyan-400/40",
        danger:
            "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 border-0 focus:ring-2 focus:ring-rose-400/50",
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
};

const NavItem = ({ to, icon, label, expanded, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl
               hover:bg-slate-800/50 group transition
               focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
    >
        <span className="text-xl text-slate-300 group-hover:text-white transition">{icon}</span>
        {expanded && <span className="text-sm text-slate-100">{label}</span>}
    </Link>
);

export default function LeftNav({
    navOpen,
    setNavOpen,
    anonymous,
    setAnonymous,
    sidebarWidth = 72,
}) {
    const [moreVisible, setMoreVisible] = useState(false);
    const [spOpen, setSpOpen] = useState(false);
    const toggleMoreVisibility = () => setMoreVisible((v) => !v);

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
                        to="/"
                        className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600
                     grid place-content-center shadow-sm"
                        title="Study Nest"
                    >
                        <img src="src/assets/logo.png" alt="study-nest-logo" className="h-5 w-5" />
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
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </span>
                    </button>
                </div>

                {/* Profile / points (only in expanded) */}
                {navOpen && (
                    <div className="px-3 py-2 border-b border-slate-800">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                            <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-content-center">😊</div>
                            <div className="text-sm">
                                <div className="font-medium leading-tight text-white">Study Nest</div>
                                <div className="text-xs text-slate-400">UIU Study Network</div>
                            </div>
                        </div>
                        <div className="mt-2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl
                          bg-slate-900 border border-slate-800 text-sm text-slate-200">
                            Points <span className="font-semibold">1,245</span>
                        </div>
                    </div>
                )}

                {/* Nav list */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 pb-20 custom-scroll">
                    <nav className="space-y-1">
                        <NavItem
                            to="/"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                </svg>
                            }
                            label="Dashboard"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/rooms"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            }
                            label="Study Rooms"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/resources"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4m6 6V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8" />
                                </svg>
                            }
                            label="Resources"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/forum"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="8" width="34" height="28" rx="4" ry="4" />
                                    <path d="M19 18a5 5 0 015-5 5 5 0 015 5c0 3-2 4-3 5s-1 2-1 3" />
                                    <circle cx="24" cy="30" r="1.5" />
                                    <rect x="28" y="28" width="34" height="28" rx="4" ry="4" />
                                    <line x1="45" y1="32" x2="45" y2="32" />
                                    <line x1="45" y1="38" x2="45" y2="48" />
                                </svg>
                            }
                            label="Q&A Forum"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/notes"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                                </svg>
                            }
                            label="Notes Repo"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/library"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-12v8m-16-8v8" />
                                </svg>
                            }
                            label="Shared Library"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="/to-do-list"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="16" rx="2" />
                                    <line x1="5" y1="8" x2="19" y2="8" />
                                    <circle cx="5" cy="8" r="1" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <circle cx="5" cy="12" r="1" />
                                    <line x1="5" y1="16" x2="19" y2="16" />
                                    <circle cx="5" cy="16" r="1" />
                                </svg>
                            }
                            label="To-Do List"
                            expanded={navOpen}
                        />
                        <NavItem
                            to="#"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1l-2 3h4l-2-3z" />
                                    <line x1="7" y1="12" x2="17" y2="12" />
                                    <path d="M14 15l2 2-4 4-2-2 4-4z" />
                                    <path d="M17 19l4-4-4-4" />
                                    <path d="M7 19l-4-4 4-4" />
                                </svg>
                            }
                            label="Paraphasing & Summarizing"
                            expanded={navOpen}
                            onClick={(e) => {
                                e.preventDefault();
                                setSpOpen(true);
                            }}
                        />
                        <NavItem
                            to="#"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                            }
                            label="More Tools"
                            expanded={navOpen}
                            onClick={toggleMoreVisibility}
                        />

                        {moreVisible && (
                            <div className="space-y-1 mt-2">
                                <NavItem to="/ai-check" icon="🔍" label="Ai File Check" expanded={navOpen} />
                                <NavItem to="/ai-usage" icon="📊" label="Ai Usage Check" expanded={navOpen} />
                            </div>
                        )}
                    </nav>
                </div>

                {/* Pinned footer */}
                <div className="px-3 py-3 border-t border-slate-800 space-y-2">
                    {navOpen && (
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{anonymous ? (
                                    <img
                                        src="https://cdn-icons-png.flaticon.com/512/3076/3076251.png"
                                        alt="Anonymous"
                                        className="h-8 w-8 object-contain"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <span className="text-xl">🙂</span>
                                )}</span>
                                <div className="text-sm leading-tight">
                                    <div className="font-medium text-white">Anonymous mode</div>
                                    <div className="text-xs text-slate-400">Hide your name in rooms & Q&A.</div>
                                </div>
                                <button
                                    onClick={() => setAnonymous((a) => !a)}
                                    className={`ml-auto h-6 w-11 rounded-full relative transition ${anonymous ? "bg-emerald-600" : "bg-slate-700"
                                        }`}
                                    aria-label="Toggle anonymous mode"
                                >
                                    <span
                                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${anonymous ? "right-0.5" : "left-0.5"
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    )}
                    <Button
                        variant="danger"
                        className={`w-full flex items-center justify-center ${navOpen ? "gap-2 px-3" : "px-2"
                            } py-2`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                            />
                        </svg>
                        {navOpen && <span className="text-sm">Sign out</span>}
                    </Button>
                </div>
            </aside>
            <SummarizingParaphrasing open={spOpen} onClose={() => setSpOpen(false)} />
        </>
    );
}
