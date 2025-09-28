// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import Footer from "../Components/Footer";
import { Link, useLocation } from "react-router-dom";

/** ---------- tiny API helper ---------- */
const API_BASE = "http://localhost/studynest/study-nest/src/api/admin_api.php";
const DEFAULT_LINK_KEY = "MYKEY123"; // must match PHP $ADMIN_LINK_KEY

// Allow ?k=... in URL to override (so you can share a secret link)
function useAdminKey() {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  return p.get("k") || DEFAULT_LINK_KEY;
}

async function apiGet(action, key, params = {}) {
  const qs = new URLSearchParams({ action, k: key, ...params }).toString();
  const res = await fetch(`${API_BASE}?${qs}`);
  return res.json(); // now it won’t choke on HTML because backend always returns JSON
}
async function apiPost(action, key, body = {}) {
  const res = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}&k=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** ---------- THEME HELPERS ---------- */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-slate-800/60 border border-slate-700 text-slate-200",
    accent: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300",
    success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300",
    warn: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    special: "bg-white/10 border-white/20 border text-white",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{children}</span>;
};

export default function AdminDashboard() {
  const ADMIN_LINK_KEY = useAdminKey();

  const [activeTab, setActiveTab] = useState("analytics");
  const [searchQuery, setSearchQuery] = useState("");

  // Live data
  const [stats, setStats] = useState({ total_users: 0, new_signups_30d: 0, active_rooms: 0 });
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  /** -------- Fetchers -------- */
  async function loadStats() {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("stats", ADMIN_LINK_KEY);
      if (!r.ok) throw new Error(r.error || "Failed to load stats");
      setStats(r.stats);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  async function loadUsers(q = "") {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_users", ADMIN_LINK_KEY, q ? { q } : {});
      if (!r.ok) throw new Error(r.error || "Failed to load users");
      setUsers(r.users || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  async function loadContent(q = "") {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_content", ADMIN_LINK_KEY, q ? { q } : {});
      if (!r.ok) throw new Error(r.error || "Failed to load content");
      setContent(r.content || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  /** -------- Actions -------- */
  const toggleUserStatus = async (id) => {
    const r = await apiPost("toggle_user_status", ADMIN_LINK_KEY, { id });
    if (r.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, status: r.new_status } : u));
  };
  const setUserRole = async (id, role) => {
    const r = await apiPost("set_user_role", ADMIN_LINK_KEY, { id, role });
    if (r.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, role: r.new_role } : u));
  };
  const deleteUser = async (id) => {
    const r = await apiPost("delete_user", ADMIN_LINK_KEY, { id });
    if (r.ok) setUsers(prev => prev.filter(u => u.id !== id));
  };

  const toggleContentStatus = async (row) => {
    if (row.type !== "Resource") return;
    const r = await apiPost("toggle_content_status", ADMIN_LINK_KEY, { id: row.id, type: "Resource" });
    if (r.ok) setContent(prev => prev.map(c => (c.id === row.id && c.type === "Resource") ? { ...c, status: r.new_status } : c));
  };
  const deleteContent = async (row) => {
    const r = await apiPost("delete_content", ADMIN_LINK_KEY, { id: row.id, type: row.type });
    if (r.ok) setContent(prev => prev.filter(c => !(c.id === row.id && c.type === row.type)));
  };

  /** -------- Boot + tab switching -------- */
  useEffect(() => {
    if (activeTab === "analytics") loadStats();
    if (activeTab === "users") loadUsers(searchQuery);
    if (activeTab === "content") loadContent(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ADMIN_LINK_KEY]);

  /** -------- Search debounce -------- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === "users") loadUsers(searchQuery);
      if (activeTab === "content") loadContent(searchQuery);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, ADMIN_LINK_KEY, activeTab]);

  const filteredUsers = useMemo(() => users, [users]);
  const filteredContent = useMemo(() => content, [content]);

  /** -------- Render -------- */
  const renderContent = () => {
    switch (activeTab) {
      case "analytics":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">Analytics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Users" value={stats.total_users.toLocaleString()} />
              <StatCard title="New Signups (30d)" value={stats.new_signups_30d.toLocaleString()} />
              <StatCard title="Active Rooms" value={stats.active_rooms.toLocaleString()} />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow ring-1 ring-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Activity (Coming soon)</h3>
              <div className="mt-4 h-64 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                Chart placeholder
              </div>
            </div>
          </div>
        );
      case "users":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">User Management</h2>

            <div className="relative mb-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name/email/role…"
                className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{user.username || user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded border px-2 py-1 text-sm"
                        value={user.role || 'User'}
                        onChange={(e) => setUserRole(user.id, e.target.value)}
                      >
                        <option>User</option>
                        <option>Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.status === "Banned" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button onClick={() => toggleUserStatus(user.id)} className="text-sm text-blue-600 hover:underline">
                        {(user.status || 'Active') === "Active" ? "Ban" : "Unban"}
                      </button>
                      <button onClick={() => deleteUser(user.id)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td className="px-6 py-6 text-sm text-zinc-500" colSpan={5}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case "content":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">Content Moderation</h2>

            <div className="relative mb-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content…"
                className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Author</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredContent.map(item => (
                  <tr key={`${item.type}-${item.id}`} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{item.type}</td>
                    <td className="px-6 py-4">{item.title}</td>
                    <td className="px-6 py-4">{item.author ?? "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === "Reported" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button
                        onClick={() => toggleContentStatus(item)}
                        disabled={item.type !== "Resource"}
                        title={item.type !== "Resource" ? "Only Resources support flag/unflag" : ""}
                        className={`text-sm ${item.type === "Resource" ? "text-blue-600 hover:underline" : "text-zinc-400 cursor-not-allowed"}`}
                      >
                        {item.status === "Active" ? "Flag" : "Unflag"}
                      </button>
                      <button onClick={() => deleteContent(item)} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredContent.length === 0 && (
                  <tr><td className="px-6 py-6 text-sm text-zinc-500" colSpan={5}>No content found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl">
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-white font-bold">
                <img src="src/assets/logo.png" alt="Study-Nest-Logo" className="h-7 w-7" />
              </span>
              <span className="font-semibold tracking-tight text-white">StudyNest</span>
            </Link>
            <Badge tone="special">Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-white font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 hover:text-black">Logout</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <button onClick={() => setActiveTab("analytics")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "analytics" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Analytics</button>
          <button onClick={() => setActiveTab("users")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "users" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Users</button>
          <button onClick={() => setActiveTab("content")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "content" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Content</button>
        </div>

        {err && (<div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{err}</div>)}
        {loading && (<div className="mb-4 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 px-4 py-3 text-sm">Loading…</div>)}

        {renderContent()}
      </div>
      <Footer />
    </main>
  );
}

const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow ring-1 ring-zinc-200 text-center">
    <div className="text-3xl font-bold text-emerald-600">{value}</div>
    <p className="mt-2 text-sm font-medium text-zinc-600">{title}</p>
  </div>
);

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}>
      <path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 10 4z" />
    </svg>
  );
}
