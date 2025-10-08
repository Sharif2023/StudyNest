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

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
function DebouncedSearchBar({ initial = "", onDebouncedChange, placeholder }) {
  const [text, setText] = React.useState(initial);

  // Push value up only after the user stops typing
  React.useEffect(() => {
    const t = setTimeout(() => onDebouncedChange(text), 300);
    return () => clearTimeout(t);
  }, [text, onDebouncedChange]);

  return (
    <div className="relative w-full max-w-xs">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-2
                   text-sm text-zinc-900 placeholder-zinc-400
                   focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                   shadow-sm transition"
      />
    </div>
  );
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

  const [groupSearch, setGroupSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const debouncedGroupSearch = useDebounce(groupSearch, 300);
  const debouncedRequestSearch = useDebounce(requestSearch, 300);
  const [previewUrl, setPreviewUrl] = useState(null);


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

  const deleteGroup = async (id) => {
    if (!window.confirm("Delete this group? All members and messages will be removed.")) return;
    const r = await apiPost("delete_group", ADMIN_LINK_KEY, { id });
    if (r.ok) {
      setGroups(prev => prev.filter(g => g.id !== id));
      alert("Group deleted");
    }
  };

  const deleteMember = async (memberId, groupId) => {
    if (!window.confirm("Remove this member from the group?")) return;
    const r = await apiPost("delete_member", ADMIN_LINK_KEY, { id: memberId });
    if (r.ok) {
      setMembers(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(m => m.id !== memberId)
      }));
      alert("Member removed");
    }
  };

  const deleteAllGroups = async () => {
    if (!window.confirm("⚠️ Are you sure? This will delete ALL groups, members, and messages!")) return;
    const r = await apiPost("delete_all_groups", ADMIN_LINK_KEY, {});
    if (r.ok) {
      setGroups([]);
      setMembers({});
      alert("All groups deleted");
    }
  };

  const deleteAllRequests = async () => {
    if (!window.confirm("⚠️ Are you sure? This will delete ALL pending join requests!")) return;
    const r = await apiPost("delete_all_requests", ADMIN_LINK_KEY, {});
    if (r.ok) {
      setRequests([]);
      alert("All pending requests deleted");
    }
  };

  /** -------------groupchat ------------------ */
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState({}); // { groupId: [members] }

  async function loadGroups() {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_groups", ADMIN_LINK_KEY);
      if (!r.ok) throw new Error(r.error || "Failed to load groups");
      setGroups(r.groups || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadRequests() {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_requests", ADMIN_LINK_KEY);
      if (!r.ok) throw new Error(r.error || "Failed to load requests");
      setRequests(r.requests || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const approveRequest = async (id, status) => {
    const r = await apiPost("approve_member", ADMIN_LINK_KEY, { id, status });
    if (r.ok) {
      setRequests(prev => prev.filter(req => req.id !== id));
    }
  };

  const loadMembers = async (groupId) => {
    const r = await apiGet("list_members", ADMIN_LINK_KEY, { group_id: groupId });
    if (r.ok) {
      setMembers(prev => ({ ...prev, [groupId]: r.members }));
    }
  };

  const uploadCSV = async (file) => {
    const formData = new FormData();
    formData.append("csv", file);
    const res = await fetch(`${API_BASE}?action=upload_csv&k=${ADMIN_LINK_KEY}`, {
      method: "POST",
      body: formData,
    });
    const j = await res.json();
    if (j.ok) {
      alert(`✅ ${j.created} groups created from CSV`);
      loadGroups();
    } else {
      alert("❌ Upload failed: " + (j.error || "unknown"));
    }
  };

  const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative w-full max-w-xs">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 pl-9 pr-3 py-2 
                 text-sm text-zinc-900 placeholder-zinc-400
                 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
                 shadow-sm transition"
      />
    </div>
  );


  /** -------- Boot + tab switching -------- */
  useEffect(() => {
    if (activeTab === "analytics") loadStats();
    if (activeTab === "users") loadUsers(searchQuery);
    if (activeTab === "content") loadContent(searchQuery);
    if (activeTab === "groups") {
      loadGroups();
      loadRequests();
    }
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
      case "groups":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">Groups Management</h2>

            {/* Upload CSV */}
            <div className="bg-white p-4 rounded-2xl shadow mb-6">
              <h3 className="font-semibold mb-2">Upload Class Routine CSV</h3>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    uploadCSV(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
                className="block w-full text-sm text-zinc-700 file:mr-3 file:py-2 file:px-4 
                     file:rounded-lg file:border-0 file:text-sm 
                     file:font-semibold file:bg-emerald-50 file:text-emerald-700 
                     hover:file:bg-emerald-100"
              />
            </div>

            {/* Pending requests */}
            <div className="bg-white p-4 rounded-2xl shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Pending Join Requests</h3>
                <div className="flex items-center gap-3">
                  <DebouncedSearchBar
                    initial={requestSearch}
                    onDebouncedChange={setRequestSearch}
                    placeholder="Search requests…"
                  />
                  <button
                    onClick={deleteAllRequests}
                    className="min-w-[180px] px-4 py-2 text-sm font-medium rounded-lg 
                 bg-gradient-to-r from-amber-600 to-yellow-600 text-white 
                 hover:from-amber-500 hover:to-yellow-500 
                 focus:outline-none focus:ring-2 focus:ring-amber-400/50
                 shadow-sm transition flex items-center justify-center gap-1"
                  >
                    🗑️ Delete All Requests
                  </button>
                </div>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">User</th>
                    <th className="px-2 py-1">ID</th>
                    <th className="px-2 py-1">Group</th>
                    <th className="px-2 py-1">Proof</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="px-2 py-1">{r.username}</td>
                      <td className="px-2 py-1">{r.student_id}</td>
                      <td className="px-2 py-1">{r.section_name}</td>
                      <td className="px-2 py-1">
                        {r.proof_url ? (
                          <button
                            onClick={() => setPreviewUrl(r.proof_url)}
                            className="text-blue-500 hover:underline"
                          >
                            Preview
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-1">{r.status}</td>
                      <td className="px-2 py-1 space-x-2">
                        <button
                          onClick={() => approveRequest(r.id, "accepted")}
                          className="text-green-600 hover:underline"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => approveRequest(r.id, "rejected")}
                          className="text-red-600 hover:underline"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewUrl && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto relative">
                    <button
                      onClick={() => setPreviewUrl(null)}
                      className="absolute top-2 right-2 text-red-600 text-lg font-bold"
                    >
                      ✕
                    </button>

                    {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={previewUrl}
                        alt="Routine Proof"
                        className="max-w-full max-h-[85vh] object-contain"
                      />
                    ) : previewUrl.match(/\.pdf$/i) ? (
                      <iframe
                        src={previewUrl}
                        title="PDF Preview"
                        className="w-full h-[85vh]"
                      />
                    ) : (
                      <div className="p-6 text-center text-gray-600">
                        <p>Preview not available for this file type.</p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Download Instead
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


            {/* Groups List with Members */}
            <div className="bg-white p-4 rounded-2xl shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">All Groups</h3>
                <div className="flex items-center gap-3">
                  <DebouncedSearchBar
                    initial={groupSearch}
                    onDebouncedChange={setGroupSearch}
                    placeholder="Search groups…"
                  />
                  <button
                    onClick={deleteAllGroups}
                    className="min-w-[180px] px-4 py-2 text-sm font-medium rounded-lg 
                 bg-gradient-to-r from-rose-600 to-red-600 text-white 
                 hover:from-rose-500 hover:to-red-500 
                 focus:outline-none focus:ring-2 focus:ring-rose-400/50
                 shadow-sm transition flex items-center justify-center gap-1"
                  >
                    🗑️ Delete All Groups
                  </button>
                </div>
              </div>

              <ul className="space-y-3">
                {groups
                  .filter((g) =>
                    g.section_name.toLowerCase().includes(groupSearch.toLowerCase())
                  )
                  .map((g) => (
                    <li key={g.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{g.section_name}</span>
                          <span className="ml-2 text-xs text-zinc-500">{g.created_at}</span>
                        </div>
                        <div className="space-x-3">
                          <button
                            onClick={() => loadMembers(g.id)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Members
                          </button>
                          <button
                            onClick={() => deleteGroup(g.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete Group
                          </button>
                        </div>
                      </div>

                      {members[g.id] && (
                        <table className="mt-2 w-full text-sm border-t">
                          <thead>
                            <tr className="text-left text-xs text-zinc-500">
                              <th className="px-2 py-1">Name</th>
                              <th className="px-2 py-1">Email</th>
                              <th className="px-2 py-1">Joined</th>
                              <th className="px-2 py-1">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members[g.id].map((m) => (
                              <tr key={m.id}>
                                <td className="px-2 py-1">{m.username}</td>
                                <td className="px-2 py-1">{m.email}</td>
                                <td className="px-2 py-1 text-xs">{m.joined_at}</td>
                                <td className="px-2 py-1">
                                  <button
                                    onClick={() => deleteMember(m.id, g.id)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {members[g.id].length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-2 py-2 text-zinc-500">
                                  No members yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </li>
                  ))}
                {groups.length === 0 && <li>No groups yet.</li>}
              </ul>

            </div>
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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#001D35] text-[#001D35] font-bold">
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
          <button
            onClick={() => setActiveTab("analytics")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "analytics"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            Analytics
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "users"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            Users
          </button>

          <button
            onClick={() => setActiveTab("content")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "content"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            Content
          </button>

          {/* 🔹 NEW TAB BUTTON */}
          <button
            onClick={() => setActiveTab("groups")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "groups"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            Groups
          </button>
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
