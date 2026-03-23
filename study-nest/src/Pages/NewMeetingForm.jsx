// src/Pages/NewMeetingForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

import apiClient from "../apiConfig";
const COLLAPSED_W = 72;
const EXPANDED_W = 248;

export default function NewMeetingForm() {
  /* ===== LeftNav / layout state (same pattern as StudyRooms) ===== */
  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const SIDEBAR_W = navOpen ? EXPANDED_W : COLLAPSED_W;

  /* ===== Form flow/data ===== */
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [program, setProgram] = useState("");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState(null);

  const [title, setTitle] = useState("");
  const [scheduleType, setScheduleType] = useState("instant"); // "instant" | "scheduled"
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [q, setQ] = useState("");

  const navigate = useNavigate();

  /* Load programs */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/courses.php", { params: { type: "programs" } });
        const j = res.data;
        if (!cancel && j.ok) setPrograms(j.programs || []);
      } catch {
        if (!cancel) setErr("Failed to load programs");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await apiClient.get("profile.php");
        const j = response.data;
        const display =
          (j.ok && j.profile && (j.profile.name || j.profile.username)) ||
          (j.ok && j.name);
        if (display) setName(display);
        else {
          const local = JSON.parse(localStorage.getItem("studynest.profile") || "null");
          if (local?.name || local?.username) setName(local.name || local.username);
        }
        if (j.ok && j.profile) {
          localStorage.setItem("studynest.profile", JSON.stringify(j.profile));
        }
      } catch {
        try {
          const prof = JSON.parse(localStorage.getItem("studynest.profile") || "null");
          if (prof?.name || prof?.username) setName(prof.name || prof.username);
          else {
            const au = JSON.parse(localStorage.getItem("studynest.auth") || "null");
            if (au?.name || au?.username) setName(au.name || au.username);
          }
        } catch { }
      }
    })();
  }, []);

  async function pickProgram(p) {
    setProgram(p);
    setDepartment("");
    setCourse(null);
    setDepartments([]);
    setCourses([]);
    setStep(2);
    setErr("");
    setLoading(true);
    try {
      const res = await apiClient.get("/courses.php", { 
        params: { type: "departments", program: p } 
      });
      const j = res.data;
      if (j.ok) setDepartments(j.departments || []);
    } catch {
      setErr("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }

  async function pickDept(d) {
    setDepartment(d);
    setCourse(null);
    setCourses([]);
    setStep(3);
    setErr("");
    setLoading(true);
    try {
      const res = await apiClient.get("/courses.php", { 
        params: { type: "courses", department: d } 
      });
      const j = res.data;
      if (j.ok) setCourses(j.courses || []);
    } catch {
      setErr("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  /* Debounced search on step 3 */
  useEffect(() => {
    if (step !== 3 || !department) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/courses.php", {
          params: { type: "courses", department, q },
          signal: ctrl.signal,
        });
        const j = res.data;
        if (j.ok) setCourses(j.courses || []);
      } catch (e) {
        if (e.name !== "CanceledError") {
          // console.error("Search failed", e);
        }
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, step, department]);

  const canSubmit = useMemo(() => {
    if (!course) return false;
    if (scheduleType === "scheduled" && !startsAt) return false;
    return true;
  }, [course, scheduleType, startsAt]);

  async function startMeeting() {
    if (!canSubmit) return;
    setLoading(true);
    setErr("");
    try {
      const payload = {
        title: title || course?.course_title || "Study Room",
        course: course?.course_code || "",
        starts_at: scheduleType === "scheduled" ? startsAt : null,
        display_name: name || ""
      };
      const response = await apiClient.post("meetings.php", payload);
      const j = response.data;

      if (j.ok && j.id) {
        window.dispatchEvent(new CustomEvent('studynest:points-updated', {
            detail: { points: j.newPoints }
        }));
        navigate(`/rooms/${j.id}`, { state: { title: payload.title, createdThisSession: true } });
      } else {
        setErr(j.error || "Failed to create meeting");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setErr(msg === "Network Error" ? "Network error while creating meeting" : msg);
    } finally {
      setLoading(false);
    }
  }
  // In LeftNav.jsx, enhance the points update listener
useEffect(() => {
    const handlePointsUpdate = (event) => {
        if (event.detail?.points !== undefined) {
            setPoints(event.detail.points);
        }
    };

    window.addEventListener('studynest:points-updated', handlePointsUpdate);

    return () => {
        window.removeEventListener('studynest:points-updated', handlePointsUpdate);
    };
}, []);

// Also add this to sync with localStorage changes
useEffect(() => {
    const onStorage = (e) => {
        if (e.key === 'studynest.auth') {
            try {
                const authData = JSON.parse(e.newValue);
                if (authData?.points !== undefined) {
                    setPoints(authData.points);
                }
            } catch { }
        }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
}, []);

  const steps = [
    { id: 1, label: "Program" },
    { id: 2, label: "Department" },
    { id: 3, label: "Course & Details" }
  ];

  return (
    <div className="min-h-screen relative" style={{ background: "#08090e" }}>
      {/* Left sidebar (fixed) */}
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={SIDEBAR_W}
      />

      {/* Header and Footer receive the same width so nothing overlaps */}
      <Header sidebarWidth={SIDEBAR_W} />

      <main style={{ paddingLeft: SIDEBAR_W }} className="transition-[padding] duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #a78bfa, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Create a Study Room</h1>
              <p className="text-sm mt-1" style={{ color: "#475569" }}>Pick a course, add details, and invite peers.</p>
            </div>
            <Link to="/rooms" className="hidden sm:inline-block rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
              ← Back to Rooms
            </Link>
          </div>

          {/* Stepper */}
          <div className="mb-6">
            <ol className="flex items-center gap-2">
              {steps.map((s, i) => {
                const active = s.id === step;
                const done = s.id < step;
                return (
                  <li key={s.id} className="flex items-center">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-all duration-300"
                      style={{ background: done ? "rgba(52,211,153,0.2)" : active ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)", border: `1px solid ${done ? "rgba(52,211,153,0.4)" : active ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`, color: done ? "#34d399" : active ? "#a78bfa" : "#475569" }}>
                      {s.id}
                    </div>
                    <span className="ml-2 mr-4 text-sm" style={{ color: active ? "#a78bfa" : done ? "#34d399" : "#475569", fontWeight: active ? 700 : 400 }}>{s.label}</span>
                    {i < steps.length - 1 && <span className="h-px w-12 hidden sm:block" style={{ background: "rgba(255,255,255,0.07)" }} />}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left */}
            <section className="lg:col-span-2 space-y-4">
              {err && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {err}
                </div>
              )}

              {step === 1 && (
                <Card>
                  <HeaderRow title="Choose Program" />
                  <div className="p-4">
                    {loading && <Loader text="Loading programs..." />}
                    {!loading && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {programs.map((p) => (
                          <button
                            key={p}
                            onClick={() => pickProgram(p)}
                            className="rounded-xl bg-gray-900/70 border border-gray-700 px-3 py-3 text-left hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          >
                            <div className="text-base font-semibold text-gray-100">{p}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Browse departments →</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <HeaderRow
                    title="Choose Department"
                    right={<BackBtn onClick={() => setStep(1)} />}
                    sub={`Program: ${program}`}
                  />
                  <div className="p-4">
                    {loading && <Loader text="Loading departments..." />}
                    {!loading && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {departments.map((d) => (
                          <button
                            key={d}
                            onClick={() => pickDept(d)}
                            className="rounded-xl bg-gray-900/70 border border-gray-700 px-3 py-3 text-left hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          >
                            <div className="text-base font-semibold text-gray-100">{d}</div>
                            <div className="text-xs text-gray-400 mt-0.5">View courses →</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {step === 3 && (
                <>
                  <Card>
                    <HeaderRow
                      title="Select Course"
                      right={<BackBtn onClick={() => setStep(2)} />}
                      sub={`${program} • ${department}`}
                    />
                    <div className="p-4">
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by code or title…"
                        className="w-full rounded-xl bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                      <div className="mt-3 max-h-[420px] overflow-y-auto space-y-2 pr-1">
                        {loading && <Loader text="Loading courses..." />}
                        {!loading &&
                          courses.map((c) => {
                            const selected = c.id === course?.id;
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => setCourse(c)}
                                className={
                                  "w-full text-left rounded-xl border px-3 py-2 transition " +
                                  (selected
                                    ? "border-cyan-400 bg-blue-500/10"
                                    : "border-gray-700 bg-gray-900/70 hover:bg-slate-900")
                                }
                              >
                                <div className="flex items-center gap-3">
                                  {c.course_thumbnail ? (
                                    <img src={c.course_thumbnail} alt="" className="h-12 w-16 rounded object-cover" />
                                  ) : (
                                    <div className="h-12 w-16 rounded bg-slate-800 grid place-items-center text-slate-500 text-xs">
                                      No image
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-100 truncate">
                                      {c.course_code} — {c.course_title}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {c.department} • {c.program}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        {!loading && courses.length === 0 && (
                          <div className="rounded-xl border border-gray-700 bg-slate-900/50 px-3 py-4 text-center text-sm text-gray-400">
                            No courses found.
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <HeaderRow title="Room Details" />
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Label>The topic will be discussed</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={"e.g., Midterm Question Solve"}
                        />
                      </div>

                      <div>
                        <Label>Start type</Label>
                        <div className="flex items-center gap-4 text-sm">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              checked={scheduleType === "instant"}
                              onChange={() => setScheduleType("instant")}
                              className="h-4 w-4 rounded border-gray-700 text-blue-500 bg-slate-900"
                            />
                            Instant
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              checked={scheduleType === "scheduled"}
                              onChange={() => setScheduleType("scheduled")}
                              className="h-4 w-4 rounded border-gray-700 text-blue-500 bg-slate-900"
                            />
                            Schedule
                          </label>
                        </div>
                      </div>

                      <div>
                        <Label>Starts at {scheduleType === "scheduled" ? "" : "(disabled)"}</Label>
                        <input
                          type="datetime-local"
                          value={startsAt}
                          onChange={(e) => setStartsAt(e.target.value)}
                          disabled={scheduleType !== "scheduled"}
                          className={
                            "w-full rounded-xl px-3 py-2 text-sm bg-gray-900/70 border " +
                            (scheduleType === "scheduled"
                              ? "border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                              : "border-gray-700 text-slate-500 opacity-60")
                          }
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between pt-1">
                        <Link to="/rooms" className="rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                          Cancel
                        </Link>
                        <button onClick={startMeeting} disabled={!canSubmit || loading}
                          className="rounded-xl px-5 py-2 text-sm font-bold transition-all duration-300 disabled:opacity-40"
                          style={ canSubmit && !loading ? { background: "linear-gradient(135deg, #7c3aed, #22d3ee)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" } : { background: "rgba(255,255,255,0.06)", color: "#334155" } }>
                          {loading ? "Creating…" : "Start Room"}
                        </button>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </section>

            {/* Right: summary */}
            <aside className="space-y-4">
              <Card>
                <HeaderRow title="Selection" />
                <div className="p-4">
                  <Row label="Program" value={program || "—"} />
                  <Row label="Department" value={department || "—"} />
                  <div className="mt-3 rounded-xl border border-gray-700 bg-slate-900/60 p-3">
                    <div className="text-gray-400 text-xs mb-1">Course</div>
                    {course ? (
                      <div className="flex items-center gap-3">
                        {course.course_thumbnail ? (
                          <img src={course.course_thumbnail} alt="" className="h-12 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-16 rounded bg-slate-800 grid place-items-center text-slate-500 text-xs">
                            No image
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-100 truncate">
                            {course.course_code} — {course.course_title}
                          </div>
                          <div className="text-xs text-gray-400">
                            {course.department} • {course.program}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Nothing selected</div>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase">Tips</h3>
                  <ul className="mt-2 space-y-2 text-sm text-gray-300">
                    <li>• Use a clear, descriptive title.</li>
                    <li>• Schedule sessions at least 2 hours ahead.</li>
                    <li>• Share the room link with classmates.</li>
                  </ul>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>

      <Footer sidebarWidth={SIDEBAR_W} />
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function Card({ children }) {
  return (
    <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

function HeaderRow({ title, right, sub }) {
  return (
    <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#334155" }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-slate-900"
    >
      ← Back
    </button>
  );
}

function Loader({ text = "Loading…" }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-slate-900/50 px-3 py-2 text-sm text-gray-300">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mr-2 align-[-2px]" />
      {text}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-xs text-gray-400 mb-1">{children}</label>;
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 " +
        (props.className || "")
      }
    />
  );
}

function Row({ label, value }) {
  return (
    <div className="text-sm mt-2 first:mt-0">
      <div className="text-gray-400">{label}</div>
      <div className="font-medium text-gray-100">{value}</div>
    </div>
  );
}
