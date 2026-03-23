import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ChevronRight } from "lucide-react";
import apiClient from "../apiConfig";
import logo from "../assets/logo.png";
import ThreeBackground from "../Components/ThreeBackground";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("login.php", form);
      const data = response.data;

      if (data.ok || data.success) {
        localStorage.setItem("studynest.auth", JSON.stringify(data.user));
        localStorage.setItem("studynest.profile", JSON.stringify(data.user));
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("studynest.jwt", data.token);
        else localStorage.removeItem("studynest.jwt");
        window.dispatchEvent(new Event("studynest:auth-changed"));
        navigate("/home");
      } else {
        setError(data.error || data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(msg === "Network Error" 
        ? "Could not connect to the server. Please check your network." 
        : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#010208] selection:bg-indigo-500/30 selection:text-white font-sans text-white">
      {/* Dynamic 3D Background */}
      <ThreeBackground />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24 min-h-screen flex items-center relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 w-full">
          
          {/* LEFT COLUMN: HERO TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-bold text-indigo-300 uppercase tracking-[0.3em] backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Institutional Access
            </motion.p>
            <h1 className="tracking-tighter mb-8">
              <span className="block text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 uppercase leading-none">Study</span>
              <span className="block text-8xl lg:text-9xl font-thin tracking-widest mt-2 opacity-50 uppercase leading-none">Nest</span>
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-zinc-400 font-light">
              Connect with the <span className="text-white font-medium">United International University</span> digital ecosystem. 
              A premium space designed for collaboration, innovation, and academic excellence.
            </p>

            <div className="mt-12 flex items-center gap-8">
              <Link
                to="/signup"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-black text-black transition-all hover:pr-12 active:scale-95"
              >
                <span className="relative z-10">Create Account</span>
                <ArrowRight className="absolute right-4 h-5 w-5 transition-all group-hover:translate-x-1" />
              </Link>
              <Link
                to="/"
                className="text-sm font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-2 group"
              >
                Back to Landing
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: GLASSMORPHISM FORM */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative w-full flex justify-center lg:justify-end"
          >
            {/* Ambient Glows */}
            <div className="absolute -inset-4 bg-indigo-500/10 blur-[100px] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-fuchsia-500/5 blur-[120px] rounded-full" />

            <div className="relative w-full max-w-lg backdrop-blur-3xl bg-white/[0.03] rounded-[2.5rem] border border-white/10 p-8 lg:p-12 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Internal subtle gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

              <div className="relative flex items-center gap-5 mb-12">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-3 shadow-2xl relative group">
                   <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
                  <img src={logo} alt="StudyNest" className="w-full h-full object-contain relative z-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Login</h2>
                  <p className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.4em]">Portal V5 / UIU</p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="relative space-y-8">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.3em] ml-1 mb-3 transition-colors group-focus-within:text-indigo-400">
                      University Identity
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-all duration-500" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={onChange}
                        placeholder="student@uiu.ac.bd"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-sm text-white placeholder:text-white/10 outline-none focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all duration-500 ring-0 focus:ring-4 ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <div className="flex items-center justify-between ml-1 mb-3">
                      <label className="block text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.3em] transition-colors group-focus-within:text-indigo-400">
                        Access Key
                      </label>
                      <Link to="/forgot" className="text-[9px] font-bold text-white/20 hover:text-white transition-all uppercase tracking-widest">
                        Recovery?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-all duration-500" />
                      <input
                        type={showPw ? "text" : "password"}
                        name="password"
                        required
                        value={form.password}
                        onChange={onChange}
                        placeholder="••••••••"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 pl-14 pr-14 text-sm text-white placeholder:text-white/10 outline-none focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all duration-500 ring-0 focus:ring-4 ring-indigo-500/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-all"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full h-16 bg-white text-black rounded-2xl flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] hover:bg-indigo-50 active:scale-[0.98] transition-all duration-500 shadow-2xl shadow-white/10 overflow-hidden"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <span className="relative z-10">Authorize Access</span>
                        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-2 relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Institutional Footer */}
              <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">
                <span className="hover:text-white/30 transition-colors cursor-default">UIU Digital Ecosystem</span>
                <span className="opacity-40">Secure Auth 8.0</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Login;
