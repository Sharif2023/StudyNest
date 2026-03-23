import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import apiClient from "../apiConfig";

const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_EXPANDED = 260;

export default function TodoList() {
  // ----- Shell -----
  const [navOpen, setNavOpen] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const sidebarWidth = navOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  // ----- State -----
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "default",
    due_date: "",
    due_time: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get user profile and ID
  const profileStr = localStorage.getItem("studynest.profile");
  const profile = profileStr ? JSON.parse(profileStr) : {};
  const userId = profile?.id; // Use 'id' as this is the primary key in users table


  // Load tasks
  const loadTodos = async () => {

    if (!userId || userId === "—" || userId === "null" || userId === "undefined") {
      console.warn("Invalid user_id, skipping todo load");
      setTodos([]);
      return;
    }
    try {
      const res = await apiClient.get("todo.php", { params: { user_id: userId } });
      const data = res.data;

      if (data.ok) {
        setTodos(data.todos || []);
      } else {
        alert(`❌ Failed to load todos: ${data.error}`);
      }
    } catch (err) {
      // Error handled
      alert("⚠️ Failed to load your to-do list. Please check your connection.");
    }
  };

  useEffect(() => {
    loadTodos();
  }, [userId]);

  // ----- Add Task -----
  const saveTask = async () => {
    if (!form.title.trim()) {
      alert("⚠️ Please enter a task title.");
      return;
    }

    // Validate user ID

    setLoading(true);
    try {
      const response = await apiClient.post("todo.php", form, { 
        params: { user_id: userId } 
      });
      const data = response.data;

      if (data.ok) {
        alert("✅ Task added successfully!");
        setForm({ title: "", description: "", type: "default", due_date: "", due_time: "" });
        await loadTodos();
      } else {
        await loadTodos();
        alert(`⚠️ Task might have been added. Error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Network error during task creation:", err);
      await loadTodos();
      alert("⚠️ Please check if task was added. Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ----- Update Task -----
  const updateTask = async (id, updates) => {
    try {
      const res = await apiClient.put("todo.php", { id, ...updates }, {
        params: { user_id: userId }
      });
      const data = res.data;

      if (data.ok) {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
        alert("✅ Task updated successfully!");
      } else {
        alert(`❌ Failed to update task: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network or server error while updating task.");
    }
  };

  // ----- Delete Task -----
  const deleteTask = async (id) => {
    if (!window.confirm("🗑️ Are you sure you want to delete this task?")) return;
    try {
      const res = await apiClient.delete("todo.php", {
        data: { id },
        params: { user_id: userId }
      });
      const data = res.data;

      if (data.ok) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        alert("✅ Task deleted.");
      } else {
        alert(`❌ Failed to delete task: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error while deleting task.");
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingForm({ ...task });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateTask(editingId, editingForm);
    setEditingId(null);
    setEditingForm(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm(null);
  };

  const TYPE_COLORS = {
    assignment: { color: "#a78bfa", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
    report:     { color: "#22d3ee", bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.3)" },
    exam:       { color: "#fb7185", bg: "rgba(244,63,94,0.12)",  border: "rgba(244,63,94,0.3)" },
    class_test: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
    midterm:    { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
    final:      { color: "#fb7185", bg: "rgba(244,63,94,0.15)",  border: "rgba(244,63,94,0.4)" },
    default:    { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" },
  };
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "0.625rem 1rem", borderRadius: "0.75rem", fontSize: "0.875rem", width: "100%", outline: "none" };

  const completedCount = todos.filter(t => t.status === "completed").length;
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="min-h-screen relative" style={{ background: "#08090e" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #34d399, transparent)", filter: "blur(80px)" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <main className="pb-16 relative z-10" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">

          {/* Header + Progress */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-black tracking-tighter" style={{ background: "linear-gradient(135deg, #f1f5f9, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Task Planner
              </h1>
              <p className="text-sm mt-1" style={{ color: "#475569" }}>Organize assignments, reports, and exams</p>
            </div>
            {todos.length > 0 && (
              <div className="text-right">
                <p className="text-3xl font-display font-black" style={{ color: "#34d399" }}>{progress}%</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: "#475569" }}>Completed</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {todos.length > 0 && (
            <div className="h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
            </div>
          )}

          {/* Add Task Form */}
          {userId && (
            <div className="p-6 rounded-2xl mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "#475569" }}>Add New Task</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { placeholder: "Task title *", key: "title" },
                  { placeholder: "Description", key: "description" },
                ].map(({ placeholder, key }) => (
                  <input key={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                ))}
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {["default","assignment","report","exam","class_test","midterm","final"].map(t => (
                    <option key={t} value={t} style={{ background: "#0d0f1a" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace("_"," ")}
                    </option>
                  ))}
                </select>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={saveTask} disabled={loading || !userId}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
                  {loading ? "Saving..." : "+ Add Task"}
                </button>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#334155" }}>
                  {userId ? "No tasks yet — start above 👆" : "Please log in to see your tasks"}
                </p>
              </div>
            ) : todos.filter(t => t.status !== "completed").map((t) => {
              const tc = TYPE_COLORS[t.type] || TYPE_COLORS.default;
              return editingId === t.id ? (
                <div key={t.id} className="p-5 rounded-2xl" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {["title","description"].map(k => (
                      <input key={k} value={editingForm[k] || ""} onChange={(e) => setEditingForm({ ...editingForm, [k]: e.target.value })}
                        placeholder={k.charAt(0).toUpperCase() + k.slice(1)} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                      />
                    ))}
                    <select value={editingForm.type} onChange={(e) => setEditingForm({ ...editingForm, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["default","assignment","report","exam","class_test","midterm","final"].map(tp => (
                        <option key={tp} value={tp} style={{ background: "#0d0f1a" }}>{tp}</option>
                      ))}
                    </select>
                    <input type="date" value={editingForm.due_date || ""} onChange={(e) => setEditingForm({ ...editingForm, due_date: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                    <input type="time" value={editingForm.due_time || ""} onChange={(e) => setEditingForm({ ...editingForm, due_time: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.4)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <button onClick={saveEdit} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>Save</button>
                    <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-center px-5 py-4 rounded-2xl transition-all duration-200 group/task"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${tc.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${tc.bg}`; e.currentTarget.style.borderColor = tc.border; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderLeftColor = tc.color; }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                        {t.type.replace("_"," ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: "#e2e8f0" }}>{t.title}</h3>
                    {t.description && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{t.description}</p>}
                    <p className="text-xs mt-1" style={{ color: "#334155" }}>{t.due_date || "No date"} {t.due_time}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200">
                    <button onClick={() => updateTask(t.id, { ...t, status: "completed" })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>Done</button>
                    <button onClick={() => startEditing(t)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>Edit</button>
                    <button onClick={() => deleteTask(t.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185", border: "1px solid rgba(244,63,94,0.2)" }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed Tasks */}
          {todos.some(t => t.status === "completed") && (
            <div className="mt-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: "#334155" }}>Completed</h2>
              <div className="space-y-2">
                {todos.filter(t => t.status === "completed").map(t => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
                        <span className="text-[10px]" style={{ color: "#34d399" }}>✓</span>
                      </div>
                      <span className="text-sm line-through" style={{ color: "#334155" }}>{t.title}</span>
                    </div>
                    <button onClick={() => updateTask(t.id, { ...t, status: "pending" })}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all duration-200"
                      style={{ color: "#475569", border: "1px solid rgba(255,255,255,0.06)" }}>Undo</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer sidebarWidth={sidebarWidth} />
    </div>
  );
}