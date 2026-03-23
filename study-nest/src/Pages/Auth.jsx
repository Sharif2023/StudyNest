import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, User, Hash, ArrowRight, ChevronLeft } from "lucide-react";
import apiClient from "../apiConfig";
import logo from "../assets/logo.png";
import ThreeBackground from "../Components/ThreeBackground";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Tab state: 'login' or 'signup'
  const [activeTab, setActiveTab] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    username: "",
    studentId: "",
    email: "",
    password: "",
  });

  // Sync state with URL if it changes
  useEffect(() => {
    setActiveTab(location.pathname === "/signup" ? "signup" : "login");
    setError("");
  }, [location.pathname]);

  const toggleTab = (tab) => {
    setActiveTab(tab);
    setError("");
    navigate(tab === "signup" ? "/signup" : "/login", { replace: true });
  };

  const onLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const onSignupChange = (e) => {
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("login.php", loginForm);
      const data = res.data;

      if (data.ok || data.success) {
        const user = data.user || {};
        // Ensure profile_picture_url is consistent
        if (user.profile_picture && !user.profile_picture_url) {
          user.profile_picture_url = user.profile_picture;
        }
        localStorage.setItem("studynest.auth", JSON.stringify(user));
        localStorage.setItem("studynest.profile", JSON.stringify(user));
        localStorage.setItem("studynest.user", JSON.stringify({
          name: user.name || user.username || "Student",
          email: user.email || "",
          bio: user.bio || "",
          profile_picture_url: user.profile_picture_url || "",
          prefs: { defaultAnonymous: false, darkMode: false, courseFocus: "" }
        }));
        if (data.token) {
          localStorage.setItem("studynest.jwt", data.token);
        } else {
          localStorage.removeItem("studynest.jwt");
        }
        if (data.refresh_token) {
          localStorage.setItem("studynest.refresh", data.refresh_token);
        } else {
          localStorage.removeItem("studynest.refresh");
        }
        window.dispatchEvent(new Event("studynest:auth-changed"));
        if (user.role === 'Admin') navigate("/admin");
        else navigate("/home");
      } else {
        setError(data.error || data.message || "Login failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message === "Failed to fetch" ? "Network error. Check connection." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.post("signup.php", signupForm);
      const data = res.data;

      if (data.ok || data.success) {
        // Automatically switch to login on success
        toggleTab("login");
        setError("Account created! You can now log in.");
      } else {
        setError(data.error || data.message || "Signup failed.");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Network error. Check connection." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black overflow-hidden relative">
      <ThreeBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl grid lg:grid-cols-2 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* LEFT SIDE: DESCRIPTIVE / BRANDING PANEL */}
          <div className="relative p-8 lg:p-16 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-1000" />
            
            <div className="relative z-10">
              <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 uppercase text-[10px] font-black tracking-[0.4em]">
                <ChevronLeft className="w-4 h-4" />
                Return to Base
              </Link>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-2xl">
                  <img src={logo} alt="StudyNest" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">StudyNest</h2>
              </div>
              
              <AnimatePresence mode="wait">
                {activeTab === "login" ? (
                  <motion.div
                    key="login-hero"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="mt-8"
                  >
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] uppercase italic">Welcome<br/>Back</h1>
                    <p className="mt-8 text-white/40 max-w-sm leading-relaxed font-medium">Rejoin your study clusters and accelerate your academic journey in our digital ecosystem.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup-hero"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="mt-8"
                  >
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] uppercase">Start<br/>Journey</h1>
                    <p className="mt-8 text-white/40 max-w-sm leading-relaxed font-medium">Build your identity within the UIU community. Access tools, resources, and live collaboration.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-10 pt-12 flex items-center justify-between">
               <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Digital / Infrastructure</div>
               <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">v3.2.0</div>
            </div>
          </div>

          {/* RIGHT SIDE: INTERACTIVE FORM PANEL */}
          <div className="relative bg-white/5 lg:border-l border-white/10 p-8 lg:p-16">
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/5 to-transparent pointer-events-none" />

            {/* Tab Toggler */}
            <div className="flex gap-8 mb-16 relative z-10">
              <button 
                onClick={() => toggleTab("login")}
                className={`text-sm font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'login' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                Login
                {activeTab === 'login' && <motion.div layoutId="auth-tab" className="absolute -bottom-3 left-0 right-0 h-1 bg-white rounded-full" />}
              </button>
              <button 
                onClick={() => toggleTab("signup")}
                className={`text-sm font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'signup' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                Join
                {activeTab === 'signup' && <motion.div layoutId="auth-tab" className="absolute -bottom-3 left-0 right-0 h-1 bg-white rounded-full" />}
              </button>
            </div>

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`mb-8 p-6 rounded-3xl text-[10px] font-black uppercase tracking-widest text-center border ${
                      error.includes("Account created") 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {activeTab === "login" ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input 
                            type="email" 
                            name="email"
                            required
                            placeholder="student@uiu.ac.bd"
                            value={loginForm.email}
                            onChange={onLoginChange}
                            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-8 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input 
                            type={showPw ? "text" : "password"}
                            name="password"
                            required
                            placeholder="••••••••"
                            value={loginForm.password}
                            onChange={onLoginChange}
                            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-16 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPw(!showPw)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                          >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button 
                        disabled={loading}
                        className="w-full h-16 bg-white text-black rounded-[2rem] font-black uppercase text-[11px] tracking-[0.5em] transition-all hover:bg-neutral-200 active:scale-[0.98] mt-8 flex items-center justify-center gap-3 group"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <>
                            Enter Platform
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Name</label>
                           <div className="relative">
                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input 
                              type="text" 
                              name="username"
                              required
                              placeholder="Full Name"
                              value={signupForm.username}
                              onChange={onSignupChange}
                              className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-4 pl-14 pr-4 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all" 
                            />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Student ID</label>
                           <div className="relative">
                            <Hash className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input 
                              type="text" 
                              name="studentId"
                              required
                              placeholder="011..."
                              value={signupForm.studentId}
                              onChange={onSignupChange}
                              className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-4 pl-14 pr-4 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all" 
                            />
                           </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Institutional Email</label>
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input 
                            type="email" 
                            name="email"
                            required
                            placeholder="student@uiu.ac.bd"
                            value={signupForm.email}
                            onChange={onSignupChange}
                            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-8 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-4">Create Access Key</label>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input 
                            type="password"
                            name="password"
                            required
                            placeholder="Min. 6 chars"
                            value={signupForm.password}
                            onChange={onSignupChange}
                            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-8 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all" 
                          />
                        </div>
                      </div>

                      <button 
                        disabled={loading}
                        className="w-full h-16 bg-white text-black rounded-[2rem] font-black uppercase text-[11px] tracking-[0.5em] transition-all hover:bg-neutral-200 active:scale-[0.98] mt-4"
                      >
                         {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Identity"}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
