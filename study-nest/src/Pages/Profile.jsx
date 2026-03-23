import React, { useState, useEffect, useMemo } from "react";
import { 
  User, 
  Settings, 
  Bookmark, 
  Layers, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient, { hasToken } from "../apiConfig";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { ProfilePicture } from "../Components/Profile/ProfileComponents";
import { Overview, EditProfile, Preferences, Bookmarks, MyContent, Security } from "../Components/Profile/ProfileSections";
import { loadUser, loadLocal } from "../Components/Profile/ProfileUtils";

const SIDEBAR_WIDTH_COLLAPSED = 80;
const SIDEBAR_WIDTH_EXPANDED = 280;

export default function Profile() {
  const [navOpen, setNavOpen] = useState(window.innerWidth >= 1024);
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.auth")) || null; } catch { return null; }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.profile")) || null; } catch { return null; }
  });

  const [tab, setTab] = useState("overview");
  const sidebarWidth = navOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;
  
  const [user, setUser] = useState(() => loadUser());
  const [dark, setDark] = useState(() => !!user?.prefs?.darkMode);

  const navItems = useMemo(() => {
    const base = [
      ["overview", "Overview", <Layers className="w-5 h-5"/>],
      ["edit", "Profile", <User className="w-5 h-5"/>],
      ["prefs", "Settings", <Settings className="w-5 h-5"/>],
    ];
    if (auth?.role?.toLowerCase() !== 'admin') {
      base.push(["bookmarks", "Bookmarks", <Bookmark className="w-5 h-5"/>]);
      base.push(["content", "Content", <BookOpen className="w-5 h-5"/>]);
    }
    base.push(["security", "Security", <ShieldCheck className="w-5 h-5"/>]);
    return base;
  }, [auth]);

  const displayName = (profile?.name && profile.name.trim())
    || (auth?.name && auth.name.trim())
    || "Student";

  const profile_pic = profile?.profile_picture_url || auth?.profile_picture_url;

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth && !hasToken()) return;
      try {
        const response = await apiClient.get("profile.php");
        const j = response.data;
        if (j.ok && j.profile) {
          setProfile(j.profile);
          localStorage.setItem("studynest.profile", JSON.stringify(j.profile));
          
          const updatedUser = {
            name: j.profile.name || "Student",
            email: j.profile.email || "",
            bio: j.profile.bio || "",
            profile_picture_url: j.profile.profile_picture_url || "",
            prefs: profile?.prefs || auth?.prefs || { defaultAnonymous: false, darkMode: false, courseFocus: "" },
          };
          setUser(updatedUser);
          localStorage.setItem("studynest.user", JSON.stringify(updatedUser));

          const nextAuth = {
            ...auth,
            ...j.profile
          };
          localStorage.setItem("studynest.auth", JSON.stringify(nextAuth));
          setAuth(nextAuth);
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleFocus = async () => {
      if (!auth && !hasToken()) return;
      try {
        const response = await apiClient.get("profile.php");
        const j = response.data;
        if (j.ok && j.profile) {
          setProfile(j.profile);
          localStorage.setItem("studynest.profile", JSON.stringify(j.profile));
        }
      } catch (e) { }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [auth]);

  useEffect(() => {
    const root = document.documentElement;
    dark ? root.classList.add("dark") : root.classList.remove("dark");
  }, [dark]);

  function updateUser(next) {
    setUser(next);
    try { localStorage.setItem("studynest.user", JSON.stringify(next)); } catch { }
  }

  return (
    <div className="min-h-screen bg-[#08090e] selection:bg-[rgba(255,255,255,0.1)]/10 selection:text-white relative">
      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} sidebarWidth={sidebarWidth} />
      <Header sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} navOpen={navOpen} />

      <main
        style={{ paddingLeft: window.innerWidth < 1024 ? 0 : sidebarWidth }}
        className="transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen relative pb-32"
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-20 lg:py-32 relative z-10">
          <header className="mb-16 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[rgba(10,11,18,0.4)] backdrop-blur-2xl shadow-2xl p-10 lg:p-16"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent blur-[120px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/10 via-transparent to-transparent blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end gap-10 lg:gap-16">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                  <div className="relative bg-[#08090e] p-1.5 rounded-full overflow-hidden">
                    <ProfilePicture url={profile_pic} name={displayName} size={160} className="rounded-full object-cover" />
                  </div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 bg-emerald-500 border-4 border-[#08090e] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 mb-6">
                    <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 uppercase tracking-widest leading-none">
                      {profile?.role || "Active Scholar"}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Level 12
                    </span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-white tracking-tight mb-4 drop-shadow-sm">
                    {displayName}
                  </h1>
                  <p className="text-xl text-slate-300 font-medium max-w-2xl leading-relaxed mb-8">
                    {profile?.bio || "Crafting an academic legacy at StudyNest..."}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setTab('edit')} className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-95">
                    Edit Profile
                  </button>
                  <button onClick={() => setTab('prefs')} className="flex items-center justify-center p-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <motion.aside 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="lg:col-span-3 lg:sticky lg:top-32 space-y-4"
            >
              {navItems.map(([val, label, icon]) => (
                <button
                  key={val}
                  onClick={() => setTab(val)}
                  className={`w-full group relative flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-700 ${
                    tab === val 
                    ? "bg-[rgba(255,255,255,0.1)] border-white/20 text-white shadow-xl" 
                    : "bg-[rgba(255,255,255,0.02)] border-white/10 text-slate-400 hover:bg-[rgba(255,255,255,0.03)] hover:border-white/10 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`transition-all duration-700 ${tab === val ? 'text-white scale-110' : 'group-hover:text-white'}`}>{icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] ">{label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all duration-700 ${tab === val ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 group-hover:opacity-40 group-hover:translate-x-0'}`} />
                </button>
              ))}
            </motion.aside>

            <motion.section 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 1, delay: 0.3 }}
               className="lg:col-span-9"
            >
               <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {tab === "overview" && <Overview user={user} displayName={displayName} />}
                    {tab === "edit" && <EditProfile user={user} onChange={updateUser} />}
                    {tab === "prefs" && (
                      <Preferences
                        user={user}
                        onChange={(u) => {
                          updateUser(u);
                          setDark(!!u.prefs?.darkMode);
                        }}
                      />
                    )}
                    {tab === "bookmarks" && <Bookmarks />}
                    {tab === "content" && <MyContent />}
                    {tab === "security" && (
                      <Security
                        user={user}
                        onClear={() => {
                          try {
                            localStorage.removeItem("studynest.user");
                            const res = loadLocal("studynest.resources", []);
                            const reset = res.map((r) => ({ ...r, bookmarks: 0 }));
                            localStorage.setItem("studynest.resources", JSON.stringify(reset));
                          } catch { }
                          setUser(loadUser());
                          setTab("overview");
                        }}
                      />
                    )}
                  </motion.div>
               </AnimatePresence>
            </motion.section>
          </div>
        </div>
        <Footer sidebarWidth={sidebarWidth} />
      </main>
    </div>
  );
}
