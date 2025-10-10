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
    <div className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-all duration-500">
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      <main className="pt-10 pb-16" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header Title */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                To-Do List
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Organize your assignments, reports, and exams in one place.
              </p>
            </div>
          </div>

          {/* Task Creation Card */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/80 backdrop-blur shadow-lg ring-1 ring-zinc-200 dark:ring-slate-800 p-6 mb-10 transition-all">
            <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-100">
              Add New Task
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Task title"
                className="rounded-xl border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="rounded-xl border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="rounded-xl border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="rounded-xl border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="rounded-xl border border-zinc-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={saveTask}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white hover:from-cyan-500 hover:to-blue-500 transition-colors shadow-md"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Task List */}
          <ul className="space-y-3">
            {todos.length === 0 && (
              <li className="rounded-xl border border-dashed border-zinc-300 dark:border-slate-700 px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No tasks yet — start by adding one above 👆
              </li>
            )}

            {todos.map((t) =>
              editingId === t.id ? (
                <li
                  key={t.id}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 shadow ring-1 ring-zinc-200 dark:ring-slate-700"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <input
                      value={editingForm.title}
                      onChange={(e) =>
                        setEditingForm({ ...editingForm, title: e.target.value })
                      }
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <input
                      value={editingForm.description}
                      onChange={(e) =>
                        setEditingForm({
                          ...editingForm,
                          description: e.target.value,
                        })
                      }
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <select
                      value={editingForm.type}
                      onChange={(e) =>
                        setEditingForm({ ...editingForm, type: e.target.value })
                      }
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
                      onChange={(e) =>
                        setEditingForm({
                          ...editingForm,
                          due_date: e.target.value,
                        })
                      }
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                    <input
                      type="time"
                      value={editingForm.due_time || ""}
                      onChange={(e) =>
                        setEditingForm({
                          ...editingForm,
                          due_time: e.target.value,
                        })
                      }
                      className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-xl bg-zinc-500 px-3 py-1.5 text-sm text-white hover:bg-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li
                  key={t.id}
                  className="rounded-xl bg-white dark:bg-slate-900/90 px-5 py-4 shadow ring-1 ring-zinc-200 dark:ring-slate-700 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3
                        className={`font-semibold text-base ${
                          t.status === "completed"
                            ? "line-through text-zinc-400"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {t.title}
                      </h3>
                      {t.description && (
                        <p className="text-xs text-zinc-500">{t.description}</p>
                      )}
                      <p className="text-xs text-zinc-400">
                        {t.type} • {t.due_date || "No date"} {t.due_time || ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateTask(t.id, {
                            ...t,
                            status:
                              t.status === "completed" ? "pending" : "completed",
                          })
                        }
                        className="text-xs rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                      >
                        {t.status === "completed" ? "Undo" : "Done"}
                      </button>
                      <button
                        onClick={() => startEditing(t)}
                        className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="text-xs rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>

          {/* Completed Tasks */}
          {todos.some((t) => t.status === "completed") && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
                Completed Tasks
              </h2>
              <ul className="space-y-2">
                {todos
                  .filter((t) => t.status === "completed")
                  .map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      ✅ {t.title} — {t.due_date || "No date"} {t.due_time || ""}
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