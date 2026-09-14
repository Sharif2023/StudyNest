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
    assignment: { color: "#00808C", bg: "rgba(0,128,140,0.1)", border: "rgba(0,128,140,0.2)" },
    report:     { color: "#001D36", bg: "rgba(0,29,54,0.05)",  border: "rgba(0,29,54,0.15)" },
    exam:       { color: "#E11D48", bg: "rgba(225,29,72,0.08)",  border: "rgba(225,29,72,0.2)" },
    class_test: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
    midterm:    { color: "#EA580C", bg: "rgba(234,88,12,0.08)", border: "rgba(234,88,12,0.2)" },
    final:      { color: "#BE123C", bg: "rgba(190,18,60,0.08)",  border: "rgba(190,18,60,0.2)" },
    default:    { color: "#66625C", bg: "rgba(102,98,92,0.08)", border: "rgba(102,98,92,0.15)" },
  };
  const inputStyle = { background: "#F0F4F8", border: "1px solid rgba(0,29,54,0.1)", color: "#001D36", padding: "0.75rem 1rem", borderRadius: "0.75rem", fontSize: "0.75rem", fontWeight: "bold", width: "100%", outline: "none", transition: "all 0.2s" };

  const completedCount = todos.filter(t => t.status === "completed").length;
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <div className="min-h-screen relative" style={{ background: "#F0F4F8" }}>
      {/* Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full opacity-[0.07]" style={{ background: "transparent", filter: "none" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-[0.05]" style={{ background: "transparent", filter: "none" }} />
      </div>

      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <main className="pb-16 relative z-10" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">

          {/* Header + Progress */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-black tracking-tighter" style={{ background: "transparent", color: "#001D36" }}>
                Task Planner
              </h1>
              <p className="text-sm mt-1" style={{ color: "#66625C", fontWeight: "bold" }}>Organize your study assignments and exams</p>
            </div>
            {todos.length > 0 && (
              <div className="text-right">
                <p className="text-3xl font-display font-black text-[#00808C]">{progress}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#66625C]">Completed</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {todos.length > 0 && (
            <div className="h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: "transparent" }} />
            </div>
          )}

          {/* Add Task Form */}
          {userId && (
            <div className="p-6 rounded-2xl mb-8 bg-white border border-[#001D36]/10 shadow-sm">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-[#66625C]">Add New Task</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { placeholder: "Task title *", key: "title" },
                  { placeholder: "Description", key: "description" },
                ].map(({ placeholder, key }) => (
                  <input key={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"}
                  />
                ))}
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  {["default","assignment","report","exam","class_test","midterm","final"].map(t => (
                    <option key={t} value={t} style={{ background: "white" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace("_"," ")}
                    </option>
                  ))}
                </select>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"}
                />
                <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"}
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={saveTask} disabled={loading || !userId}
                  className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-40 bg-[#001D36] text-white hover:bg-[#002b50] shadow-md">
                  {loading ? "Saving..." : "+ Add Task"}
                </button>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: "rgba(0,29,54,0.1)" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#66625C" }}>
                  {userId ? "No tasks yet — plan something above 👆" : "Please log in to see your tasks"}
                </p>
              </div>
            ) : todos.filter(t => t.status !== "completed").map((t) => {
              const tc = TYPE_COLORS[t.type] || TYPE_COLORS.default;
              return editingId === t.id ? (
                <div key={t.id} className="p-5 rounded-2xl bg-white shadow-sm border border-[#00808C]/30">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {["title","description"].map(k => (
                      <input key={k} value={editingForm[k] || ""} onChange={(e) => setEditingForm({ ...editingForm, [k]: e.target.value })}
                        placeholder={k.charAt(0).toUpperCase() + k.slice(1)} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"}
                      />
                    ))}
                    <select value={editingForm.type} onChange={(e) => setEditingForm({ ...editingForm, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["default","assignment","report","exam","class_test","midterm","final"].map(tp => (
                        <option key={tp} value={tp} style={{ background: "white" }}>{tp}</option>
                      ))}
                    </select>
                    <input type="date" value={editingForm.due_date || ""} onChange={(e) => setEditingForm({ ...editingForm, due_date: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"} onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"} />
                    <input type="time" value={editingForm.due_time || ""} onChange={(e) => setEditingForm({ ...editingForm, due_time: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(0,128,140,0.4)"} onBlur={e => e.target.style.borderColor = "rgba(0,29,54,0.1)"} />
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <button onClick={saveEdit} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00808C] text-white">Save</button>
                    <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F0F4F8] text-[#66625C]">Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-center px-5 py-4 rounded-2xl transition-all duration-200 group/task bg-white shadow-sm border border-[#001D36]/5"
                  style={{ borderLeft: `4px solid ${tc.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${tc.bg}`; e.currentTarget.style.borderColor = tc.border; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "rgba(0,29,54,0.05)"; e.currentTarget.style.borderLeftColor = tc.color; }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                        {t.type.replace("_"," ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#001D36]">{t.title}</h3>
                    {t.description && <p className="text-xs mt-1 text-[#66625C] font-medium">{t.description}</p>}
                    <p className="text-[11px] mt-1.5 font-bold uppercase tracking-widest text-[#001D36]/50">{t.due_date || "No date"} {t.due_time}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200">
                    <button onClick={() => updateTask(t.id, { ...t, status: "completed" })}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#8AB100] bg-[#8AB100]/10 border border-[#8AB100]/20 hover:bg-[#8AB100]/20">Done</button>
                    <button onClick={() => startEditing(t)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#001D36] bg-[#001D36]/5 border border-[#001D36]/10 hover:bg-[#001D36]/10">Edit</button>
                    <button onClick={() => deleteTask(t.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed Tasks */}
          {todos.some(t => t.status === "completed") && (
            <div className="mt-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 text-[#66625C]">Completed</h2>
              <div className="space-y-2">
                {todos.filter(t => t.status === "completed").map(t => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-4 rounded-xl bg-white/50 border border-[#001D36]/5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-[#8AB100]/10 border border-[#8AB100]/30">
                        <span className="text-[10px] text-[#8AB100] font-black">✓</span>
                      </div>
                      <span className="text-sm line-through text-[#66625C] font-bold">{t.title}</span>
                    </div>
                    <button onClick={() => updateTask(t.id, { ...t, status: "pending" })}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all duration-200 bg-[#F0F4F8] text-[#66625C] hover:bg-[#001D36]/10 border border-[#001D36]/5">Undo</button>
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
