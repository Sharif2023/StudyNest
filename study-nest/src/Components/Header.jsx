import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // ⬅️ added useLocation

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

function getBackendOrigin() {
  try {
    const m = String(API_BASE).match(/^https?:\/\/[^/]+/i);
    if (m && m[0]) return m[0];
  } catch { }
  return (typeof window !== "undefined" && window.location.origin) || "http://localhost";
}
function toBackendUrl(url) {
  if (!url) return null;
  const ORIGIN = getBackendOrigin();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return ORIGIN + url;
  return ORIGIN + "/" + url.replace(/^\/+/, "");
}

export default function Header({ sidebarWidth = 72 }) {
  const location = useLocation(); // ⬅️ detect current route
  const navigate = useNavigate();

  // ==================== existing header logic (profile, notif, SSE, etc.) ====================
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studynest.profile")) || null;
    } catch {
      return null;
    }
  });
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studynest.auth")) || null;
    } catch {
      return null;
    }
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ... (keep all your existing useEffects here: profile fetch, SSE, markAllRead, etc.)

  const rawPic = profile?.profile_picture_url || auth?.profile_picture_url || null;
  const profile_pic = rawPic
    ? `${toBackendUrl(rawPic)}?v=${encodeURIComponent(profile?.updated_at || Date.now())}`
    : null;
  const email = profile?.email || auth?.email || "";
  const studentId = profile?.student_id || auth?.student_id || auth?.id || "—";

  // ==================== NEW: Dynamic Left Section ====================
  const renderLeftSection = () => {
    const path = location.pathname;

    // Home / default
    if (path === "/" || path.startsWith("/home")) {
      return (
        <Link
          to="/home"
          className="font-bold text-white text-2xl hover:text-cyan-300 transition"
        >
          StudyNest
        </Link>
      );
    }

    // Notes
    if (path.startsWith("/notes")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Lecture Notes</h1>
          <p className="text-sm text-slate-300">
            Browse, upload, and manage your notes.
          </p>
        </div>
      );
    }

    // Forum
    if (path.startsWith("/forum")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Q&A Forum</h1>
          <p className="text-sm text-slate-300">
            Ask questions, review peers, and vote on the best answers.
          </p>
        </div>
      );
    }

    // Study Rooms
    if (path.startsWith("/rooms")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Study Rooms</h1>
          <p className="text-sm text-slate-300">
            Meet on video, chat, and collaborate live.
          </p>
        </div>
      );
    }

    // Search
    if (path.startsWith("/search")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Search & Tags</h1>
          <p className="text-sm text-slate-300">
            Explore notes, forums, and resources across StudyNest by topic.
          </p>
        </div>
      );
    }

    // Resources
    if (path.startsWith("/resources")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Resource Library</h1>
          <p className="text-sm text-slate-300">
            Books, slides, past papers, and study guides from your peers.
          </p>
        </div>
      );
    }

    // To-do list
    if (path.startsWith("/to-do-list")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">To-Do List</h1>
          <p className="text-sm text-slate-300">
            Organize your academic tasks and reminders.
          </p>
        </div>
      );
    }

    // AI Check
    if (path.startsWith("/ai-check")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">AI File Check</h1>
          <p className="text-sm text-slate-300">
            Upload a file to get summary, key points, study tips, and more.
          </p>
        </div>
      );
    }

    // AI Usage Checker
    if (path.startsWith("/ai-usage")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">AI Usage Checker</h1>
          <p className="text-sm text-slate-300">
            Review your writing for AI involvement.
          </p>
        </div>
      );
    }

    // Humanize Writing
    if (path.startsWith("/humanize")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Humanize Writing</h1>
          <p className="text-sm text-slate-300">
            Refine AI-generated content to sound natural.
          </p>
        </div>
      );
    }

    // Messages
    if (path.startsWith("/messages")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <p className="text-sm text-slate-300">
            Chat with classmates and peers.
          </p>
        </div>
      );
    }

    // Groups
    if (path.startsWith("/groups") || path.startsWith("/group")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Study Groups</h1>
          <p className="text-sm text-slate-300">
            Collaborate with others in group chats.
          </p>
        </div>
      );
    }

    // Profile
    if (path.startsWith("/profile")) {
      return (
        <div>
          <h1 className="text-xl font-bold text-white">Your Profile</h1>
          <p className="text-sm text-slate-300">
            Manage your personal info and settings.
          </p>
        </div>
      );
    }

    // Default fallback
    return (
      <Link
        to="/home"
        className="font-bold text-white text-2xl hover:text-cyan-300 transition"
      >
        StudyNest
      </Link>
    );
  };


  // ==================== Render ====================
  return (
    <div
      className="sticky top-0 z-40 backdrop-blur bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-sm"
      style={{ paddingLeft: sidebarWidth }}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        {/* Left Part: Dynamic */}
        {renderLeftSection()}

        {/* Search */}
        {/* <div className="relative max-w-xl w-full">
          <input
            className="w-full bg-slate-800/70 border border-slate-600 rounded-xl pl-3 pr-24 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            placeholder="Search topics, tags, notes…"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <Button size="sm">Tags</Button>
            <Button size="sm">AI</Button>
          </div>
        </div> */}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Groups */}
          <button
            className="text-slate-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-lg p-1.5 transition"
            onClick={() => navigate("/groups")}
            aria-label="Groups"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2h9zm3-6a4 4 0 100-8 4 4 0 000 8zM6 8a4 4 0 118 0 4 4 0 01-8 0z" />
            </svg>
          </button>

          {/* Messages */}
          <button
            className="text-slate-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-lg p-1.5 transition"
            onClick={() => navigate("/messages")}
            aria-label="Messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              className="relative text-slate-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-lg p-1.5 transition"
              onClick={() => {
                const next = !notifOpen;
                setNotifOpen(next);
                if (next) markAllRead();
              }}
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl bg-slate-800/95 border border-slate-700 shadow-xl backdrop-blur-md z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60">
                  <div className="text-slate-200 text-sm font-medium">Notifications</div>
                  <button onClick={markAllRead} className="text-xs text-cyan-300 hover:text-cyan-200">
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-80 overflow-auto divide-y divide-slate-700/60">
                  {notifications.length === 0 && (
                    <li className="px-3 py-4 text-slate-400 text-sm">No notifications yet</li>
                  )}
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-700/70 transition ${n.read_at ? "text-slate-300" : "text-white"
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full ${n.read_at ? "bg-slate-600" : "bg-cyan-400"
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{n.title}</div>
                          {n.body && <div className="text-slate-400 truncate">{n.body}</div>}
                          <div className="text-[10px] text-slate-500">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-xl overflow-hidden ring-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              {profile_pic ? (
                <img src={profile_pic} alt="Profile" className="h-9 w-9 object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-9 w-9 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>

            {profileOpen && (
              <ul className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 border border-slate-700 shadow-xl backdrop-blur-md z-50 py-1">
                <li className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    {profile_pic ? (
                      <img
                        src={profile_pic}
                        alt="Profile"
                        className="h-10 w-10 rounded-full border border-cyan-500/40 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center border border-cyan-500/40">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="h-6 w-6 text-slate-300"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="break-words pr-2">
                      <div className="text-white text-xs whitespace-normal">
                        {email || "guest@example.com"}
                      </div>
                      <div className="text-slate-400 text-xs whitespace-normal">
                        ID: {studentId}
                      </div>
                    </div>
                  </div>
                </li>
                <li className="border-t border-slate-700/60 my-1" />
                <li>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/groups"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Group Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/history"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Settings & Privacy
                  </Link>
                </li>
                <li className="px-3 pt-1 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm py-2 hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                  >
                    Log out
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}