// Components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

const Button = ({ variant = "soft", size = "sm", className = "", ...props }) => {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants = {
    soft: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
  };
  return (
    <button
      className={`${sizes[size]} rounded-lg font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export default function Header({ sidebarWidth = 72 }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

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

  // Keep in sync with localStorage updates from Login/EditProfile
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "studynest.profile") {
        try { setProfile(JSON.parse(e.newValue) || null); } catch { setProfile(null); }
      }
      if (e.key === "studynest.auth") {
        try { setAuth(JSON.parse(e.newValue) || null); } catch { setAuth(null); }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Fetch fresh profile from backend (requires active session)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile.php`, { credentials: "include" });
        const text = await res.text(); // robust parse (handles HTML errors too)
        let j;
        try { j = JSON.parse(text); } catch {
          console.warn("Non-JSON response from profile.php:", text);
          return;
        }

        // Accept both shapes: { ok:true, profile:{...} } OR raw profile object
        const incoming = j?.ok ? j.profile : j;

        if (incoming && (incoming.id || incoming.student_id || incoming.email)) {
          setProfile(incoming);
          try { localStorage.setItem("studynest.profile", JSON.stringify(incoming)); } catch { }
        } else {
          console.warn("Profile fetch returned unexpected payload:", j);
        }
      } catch (e) {
        console.warn("Profile fetch failed:", e);
      }
    })();
  }, []);

  const avatar =
    profile?.avatar_url || auth?.avatar_url ||
    "https://static.vecteezy.com/system/resources/previews/032/176/191/non_2x/business-avatar-profile-black-icon-man-of-user-symbol-in-trendy-flat-style-isolated-on-male-profile-people-diverse-face-for-social-network-or-web-vector.jpg";

  const email = profile?.email || auth?.email || "";
  const studentId = profile?.student_id || auth?.student_id || auth?.id || "—";
  // Close dropdown on outside click or ESC
  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("studynest.auth");
    localStorage.removeItem("studynest.profile");
    fetch(`${API_BASE}/logout.php`, { credentials: "include" }).catch(() => { });
    navigate("/login");
  };

  return (
    <div
      className="sticky top-0 z-40 backdrop-blur bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-sm"
      style={{ paddingLeft: sidebarWidth }}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <Link
            to="#"
            className="font-bold text-white hidden sm:block hover:text-cyan-300 transition"
          >
            Study Nest
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-xl w-full">
          <input
            className="w-full bg-slate-800/70 border border-slate-600 rounded-xl pl-3 pr-24 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            placeholder="Search topics, tags, notes…"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <Button size="sm">Tags</Button>
            <Button size="sm">AI</Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Messages */}
          <button
            className="text-slate-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-lg p-1.5 transition"
            aria-label="Messages"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </button>

          {/* Notifications */}
          <button
            className="text-slate-300 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-lg p-1.5 transition"
            aria-label="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-xl overflow-hidden ring-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-controls="profile-menu"
              aria-label="User menu"
            >
              <img
                src={avatar}
                alt="Profile"
                className="h-9 w-9 object-cover"
              />
            </button>

            {profileOpen && (
              <ul
                id="profile-menu"
                className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 border border-slate-700 shadow-xl backdrop-blur-md z-50 py-1"
                role="menu"
              >
                {/* Header: user info */}
                <li className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatar}
                      alt="Profile"
                      className="h-9 w-9 rounded-full border border-cyan-500/40 object-cover"
                    />
                    <div className="break-words pr-2">
                      <div className="text-white text-xs font-smaller whitespace-normal">
                        {email || "guest@example.com"}
                      </div>
                      <div className="text-slate-400 text-xs whitespace-normal">
                        ID: {studentId}
                      </div>
                    </div>
                  </div>
                </li>
                <li className="border-t border-slate-700/60 my-1" />

                {/* Links */}
                <li>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/history"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    Settings & Privacy
                  </Link>
                </li>

                <li className="px-3 pt-1 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm py-2 hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                    role="menuitem"
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
