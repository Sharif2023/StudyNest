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
  
  // Course and section management data
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  
  // Form states
  const [showTermForm, setShowTermForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showGroupChatForm, setShowGroupChatForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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

  async function loadTerms() {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_terms", ADMIN_LINK_KEY);
      if (!r.ok) throw new Error(r.error || "Failed to load terms");
      setTerms(r.terms || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadCourses() {
    setErr(""); setLoading(true);
    try {
      const r = await apiGet("list_courses", ADMIN_LINK_KEY);
      if (!r.ok) throw new Error(r.error || "Failed to load courses");
      setCourses(r.courses || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadSections(termId = null, courseId = null) {
    setErr(""); setLoading(true);
    try {
      const params = {};
      if (termId) params.term_id = termId;
      if (courseId) params.course_id = courseId;
      
      const r = await apiGet("list_course_sections", ADMIN_LINK_KEY, params);
      if (!r.ok) throw new Error(r.error || "Failed to load sections");
      setSections(r.sections || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadGroupChats(courseSectionId = null) {
    setErr(""); setLoading(true);
    try {
      const params = {};
      if (courseSectionId) params.course_section_id = courseSectionId;
      
      const r = await apiGet("list_group_chats", ADMIN_LINK_KEY, params);
      if (!r.ok) throw new Error(r.error || "Failed to load group chats");
      setGroupChats(r.group_chats || []);
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

  // Term management actions
  const createTerm = async (termData) => {
    const r = await apiPost("create_term", ADMIN_LINK_KEY, termData);
    if (r.ok) {
      loadTerms();
      setShowTermForm(false);
    }
    return r;
  };

  const updateTerm = async (id, termData) => {
    const r = await apiPost("update_term", ADMIN_LINK_KEY, { id, ...termData });
    if (r.ok) {
      loadTerms();
      setEditingItem(null);
    }
    return r;
  };

  const deleteTerm = async (id) => {
    const r = await apiPost("delete_term", ADMIN_LINK_KEY, { id });
    if (r.ok) loadTerms();
    return r;
  };

  // Section management actions
  const createSection = async (sectionData) => {
    const r = await apiPost("create_course_section", ADMIN_LINK_KEY, sectionData);
    if (r.ok) {
      loadSections();
      setShowSectionForm(false);
    }
    return r;
  };

  const createSectionsForCourse = async (courseId, termId, sections, instructorName, maxStudents) => {
    const r = await apiPost("create_sections_for_course", ADMIN_LINK_KEY, {
      course_id: courseId,
      term_id: termId,
      sections: sections,
      instructor_name: instructorName,
      max_students: maxStudents
    });
    if (r.ok) loadSections();
    return r;
  };

  const updateSection = async (id, sectionData) => {
    const r = await apiPost("update_course_section", ADMIN_LINK_KEY, { id, ...sectionData });
    if (r.ok) {
      loadSections();
      setEditingItem(null);
    }
    return r;
  };

  const deleteSection = async (id) => {
    const r = await apiPost("delete_course_section", ADMIN_LINK_KEY, { id });
    if (r.ok) loadSections();
    return r;
  };

  // Group chat management actions
  const createGroupChat = async (chatData) => {
    const r = await apiPost("create_group_chat", ADMIN_LINK_KEY, chatData);
    if (r.ok) {
      loadGroupChats();
      setShowGroupChatForm(false);
    }
    return r;
  };

  const createGroupChatsForSections = async (courseSectionIds, createdBy) => {
    const r = await apiPost("create_group_chats_for_sections", ADMIN_LINK_KEY, {
      course_section_ids: courseSectionIds,
      created_by: createdBy
    });
    if (r.ok) loadGroupChats();
    return r;
  };

  const updateGroupChat = async (id, chatData) => {
    const r = await apiPost("update_group_chat", ADMIN_LINK_KEY, { id, ...chatData });
    if (r.ok) {
      loadGroupChats();
      setEditingItem(null);
    }
    return r;
  };

  const deleteGroupChat = async (id) => {
    const r = await apiPost("delete_group_chat", ADMIN_LINK_KEY, { id });
    if (r.ok) loadGroupChats();
    return r;
  };

  /** -------- Boot + tab switching -------- */
  useEffect(() => {
    if (activeTab === "analytics") loadStats();
    if (activeTab === "users") loadUsers(searchQuery);
    if (activeTab === "content") loadContent(searchQuery);
    if (activeTab === "terms") loadTerms();
    if (activeTab === "sections") {
      loadTerms();
      loadCourses();
      loadSections();
    }
    if (activeTab === "group-chats") {
      loadGroupChats();
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
      case "terms":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Academic Terms Management</h2>
              <button
                onClick={() => setShowTermForm(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add New Term
              </button>
            </div>

            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Term Name</th>
                  <th className="px-6 py-3">Term Code</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {terms.map(term => (
                  <tr key={term.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{term.term_name}</td>
                    <td className="px-6 py-4">{term.term_code}</td>
                    <td className="px-6 py-4">{new Date(term.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{new Date(term.end_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${term.is_active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-800"}`}>
                        {term.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button onClick={() => setEditingItem(term)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => deleteTerm(term.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && (
                  <tr><td className="px-6 py-6 text-sm text-zinc-500" colSpan={6}>No terms found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case "sections":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Course Sections Management</h2>
              <button
                onClick={() => setShowSectionForm(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add New Section
              </button>
            </div>

            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Section</th>
                  <th className="px-6 py-3">Term</th>
                  <th className="px-6 py-3">Instructor</th>
                  <th className="px-6 py-3">Max Students</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {sections.map(section => (
                  <tr key={section.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{section.course_code} - {section.course_title}</td>
                    <td className="px-6 py-4">{section.section_name}</td>
                    <td className="px-6 py-4">{section.term_name}</td>
                    <td className="px-6 py-4">{section.instructor_name || "-"}</td>
                    <td className="px-6 py-4">{section.max_students}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${section.is_active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-800"}`}>
                        {section.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button onClick={() => setEditingItem(section)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => deleteSection(section.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {sections.length === 0 && (
                  <tr><td className="px-6 py-6 text-sm text-zinc-500" colSpan={7}>No sections found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case "group-chats":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Group Chats Management</h2>
              <button
                onClick={() => setShowGroupChatForm(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add New Group Chat
              </button>
            </div>

            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Chat Name</th>
                  <th className="px-6 py-3">Course Section</th>
                  <th className="px-6 py-3">Created By</th>
                  <th className="px-6 py-3">Participants</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {groupChats.map(chat => (
                  <tr key={chat.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{chat.chat_name}</td>
                    <td className="px-6 py-4">{chat.course_code} - Section {chat.section_name}</td>
                    <td className="px-6 py-4">{chat.created_by_username}</td>
                    <td className="px-6 py-4">{chat.participant_count}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${chat.is_active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-800"}`}>
                        {chat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-3">
                      <button onClick={() => setEditingItem(chat)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => deleteGroupChat(chat.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {groupChats.length === 0 && (
                  <tr><td className="px-6 py-6 text-sm text-zinc-500" colSpan={6}>No group chats found.</td></tr>
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
          <button onClick={() => setActiveTab("terms")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "terms" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Terms</button>
          <button onClick={() => setActiveTab("sections")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "sections" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Sections</button>
          <button onClick={() => setActiveTab("group-chats")} className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "group-chats" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>Group Chats</button>
        </div>

        {err && (<div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{err}</div>)}
        {loading && (<div className="mb-4 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 px-4 py-3 text-sm">Loading…</div>)}

        {renderContent()}
      </div>
      <Footer />

      {/* Term Form Modal */}
      {showTermForm && (
        <TermFormModal
          onClose={() => setShowTermForm(false)}
          onSubmit={createTerm}
          editingItem={editingItem}
          onUpdate={updateTerm}
        />
      )}

      {/* Section Form Modal */}
      {showSectionForm && (
        <SectionFormModal
          onClose={() => setShowSectionForm(false)}
          onSubmit={createSection}
          editingItem={editingItem}
          onUpdate={updateSection}
          terms={terms}
          courses={courses}
          onCreateSectionsForCourse={createSectionsForCourse}
        />
      )}

      {/* Group Chat Form Modal */}
      {showGroupChatForm && (
        <GroupChatFormModal
          onClose={() => setShowGroupChatForm(false)}
          onSubmit={createGroupChat}
          editingItem={editingItem}
          onUpdate={updateGroupChat}
          sections={sections}
          onCreateGroupChatsForSections={createGroupChatsForSections}
        />
      )}
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

// Term Form Modal Component
const TermFormModal = ({ onClose, onSubmit, editingItem, onUpdate }) => {
  const [formData, setFormData] = useState({
    term_name: '',
    term_code: '',
    start_date: '',
    end_date: '',
    is_active: false
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        term_name: editingItem.term_name || '',
        term_code: editingItem.term_code || '',
        start_date: editingItem.start_date || '',
        end_date: editingItem.end_date || '',
        is_active: editingItem.is_active || false
      });
    }
  }, [editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingItem) {
      await onUpdate(editingItem.id, formData);
    } else {
      await onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {editingItem ? 'Edit Term' : 'Add New Term'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
            <input
              type="text"
              value={formData.term_name}
              onChange={(e) => setFormData({...formData, term_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term Code</label>
            <input
              type="text"
              value={formData.term_code}
              onChange={(e) => setFormData({...formData, term_code: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active Term</label>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Section Form Modal Component
const SectionFormModal = ({ onClose, onSubmit, editingItem, onUpdate, terms, courses, onCreateSectionsForCourse }) => {
  const [formData, setFormData] = useState({
    course_id: '',
    section_name: '',
    term_id: '',
    instructor_name: '',
    max_students: 50,
    is_active: true
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [sectionsList, setSectionsList] = useState('');

  useEffect(() => {
    if (editingItem) {
      setFormData({
        course_id: editingItem.course_id || '',
        section_name: editingItem.section_name || '',
        term_id: editingItem.term_id || '',
        instructor_name: editingItem.instructor_name || '',
        max_students: editingItem.max_students || 50,
        is_active: editingItem.is_active || true
      });
    }
  }, [editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bulkMode) {
      const sections = sectionsList.split(',').map(s => s.trim()).filter(s => s);
      await onCreateSectionsForCourse(
        formData.course_id,
        formData.term_id,
        sections,
        formData.instructor_name,
        formData.max_students
      );
    } else if (editingItem) {
      await onUpdate(editingItem.id, formData);
    } else {
      await onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {editingItem ? 'Edit Section' : 'Add New Section'}
        </h3>
        
        {!editingItem && (
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Bulk Create Sections</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({...formData, course_id: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Select Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.course_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={formData.term_id}
              onChange={(e) => setFormData({...formData, term_id: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Select Term</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.term_name} ({term.term_code})
                </option>
              ))}
            </select>
          </div>

          {bulkMode && !editingItem ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Names (comma-separated)</label>
              <input
                type="text"
                value={sectionsList}
                onChange={(e) => setSectionsList(e.target.value)}
                placeholder="A, B, C, D"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
              <input
                type="text"
                value={formData.section_name}
                onChange={(e) => setFormData({...formData, section_name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructor Name</label>
            <input
              type="text"
              value={formData.instructor_name}
              onChange={(e) => setFormData({...formData, instructor_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
            <input
              type="number"
              value={formData.max_students}
              onChange={(e) => setFormData({...formData, max_students: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              min="1"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              {editingItem ? 'Update' : bulkMode ? 'Create Sections' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Group Chat Form Modal Component
const GroupChatFormModal = ({ onClose, onSubmit, editingItem, onUpdate, sections, onCreateGroupChatsForSections }) => {
  const [formData, setFormData] = useState({
    chat_name: '',
    course_section_id: '',
    description: '',
    is_active: true
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        chat_name: editingItem.chat_name || '',
        course_section_id: editingItem.course_section_id || '',
        description: editingItem.description || '',
        is_active: editingItem.is_active || true
      });
    }
  }, [editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (bulkMode) {
      await onCreateGroupChatsForSections(selectedSections, 1); // Assuming admin user ID is 1
    } else if (editingItem) {
      await onUpdate(editingItem.id, formData);
    } else {
      await onSubmit({...formData, created_by: 1}); // Assuming admin user ID is 1
    }
  };

  const toggleSection = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {editingItem ? 'Edit Group Chat' : 'Add New Group Chat'}
        </h3>
        
        {!editingItem && (
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Bulk Create Group Chats</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {bulkMode && !editingItem ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Course Sections</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                {sections.map(section => (
                  <label key={section.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {section.course_code} - Section {section.section_name} ({section.term_name})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chat Name</label>
                <input
                  type="text"
                  value={formData.chat_name}
                  onChange={(e) => setFormData({...formData, chat_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Section</label>
                <select
                  value={formData.course_section_id}
                  onChange={(e) => setFormData({...formData, course_section_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Course Section</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.course_code} - Section {section.section_name} ({section.term_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              {editingItem ? 'Update' : bulkMode ? 'Create Group Chats' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
