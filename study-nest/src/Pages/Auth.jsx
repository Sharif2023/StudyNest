import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, User, Hash, ArrowRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import apiClient from "../apiConfig";
import logo from "../assets/logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    username: "",
    studentId: "",
    email: "",
    password: "",
  });

  const loginImg = "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyNzVxc3k0dDFicmwzbTByNjhpZ2lleTJmdnUweXB5azV2YXN4eHhkdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SVZDSEPldhypJpmhPv/giphy.gif";
  const signupImg = "https://nsrit.com/wp-content/uploads/2025/11/Is-This-You-Frustrated-by-IT-Animated-GIF.gif";

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
      setError(err.response?.data?.error || (err.message === "Network Error" || err.message === "Failed to fetch" ? "Network error. Check connection." : err.message));
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
        toggleTab("login");
        setError("Account created! You can now log in.");
      } else {
        setError(data.error || data.message || "Signup failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || (err.message === "Network Error" || err.message === "Failed to fetch" ? "Network error. Check connection." : err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex selection:bg-indigo-500 selection:text-white font-sans overflow-hidden">
      
      {/* LEFT PANEL - BRANDING (Hidden on smaller screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden text-white">
        
        {/* Background Image tied to Active Tab with Overlay */}
        <div className="absolute inset-0 bg-zinc-900">
           <AnimatePresence mode="wait">
              <motion.img
                key={activeTab}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                src={activeTab === 'login' ? loginImg : signupImg}
                alt="UIU Background"
                className="absolute inset-0 w-full h-full object-cover"
              />
           </AnimatePresence>
           <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-zinc-900/20" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors mb-12 text-sm font-medium group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-transparent">
              <img src={logo} alt="StudyNest" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">StudyNest</h1>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <AnimatePresence mode="wait">
            {activeTab === "login" ? (
              <motion.div
                key="login-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Welcome back to your workspace.</h2>
                <p className="text-zinc-300 text-lg leading-relaxed">
                  Continue where you left off. Collaborate, learn, and grow with the UIU digital ecosystem.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="signup-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Start your academic journey.</h2>
                <p className="text-zinc-300 text-lg leading-relaxed">
                  Join StudyNest to access exclusive resources, study rooms, and connect with peers.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              Institutional email required for access
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              Secure, private study environment
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-zinc-400 font-medium">
          © {new Date().getFullYear()} UIU StudyNest Platform.
        </div>
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md">
          
          {/* Mobile Header (Hidden on large screens) */}
          <div className="lg:hidden mb-10 flex flex-col items-center text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-sm font-medium self-start">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-gray-100 mb-4">
              <img src={logo} alt="StudyNest" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              {activeTab === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-gray-500 text-sm">
              {activeTab === "login" ? "Enter your details to sign in." : "Join the StudyNest platform."}
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white">
            
            {/* Tabs */}
            <div className="flex gap-6 mb-8 border-b border-gray-200">
              <button 
                onClick={() => toggleTab("login")}
                className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'login' ? 'text-zinc-900' : 'text-gray-500 hover:text-zinc-900'}`}
              >
                Sign In
                {activeTab === 'login' && <motion.div layoutId="auth-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />}
              </button>
              <button 
                onClick={() => toggleTab("signup")}
                className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'signup' ? 'text-zinc-900' : 'text-gray-500 hover:text-zinc-900'}`}
              >
                Create Account
                {activeTab === 'signup' && <motion.div layoutId="auth-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-t-full" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
                    error.includes("Account created") 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="email" 
                          name="email"
                          required
                          placeholder="student@uiu.ac.bd"
                          value={loginForm.email}
                          onChange={onLoginChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <Link to="/forgot" className="text-xs font-semibold text-zinc-900 hover:text-zinc-700">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type={showPw ? "text" : "password"}
                          name="password"
                          required
                          placeholder="••••••••"
                          value={loginForm.password}
                          onChange={onLoginChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      disabled={loading}
                      className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          name="username"
                          required
                          placeholder="John Doe"
                          value={signupForm.username}
                          onChange={onSignupChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Student ID</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          name="studentId"
                          required
                          placeholder="011 221 000"
                          value={signupForm.studentId}
                          onChange={onSignupChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                      </div>
                    </div>
                    

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Institutional Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="email" 
                          name="email"
                          required
                          placeholder="student@uiu.ac.bd"
                          value={signupForm.email}
                          onChange={onSignupChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type={showPw ? "text" : "password"}
                          name="password"
                          required
                          placeholder="Min. 6 characters"
                          value={signupForm.password}
                          onChange={onSignupChange}
                          className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all placeholder:text-gray-400 shadow-sm" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button 
                      disabled={loading}
                      className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

