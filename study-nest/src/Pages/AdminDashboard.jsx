// src/pages/AdminDashboard.jsx

import React, { useState, useEffect } from "react";
import Footer from "../Components/Footer";
import { Link } from "react-router-dom";

/** ---------- THEME HELPERS (updated to slate + cyan/blue from Home.jsx) ---------- */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-slate-800/60 border border-slate-700 text-slate-200",
    accent: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300",
    success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300",
    warn: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    special: "bg-white/10 border border-white/20 text-white",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{children}</span>;
};

/**
 * StudyNest — Admin Dashboard
 * -------------------------------------------------------------
 * This is a conceptual frontend component for an admin dashboard.
 * It is a mock-up and will require a full backend implementation
 * for user authentication and data management.
 *
 * It includes sections for:
 * - User Management (mock)
 * - Content Moderation (mock)
 * - Site Analytics (mock)
 */

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock data for the dashboard
  const [mockUsers, setMockUsers] = useState([
    { id: 1, name: "Ayesha", email: "ayesha@uiu.ac.bd", status: "Active", role: "User" },
    { id: 2, name: "Siam", email: "siam@uiu.ac.bd", status: "Active", role: "User" },
    { id: 3, name: "Admin User", email: "admin@uiu.ac.bd", status: "Active", role: "Admin" },
  ]);
  const [mockContent, setMockContent] = useState([
    { id: 101, type: "Note", title: "CSE220 Final Exam Notes", author: "Farhan Fuad", status: "Active", reports: 0 },
    { id: 102, type: "Resource", title: "DBMS Cheatsheet", author: "Mahmudul Hasan", status: "Reported", reports: 2 },
    { id: 103, type: "Q&A", title: "Dijkstra's Algorithm Proof", author: "Anonymous", status: "Active", reports: 0 },
  ]);

  const handleStatusChange = (id, type) => {
    if (type === "user") {
      setMockUsers(prev => prev.map(user => 
        user.id === id ? { ...user, status: user.status === "Active" ? "Banned" : "Active" } : user
      ));
    } else if (type === "content") {
      setMockContent(prev => prev.map(content =>
        content.id === id ? { ...content, status: content.status === "Active" ? "Flagged" : "Active" } : content
      ));
    }
  };

  const deleteItem = (id, type) => {
    if (type === "user") {
      setMockUsers(prev => prev.filter(user => user.id !== id));
    } else if (type === "content") {
      setMockContent(prev => prev.filter(content => content.id !== id));
    }
  };

  const renderContent = () => {
    // Filter logic based on the search query
    const filteredUsers = mockUsers.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredContent = mockContent.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (activeTab) {
      case "analytics":
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-zinc-900">Analytics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Users" value="1,245" />
              <StatCard title="New Signups (30d)" value="89" />
              <StatCard title="Active Rooms" value="12" />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow ring-1 ring-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Activity Chart (Mock)</h3>
              <div className="mt-4 h-64 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                Placeholder for a chart
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
                placeholder="Search users..."
                className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <table className="min-w-full bg-white rounded-2xl shadow ring-1 ring-zinc-200">
              <thead className="border-b border-zinc-200">
                <tr className="text-left text-sm font-medium text-zinc-600">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.role}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button onClick={() => handleStatusChange(user.id, "user")} className="text-sm text-blue-600 hover:underline">
                        {user.status === "Active" ? "Ban" : "Unban"}
                      </button>
                      <button onClick={() => deleteItem(user.id, "user")} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
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
                placeholder="Search content..."
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
                  <tr key={item.id} className="text-sm text-zinc-800">
                    <td className="px-6 py-4">{item.type}</td>
                    <td className="px-6 py-4">{item.title}</td>
                    <td className="px-6 py-4">{item.author}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button onClick={() => handleStatusChange(item.id, "content")} className="text-sm text-blue-600 hover:underline">
                        {item.status === "Active" ? "Flag" : "Unflag"}
                      </button>
                      <button onClick={() => deleteItem(item.id, "content")} className="text-sm text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
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
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg transition-all duration-300 ease-in-out">
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
            <Link to="/" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">Logout</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs for navigation */}
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "analytics" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "users" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`rounded-xl px-3 py-1.5 font-semibold ${activeTab === "content" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}
          >
            Content
          </button>
        </div>

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