import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Settings,
  History,
  ChevronDown,
  Search,
  LayoutGrid,
  Sparkles,
  Video,
  Menu,
  X
} from "lucide-react";
import apiClient, { hasToken, toBackendUrl } from "../apiConfig";



const PAGE_MAP = {
  "/home":            ["Dashboard",      "Study Hub"],
  "/notes":           ["Notes",          "Academic Library"],
  "/forum":           ["Q&A Forum",      "Student Discussion"],
  "/rooms":           ["Study Rooms",    "Live Collaboration"],
  "/to-do-list":      ["Planner",        "Task Manager"],
  "/messages":        ["Messages",       "Chat & Feedback"],
  "/groups":          ["Groups",         "Student Communities"],
  "/profile":         ["Profile",        "My Account"],
  "/resources":       ["Resources",      "Resource Hub"],
  "/my-resources":     ["My Resources",   "Uploaded Files"],
  "/search":          ["Search",         "Global Discovery"],
  "/ai-check":        ["AI Detector",    "Academic Integrity"],
  "/humanize":        ["AI Humanizer",   "Writing Tools"],
  "/ai-usage":        ["AI Usage",       "Checker Tool"],
  "/points-leaderboard": ["Leaderboard", "Top Students"],
  "/admin":              ["Admin Panel",    "System Management"],
};

export default function Header({ sidebarWidth = 80, setNavOpen, navOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.profile")) || null; } catch { return null; }
  });
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.auth")) || null; } catch { return null; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        setProfile(JSON.parse(localStorage.getItem("studynest.profile")) || null);
        setAuth(JSON.parse(localStorage.getItem("studynest.auth")) || null);
      } catch {
        setProfile(null);
        setAuth(null);
      }
    };
    const onStorage = (e) => {
      if (e.key === "studynest.profile") setProfile(JSON.parse(e.newValue) || null);
      if (e.key === "studynest.auth") setAuth(JSON.parse(e.newValue) || null);
    };
    const onAuthChanged = () => syncFromStorage();
    window.addEventListener("storage", onStorage);
    window.addEventListener("studynest:auth-changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("studynest:auth-changed", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    (async () => {
      // 401 Guard: Don't call profile.php if we are definitely not logged in
      if (!auth && !hasToken()) return;
      
      try {
        const res = await apiClient.get("profile.php");
        const j = res.data;
        const incoming = j?.ok ? j.profile : j;
        if (incoming?.email) {
          setProfile(incoming);
          localStorage.setItem("studynest.profile", JSON.stringify(incoming));
          let prevAuth = null;
          try {
            prevAuth = JSON.parse(localStorage.getItem("studynest.auth") || "null");
          } catch { }
          const base = prevAuth && typeof prevAuth === "object" ? prevAuth : {};
          const nextAuth = {
            ...base,
            id: incoming.id,
            email: incoming.email,
            name: incoming.name,
            username: incoming.username ?? incoming.name ?? base.username,
            profile_picture_url: incoming.profile_picture_url ?? base.profile_picture_url,
            bio: incoming.bio ?? base.bio,
            student_id: incoming.student_id ?? base.student_id,
          };
          setAuth(nextAuth);
          localStorage.setItem("studynest.auth", JSON.stringify(nextAuth));
          window.dispatchEvent(new Event("studynest:auth-changed"));
        }

        const uid = incoming?.id || auth?.id;
        if (!uid) return;
        const nRes = await apiClient.get("notifications.php", {
           params: { action: "list" }
        });
        const nData = nRes.data;
        if (nData.ok) {
          setNotifications(nData.notifications || []);
          setUnreadCount(nData.unread || 0);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("studynest.jwt");
        }
      }
    })();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Global Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get("search.php", {
          params: { q: searchQuery, type: "global" }
        });
        if (res.data && res.data.results) {
          setSearchResults(res.data.results);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    apiClient.post("logout.php").finally(() => {
      localStorage.removeItem("studynest.auth");
      localStorage.removeItem("studynest.profile");
      localStorage.removeItem("studynest.jwt");
      localStorage.removeItem("studynest.refresh");
      localStorage.removeItem("studynest.user");
      setAuth(null);
      setProfile(null);
      window.dispatchEvent(new Event("studynest:auth-changed"));
      navigate("/login");
    });
  };

  const rawPic = profile?.profile_picture_url || auth?.profile_picture_url;
  const profile_pic = rawPic && !avatarBroken ? toBackendUrl(rawPic) + `?v=${profile?.updated_at || '1'}` : null;

  useEffect(() => {
    setAvatarBroken(false);
  }, [rawPic]);

  const markAllAsRead = async () => {
    const uid = profile?.id || auth?.id;
    if (!uid) return;
    try {
      await apiClient.post("notifications.php?action=mark_read", {
        mark_all: true
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const [pageTitle, pageSubtitle] = Object.entries(PAGE_MAP).find(([key]) =>
    location.pathname.startsWith(key)
  )?.[1] || ["StudyNest", "UIU Platform"];

  const navActions = useMemo(() => {
    const role = auth?.role || "User";
    return [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={18} />, path: auth?.role?.toLowerCase() === 'admin' ? '/admin' : '/home' },
      { icon: <MessageSquare className="w-5 h-5" />, path: "/messages", label: "Messages" },
      { icon: <Bell className="w-5 h-5" />, path: "/profile", label: "Alerts", badge: true },
    ];
  }, [auth]);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(24, 24, 27, 0.98)" // #18181B
          : "rgba(24, 24, 27, 0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        boxShadow: scrolled ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div className="flex items-center justify-between h-20 px-6 lg:px-12">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setNavOpen(!navOpen)}
          className="lg:hidden p-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors mr-4"
        >
          {navOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
          
        {/* Left: Page Title */}
        <motion.div
          initial={{ opacity: 0, x: -20, filter: "none" }}
          animate={{ opacity: 1, x: 0, filter: "none" }}
          key={location.pathname}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col"
        >
          <h1 className="text-lg font-bold tracking-tight leading-none text-white">
            {pageTitle}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-white/50">
            {pageSubtitle}
          </p>
        </motion.div>

        {/* Center: Search */}
        <div className="hidden lg:flex items-center flex-1 max-w-2xl mx-12">
          <div
            className="relative w-full transition-all duration-500"
            ref={searchRef}
            style={{ filter: searchFocused ? "drop-shadow(0 4px 12px rgba(0,29,54,0.05))" : "none" }}
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300"
              style={{ color: searchFocused ? "#FFFFFF" : "rgba(255,255,255,0.4)" }}
            />
            <input
              type="text"
              placeholder="Search courses, resources, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="w-full rounded-xl py-3 pl-11 pr-16 text-sm font-bold outline-none transition-all duration-300 placeholder:text-white/30"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: searchFocused
                  ? "1px solid rgba(255,255,255,0.2)"
                  : "1px solid rgba(255,255,255,0.05)",
                color: "#FFFFFF",
              }}
            />
            {isSearching && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white/10 text-white/50 border border-white/10">
                /
              </kbd>
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchFocused && searchQuery.trim() !== "" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 mt-2 max-h-[400px] overflow-y-auto rounded-2xl p-2 z-50 bg-white"
                  style={{
                    border: "1px solid rgba(0,29,54,0.1)",
                    boxShadow: "0 12px 32px rgba(0,29,54,0.1)"
                  }}
                >
                  {searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchFocused(false);
                            if (item.type === 'note') navigate(`/notes?id=${item.id}`);
                            else if (item.type === 'resource') navigate(`/resources?id=${item.id}`);
                            else if (item.type === 'forum') navigate(`/forum?id=${item.id}`);
                            else if (item.type === 'room') navigate(`/rooms?id=${item.id}`);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left hover:bg-[#001D36]/5"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#001D36]/5 border border-[#001D36]/10">
                            {item.type === 'note' && <LayoutGrid className="w-4 h-4 text-[#F18900]" />}
                            {item.type === 'resource' && <Sparkles className="w-4 h-4 text-[#00808C]" />}
                            {item.type === 'forum' && <MessageSquare className="w-4 h-4 text-[#8AB100]" />}
                            {item.type === 'room' && <Video className="w-4 h-4 text-[#001D36]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-[#001D36] truncate">{item.title}</h4>
                            <p className="text-[10px] text-[#66625C] uppercase font-bold tracking-wider">{item.course || item.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !isSearching && (
                      <div className="p-8 text-center">
                        <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Actions + Profile */}
        <div className="flex items-center gap-3">

          {/* Action Icons */}
          <div className="flex items-center gap-1 mr-2">
            {navActions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                   if (action.label === "Alerts") {
                     setNotificationsOpen(!notificationsOpen);
                     setProfileOpen(false);
                   } else if (action.path !== "#") {
                     navigate(action.path);
                   }
                }}
                className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group ${
                   (action.label === "Alerts" && notificationsOpen) ? "text-emerald-400 bg-emerald-400/10" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                ref={action.label === "Alerts" ? notificationsRef : null}
              >
                {action.icon}
                {(action.badge && unreadCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#F18900]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                    <span className="absolute inset-0 rounded-full animate-ping bg-[#F18900] opacity-50" />
                  </span>
                )}

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {action.label === "Alerts" && notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="absolute right-0 top-full mt-3 w-80 rounded-2xl overflow-hidden cursor-default"
                      style={{
                        background: "rgba(255,255,255,0.98)",
                        border: "1px solid rgba(0,29,54,0.15)",
                        backdropFilter: "blur(24px)",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-[#001D36]/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#001D36]">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-[#00808C] hover:text-[#00808C]/80 transition-colors uppercase tracking-wider"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-[#001D36]/5">
                            {notifications.map((n, idx) => (
                              <div 
                                key={idx} 
                                className={`p-4 transition-colors hover:bg-[#001D36]/5 cursor-pointer ${!n.read_at ? 'bg-[#001D36]/5' : ''}`}
                                onClick={() => {
                                  if (n.link) navigate(n.link);
                                  setNotificationsOpen(false);
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-[#001D36]/10">
                                    <Bell className="w-4 h-4 text-[#001D36]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#001D36] truncate">{n.title}</p>
                                    <p className="text-[11px] text-[#66625C] line-clamp-2 mt-0.5">{n.message}</p>
                                    <p className="text-[9px] text-[#66625C] mt-1 font-medium">{new Date(n.created_at).toLocaleDateString()}</p>
                                  </div>
                                  {!n.read_at && <div className="w-2 h-2 rounded-full bg-[#00808C] mt-1 self-start" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-[#001D36]/5 flex items-center justify-center mx-auto mb-3">
                              <Bell className="w-6 h-6 text-[#66625C]" />
                            </div>
                            <p className="text-sm text-[#66625C]">No new alerts</p>
                          </div>
                        )}
                      </div>

                      {/* Recommended Actions / Feature Highlights */}
                      {auth?.role?.toLowerCase() !== 'admin' && (
                        <div className="p-4 bg-[#001D36]/5 border-t border-[#001D36]/5">
                          <p className="text-[10px] font-bold text-[#001D36] uppercase tracking-widest mb-3">Student Highlights</p>
                          <div className="grid grid-cols-2 gap-2">
                             <button 
                               onClick={() => { navigate("/rooms"); setNotificationsOpen(false); }}
                               className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-[#001D36]/10 hover:border-[#00808C]/50 transition-all text-left group"
                             >
                               <Video className="w-4 h-4 text-[#00808C] group-hover:scale-110 transition-transform" />
                               <span className="text-[10px] font-bold text-[#001D36]">Join a Room</span>
                             </button>
                             <button 
                               onClick={() => { navigate("/points-leaderboard"); setNotificationsOpen(false); }}
                               className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-[#001D36]/10 hover:border-[#F18900]/50 transition-all text-left group"
                             >
                               <Sparkles className="w-4 h-4 text-[#F18900] group-hover:scale-110 transition-transform" />
                               <span className="text-[10px] font-bold text-[#001D36]">Leaderboard</span>
                             </button>
                          </div>
                        </div>
                      )}

                      <div className="p-3 text-center border-t border-[#001D36]/5">
                         <button 
                           onClick={() => { navigate("/profile"); setNotificationsOpen(false); }}
                           className="text-[10px] font-bold text-[#66625C] hover:text-[#001D36] transition-colors"
                         >
                           View all history
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Profile Button */}
          <div className="relative ml-2" ref={profileRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${profileOpen ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-white/5">
                {profile_pic ? (
                  <img src={profile_pic} alt="Me" className="w-full h-full object-cover" onError={() => setAvatarBroken(true)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white/70" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0F172A]" />
              </div>

              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold leading-none text-white">
                  {profile?.username || profile?.name || "Student"}
                </p>
                <p className="text-[10px] mt-0.5 text-white/50">
                  Online
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 text-white/50 group-hover:text-white ${profileOpen ? "rotate-180" : ""}`}
              />
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  className="absolute right-0 mt-3 w-72 rounded-2xl overflow-hidden bg-white"
                  style={{
                    border: "1px solid rgba(0,29,54,0.1)",
                    boxShadow: "0 20px 40px rgba(0,29,54,0.1)"
                  }}
                >
                  {/* Profile Summary */}
                  <div className="p-5 border-b border-[#001D36]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[#001D36]/20 bg-[#F0F4F8]">
                        {profile_pic ? (
                          <img src={profile_pic} alt="Me" className="w-full h-full object-cover" onError={() => setAvatarBroken(true)} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-[#001D36]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#001D36]">
                          {profile?.username || "Guest"}
                        </p>
                        <p className="text-xs mt-0.5 text-[#66625C]">
                          {profile?.email || "student@uiu.ac.bd"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#8AB100]" />
                          <span className="text-[10px] font-bold text-[#8AB100]">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    {[
                      { label: "My Profile", icon: <UserIcon className="w-4 h-4" />, path: "/profile" },
                      { label: "My Resources", icon: <History className="w-4 h-4" />, path: "/my-resources" },
                      { label: "Study Rooms", icon: <Video className="w-4 h-4" />, path: "/rooms" },
                      { label: "Settings", icon: <Settings className="w-4 h-4" />, path: "/profile" },
                    ].map((item, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ x: 4 }}
                        onClick={() => { navigate(item.path); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#66625C] transition-all hover:bg-[#001D36]/5 hover:text-[#001D36]"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#001D36]/10">
                          {item.icon}
                        </div>
                        {item.label}
                      </motion.button>
                    ))}
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-[#001D36]/10">
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#A7481E] transition-all hover:bg-[#A7481E]/10"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#001D36]/10">
                        <LogOut className="w-4 h-4" />
                      </div>
                      Sign Out
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
