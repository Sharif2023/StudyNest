// Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

export default function Header({ sidebarWidth = 72 }) {
  // ---- Profile dropdown state (mirrors AdminHeader behavior) ----
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studynest.auth")) || null;
    } catch {
      return null;
    }
  });

  const [profileImage, setProfileImage] = useState(
    "https://static.vecteezy.com/system/resources/previews/032/176/191/non_2x/business-avatar-profile-black-icon-man-of-user-symbol-in-trendy-flat-style-isolated-on-male-profile-people-diverse-face-for-social-network-or-web-vector.jpg"
  );

  // If your app builds relative image paths, adjust BASE_URL as needed
  const BASE_URL = ""; // e.g. "http://localhost:3000/" or your CDN origin

  useEffect(() => {
    if (auth?.profileImage) {
      const full = auth.profileImage.startsWith("http")
        ? auth.profileImage
        : `${BASE_URL}${auth.profileImage}`;
      setProfileImage(full);
    }
  }, [auth]);

  // Close on outside click or ESC
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
    // Clear whichever keys your app uses
    localStorage.removeItem("studynest.auth");
    localStorage.removeItem("user");
    localStorage.removeItem("admin");
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

          {/* Profile dropdown (like AdminHeader) */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 grid place-content-center text-white shadow-md ring-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-controls="profile-menu"
              aria-label="User menu"
            >
              {/* If you want the avatar image instead of icon, replace svg with <img .../> */}
              {/* <img src={profileImage} alt="Profile" className="h-9 w-9 rounded-xl object-cover" /> */}
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
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
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
                      src={profileImage}
                      alt="Profile"
                      className="h-9 w-9 rounded-full border border-cyan-500/40 object-cover"
                    />
                    <div>
                      <div className="text-white text-sm font-medium">
                        {auth?.email || "guest@example.com"}
                      </div>
                      <div className="text-slate-400 text-xs">
                        ID: {auth?.student_id || auth?.id || "—"}
                      </div>
                    </div>
                  </div>
                </li>
                <li className="border-t border-slate-700/60 my-1" />

                {/* Items */}
                <li>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/80"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-7 8a7 7 0 0 1 14 0 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" />
                    </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 8a1 1 0 0 1 1 1v3.382l2.447 1.63a1 1 0 1 1-1.11 1.664l-2.889-1.926A1 1 0 0 1 11 13V9a1 1 0 0 1 1-1ZM3 12a9 9 0 1 1 3.78 7.32 1 1 0 1 1 1.14-1.64A7 7 0 1 0 5 12H3Z" />
                    </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.14 12.936a7.968 7.968 0 0 0 .06-.936 7.968 7.968 0 0 0-.06-.936l2.11-1.65a1 1 0 0 0 .24-1.31l-2-3.464a1 1 0 0 0-1.21-.44l-2.49 1a7.994 7.994 0 0 0-1.62-.936l-.38-2.65A1 1 0 0 0 12 0h-4a1 1 0 0 0-.99.85l-.38 2.65a7.994 7.994 0 0 0-1.62.936l-2.49-1a1 1 0 0 0-1.21.44l-2 3.465a1 1 0 0 0 .24 1.31l2.11 1.65c-.04.31-.06.62-.06.936s.02.626.06.936L.54 14.586a1 1 0 0 0-.24 1.31l2 3.464a1 1 0 0 0 1.21.44l2.49-1c.5.38 1.05.7 1.62.936l.38 2.65A1 1 0 0 0 8 24h4a1 1 0 0 0 .99-.85l.38-2.65c.57-.236 1.12-.556 1.62-.936l2.49 1a1 1 0 0 0 1.21-.44l2-3.465a1 1 0 0 0-.24-1.31l-2.11-1.65ZM10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
                    </svg>
                    Settings & Privacy
                  </Link>
                </li>

                <li className="px-3 pt-1 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 text-white text-sm py-2 hover:from-rose-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                    role="menuitem"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M16 2a2 2 0 0 1 2 2v5a1 1 0 1 1-2 0V4H6v16h10v-5a1 1 0 1 1 2 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10Zm.293 7.293a1 1 0 0 1 1.414 1.414L16.414 12l1.293 1.293a1 1 0 1 1-1.414 1.414L14.586 13H10a1 1 0 1 1 0-2h4.586l1.707-1.707Z" />
                    </svg>
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
