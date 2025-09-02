import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const navigate = useNavigate();

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost/StudyNest/study-nest/src/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Optionally store user in localStorage/sessionStorage
      // localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/home");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white h-fit w-full">
      {/* Brand */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
            <img src="src/assets/logo.png" alt="Study-Nests-Logo" className="h-7 w-7" />
          </span>
          <span className="text-zinc-900 font-semibold tracking-tight">StudyNest</span>
        </Link>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left: visual panel (same as signup) */}
          <div className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl ring-1 ring-zinc-200 shadow-sm">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Convocation_of_UIU%2C_2013.jpg/960px-Convocation_of_UIU%2C_2013.jpg?20150326164240"
                alt="Study group collaborating at UIU"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                Built for UIU students
              </span>
              <span className="text-sm text-zinc-500">Join groups • Share notes • Plan sessions</span>
            </div>
          </div>

          {/* Right: form card (mirrors signup card) */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              <Dots className="absolute -left-8 -top-8 text-emerald-200" />
              <Dots className="absolute -right-8 -bottom-8 text-emerald-100" />

              <div className="relative rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                  Log in to StudyNest
                </h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Use your <span className="font-medium">UIU email</span> to continue.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-6">
                  {/* Email */}
                  <div className="relative">
                    <label
                      htmlFor="email"
                      className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-zinc-500"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="yourid@uiu.ac.bd"
                      value={form.email}
                      onChange={onChange}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <label
                      htmlFor="password"
                      className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold text-zinc-500"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      required
                      placeholder="Your password"
                      value={form.password}
                      onChange={onChange}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-zinc-900 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-500 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  {/* Row: remember + forgot */}
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={form.remember}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Remember me
                    </label>
                    <Link to="/forgot" className="text-sm font-semibold text-emerald-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                  >
                    {loading ? "Signing in…" : "Log in"}
                  </button>

                  {/* Bottom link */}
                  <p className="text-center text-sm text-zinc-600">
                    Don’t have an account?{" "}
                    <Link to="/signup" className="font-semibold text-emerald-700 hover:underline">
                      Sign up
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- helpers reused from signup --- */
function Dots({ className = "" }) {
  return (
    <svg viewBox="0 0 91 91" className={`h-24 w-24 ${className}`} aria-hidden="true">
      <g fill="currentColor">
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 8 }).map((__, c) => (
            <circle key={`${r}-${c}`} cx={3.26 + 12.03 * c} cy={3.45 + 12.08 * r} r="2.72" />
          ))
        )}
      </g>
    </svg>
  );
}
function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path fill="currentColor" d="M12 5c-5.5 0-9.5 4.5-10 6 .5 1.5 4.5 6 10 6s9.5-4.5 10-6c-.5-1.5-4.5-6-10-6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
    </svg>
  );
}
function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path
        fill="currentColor"
        d="M3 4.3 4.3 3 21 19.7 19.7 21l-2.6-2.6A11.9 11.9 0 0 1 12 19c-5.5 0-9.5-4.5-10-6 .3-.9 2.3-3.4 5.5-4.9L3 4.3zm7 3.4 6.3 6.3a4 4 0 0 0-6.3-6.3zM12 5c5.5 0 9.5 4.5 10 6-.2.5-1 1.7-2.4 3L18.2 12c.1-.3.1-.6.1-.9A6.3 6.3 0 0 0 12 5z"
      />
    </svg>
  );
}
