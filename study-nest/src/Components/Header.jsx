import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

/* ===== Utility helpers ===== */
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

/* ===== Small UI button helper ===== */
const Button = ({ variant = "soft", size = "sm", className = "", ...props }) => {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants = {
    soft:
      "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
  };
  return (
    <button
      className={`${sizes[size]} rounded-lg font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

/* ===== Header Component ===== */
export default function Header({ sidebarWidth = 72 }) {
  const location = useLocation();
  const navigate = useNavigate();

  /* Profile & Auth State */
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

  /* Dropdown States */
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  /* Notifications State */
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ===== Sync profile/auth between tabs ===== */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "studynest.profile") {
        try {
          setProfile(JSON.parse(e.newValue) || null);
        } catch {
          setProfile(null);
        }
      }
      if (e.key === "studynest.auth") {
        try {
          setAuth(JSON.parse(e.newValue) || null);
        } catch {
          setAuth(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ===== Fetch latest profile once ===== */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile.php`, { credentials: "include" });
        const j = await res.json().catch(() => null);
        const incoming = j?.ok ? j.profile : j;
        if (incoming && (incoming.id || incoming.student_id || incoming.email)) {
          setProfile(incoming);
          localStorage.setItem("studynest.profile", JSON.stringify(incoming));
        }
      } catch { }
    })();
  }, []);

  /* ===== Real-Time Notifications (SSE) ===== */
  /* useEffect(() => {
    const sid = profile?.student_id || auth?.student_id;
    if (!sid) return;

    // Initial load
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications.php?action=list&student_id=${sid}&limit=30`, {
          credentials: "include",
        });
        const j = await res.json().catch(() => null);
        if (j?.ok) {
          setNotifications(j.notifications || []);
          setUnreadCount(j.unread || 0);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    })();

    // Setup SSE with reconnect logic
    let es;
    let reconnectTimeout;

    const setupSSE = () => {
      es = new EventSource(`${API_BASE}/notifications.php?action=stream&student_id=${sid}`, {
        withCredentials: true,
      });

      es.onopen = () => {
        console.log('SSE connected');
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "new_notification" && data.notification) {
            setNotifications((prev) => [data.notification, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        } catch (error) {
          console.error('SSE message error:', error);
        }
      };

      es.onerror = (e) => {
        console.log('SSE error, reconnecting...');
        es.close();

        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(setupSSE, 5000);
      };
    };

    setupSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, [profile?.student_id, auth?.student_id]); */

  /* ===== Mark all notifications read ===== */
  /* async function markAllRead() {
    const sid = profile?.student_id || auth?.student_id;
    if (!sid) return;

    console.log('Marking all notifications as read for student:', sid);
    console.log('Current unread count:', unreadCount);

    try {
      const response = await fetch(`${API_BASE}/notifications.php?action=mark_read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ student_id: sid, mark_all: true }),
      });

      const data = await response.json();
      console.log('Mark all read response:', data);

      if (data.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
        setUnreadCount(0);
        console.log('Successfully marked all as read');
      } else {
        console.error('Failed to mark all as read:', data);
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  } */

  /* function handleNotificationClick(n) {
    // Don't mark as read here - it's already handled by markAllRead when dropdown opens
    // Or mark individual notification if needed
    if (!n.read_at) {
      // Mark single notification as read via API
      const sid = profile?.student_id || auth?.student_id;
      if (sid) {
        fetch(`${API_BASE}/notifications.php?action=mark_read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ student_id: sid, notification_id: n.id }),
        }).catch(console.error);
      }
    }

    // Navigate if link exists
    if (n.link) {
      navigate(n.link);
    }
    setNotifOpen(false);
  } */

  /* ===== Close dropdowns on click outside / ESC ===== */
  useEffect(() => {
    function handleDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    function handleEsc(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  /* ===== Logout ===== */
  const handleLogout = () => {
    localStorage.removeItem("studynest.auth");
    localStorage.removeItem("studynest.profile");
    fetch(`${API_BASE}/logout.php`, { credentials: "include" }).catch(() => { });
    navigate("/login");
  };

  const rawPic = profile?.profile_picture_url || auth?.profile_picture_url;
  const profile_pic = rawPic ? `${toBackendUrl(rawPic)}?v=${encodeURIComponent(profile?.updated_at || Date.now())}` : null;
  const email = profile?.email || auth?.email || "";
  const studentId = profile?.student_id || auth?.student_id || auth?.id || "—";

  /* ===== Left Dynamic Section (Route Title) ===== */
  const renderLeftSection = () => {
    const path = location.pathname;
    const map = {
      "/home": ["StudyNest", "Your collaborative study platform."],
      "/notes": ["Lecture Notes", "Browse and upload your notes."],
      "/forum": ["Q&A Forum", "Ask and answer academic questions."],
      "/rooms": ["Study Rooms", "Join or create virtual study spaces."],
      "/search": ["Search & Tags", "Explore notes, forums, and resources."],
      "/resources": ["Resource Library", "Access and share course materials."],
      "/to-do-list": ["To-Do List", "Organize your academic tasks."],
      "/ai-check": ["AI File Check", "Analyze documents using AI tools."],
      "/ai-usage": ["AI Usage Checker", "Detect AI-written content."],
      "/humanize": ["Humanize Writing", "Make AI text sound natural."],
      "/messages": ["Messages", "Chat with classmates."],
      "/groups": ["Study Groups", "Collaborate and share ideas."],
      "/profile": ["Your Profile", "Manage your info and settings."],
    };

    const [title, subtitle] = Object.entries(map).find(([key]) => path.startsWith(key))?.[1] || [
      "StudyNest",
      "Empower your study journey.",
    ];

    return (
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-300">{subtitle}</p>
      </div>
    );
  };

  /* ===== Render ===== */
  return (
    <div
      className="sticky top-0 z-40 backdrop-blur bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-sm"
      style={{ paddingLeft: sidebarWidth }}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        {/* Left Side */}
        {renderLeftSection()}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Groups */}
          <button
            className="text-slate-300 hover:text-cyan-300 rounded-lg p-1.5 transition"
            onClick={() => navigate("/groups")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2h9zm3-6a4 4 0 100-8 4 4 0 000 8zM6 8a4 4 0 118 0 4 4 0 01-8 0z" />
            </svg>
          </button>

          {/* Messages */}
          <button
            className="text-slate-300 hover:text-cyan-300 rounded-lg p-1.5 transition"
            onClick={() => navigate("/messages")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </button>

          {/* Notifications */}
          {/* <div className="relative" ref={notifRef}>
            <button
              className="relative text-slate-300 hover:text-cyan-300 rounded-lg p-1.5 transition"
              onClick={() => {
                const next = !notifOpen;
                setNotifOpen(next);
                // Only mark as read when opening, not when closing
                if (next && unreadCount > 0) {
                  markAllRead();
                }
              }}
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
                      key={`notification-${n.id}-${n.created_at}`} // More unique key
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
                          {n.message && <div className="text-slate-400 truncate">{n.message}</div>}
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
          </div> */}

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              {profile_pic ? (
                <img src={profile_pic} alt="Profile" className="h-9 w-9 object-cover" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-9 w-9 text-slate-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
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
                      <div className="text-white text-xs whitespace-normal">{email || "guest@example.com"}</div>
                      <div className="text-slate-400 text-xs whitespace-normal">ID: {studentId}</div>
                    </div>
                  </div>
                </li>
                <li className="border-t border-slate-700/60 my-1" />
                <li>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/groups"
                    className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Group Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/history"
                    className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    onClick={() => setProfileOpen(false)}
                  >
                    Settings & Privacy
                  </Link>
                </li>
                <li className="px-3 pt-1 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm py-2 hover:from-rose-500 hover:to-red-500"
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
