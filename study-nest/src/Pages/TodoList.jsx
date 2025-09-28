// Pages/TodoList.jsx
import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

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

  const profile = JSON.parse(localStorage.getItem("studynest.profile") || "{}");
  const studentId = profile?.student_id || "—";

  useEffect(() => {
    if (!studentId || studentId === "—") return;
    fetch(`${API_BASE}/todo.php?student_id=${studentId}`)
      .then((r) => r.json())
      .then((data) => data.ok && setTodos(data.todos));
  }, [studentId]);

  const saveTask = async () => {
    if (!form.title.trim()) return;
    const res = await fetch(`${API_BASE}/todo.php?student_id=${studentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ok) {
      setTodos([{ id: data.id, ...form, status: "pending" }, ...todos]);
      setForm({ title: "", description: "", type: "default", due_date: "", due_time: "" });
    }
  };

  const updateTask = async (id, updates) => {
    const res = await fetch(`${API_BASE}/todo.php?student_id=${studentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (data.ok) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    }
  };

  const deleteTask = async (id) => {
    const res = await fetch(`${API_BASE}/todo.php?student_id=${studentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-900 dark:via-slate-950">
      <LeftNav navOpen={navOpen} setNavOpen={setNavOpen} anonymous={anonymous} setAnonymous={setAnonymous} sidebarWidth={sidebarWidth} />
      <Header sidebarWidth={sidebarWidth} />

      <main className="pt-6 pb-10" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Page heading */}
          <div className="mb-6 rounded-2xl bg-white/90 dark:bg-slate-900/60 p-5 shadow ring-1 ring-zinc-200 dark:ring-white/10">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">To-Do List</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Managing my tasks (My ID: {studentId})</p>
          </div>

          {/* Add task form */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow ring-1 ring-zinc-200 dark:ring-slate-700 p-5 mb-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Task title"
                className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
              />
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
              >
                <option value="default">Default</option>
                <option value="assignment">Assignment</option>
                <option value="report">Report</option>
                <option value="exam">Exam</option>
                <option value="class_test">Class Test</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
              />
              <input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={saveTask}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Task list */}
          <ul className="space-y-3">
            {todos.length === 0 && (
              <li className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-500 dark:border-slate-700">
                No tasks yet. Add one above 👆
              </li>
            )}

            {todos.map((t) =>
              editingId === t.id ? (
                <li key={t.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 shadow ring-1 ring-zinc-200 dark:ring-slate-700">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                      value={editingForm.title}
                      onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <input
                      value={editingForm.description}
                      onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <select
                      value={editingForm.type}
                      onChange={(e) => setEditingForm({ ...editingForm, type: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    >
                      <option value="default">Default</option>
                      <option value="assignment">Assignment</option>
                      <option value="report">Report</option>
                      <option value="exam">Exam</option>
                      <option value="class_test">Class Test</option>
                      <option value="midterm">Midterm</option>
                      <option value="final">Final</option>
                    </select>
                    <input
                      type="date"
                      value={editingForm.due_date || ""}
                      onChange={(e) => setEditingForm({ ...editingForm, due_date: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <input
                      type="time"
                      value={editingForm.due_time || ""}
                      onChange={(e) => setEditingForm({ ...editingForm, due_time: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={saveEdit} className="rounded-xl bg-emerald-600 px-3 py-1 text-sm text-white">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-xl bg-zinc-400 px-3 py-1 text-sm text-white">
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li
                  key={t.id}
                  className="rounded-xl bg-white dark:bg-slate-900 px-4 py-3 shadow ring-1 ring-zinc-200 dark:ring-slate-700"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3
                        className={`font-medium ${
                          t.status === "completed" ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {t.title}
                      </h3>
                      {t.description && <p className="text-xs text-zinc-500">{t.description}</p>}
                      <p className="text-xs text-zinc-400">
                        {t.type} • {t.due_date || "No date"} {t.due_time || ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateTask(t.id, { ...t, status: t.status === "completed" ? "pending" : "completed" })}
                        className="text-xs rounded-lg bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700"
                      >
                        {t.status === "completed" ? "Undo" : "Mark as done"}
                      </button>
                      <button
                        onClick={() => startEditing(t)}
                        className="text-xs rounded-lg bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="text-xs rounded-lg bg-rose-600 px-2 py-1 text-white hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>

          {/* History */}
          {todos.some((t) => t.status === "completed") && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Completed Tasks</h2>
              <ul className="space-y-2">
                {todos
                  .filter((t) => t.status === "completed")
                  .map((t) => (
                    <li key={t.id} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm">
                      {t.title} — {t.due_date || "No date"} {t.due_time || ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <Footer sidebarWidth={sidebarWidth} />
    </div>
  );
}
