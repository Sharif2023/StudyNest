// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";
import apiClient from "../apiConfig";
import { 
  Users, 
  MessageSquare, 
  Shield, 
  Search, 
  Activity, 
  Archive, 
  Terminal, 
  Settings as SettingsIcon, 
  Server
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { 
  AnalyticsModule, 
  UserManagementModule, 
  ContentFeedModule, 
  AuditLogsModule, 
  SystemHealthModule, 
  SettingsModule, 
  GroupsModule 
} from "../Components/Admin/AdminModules";

import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("analytics");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [content, setContent] = useState([]);
    const [groups, setGroups] = useState([]);
    const [requests, setRequests] = useState([]);
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState(null);
    const [settings, setSettings] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ SECURE ROUTE GUARD
    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("studynest.auth") || "{}");
        if (auth?.role?.toLowerCase() !== 'admin') {
            console.warn("Access denied: Admin role required.");
            navigate("/");
        }
    }, [navigate]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [s, u, c, g, r, l, h, set] = await Promise.all([
                apiClient.get("admin_api.php?action=stats"),
                apiClient.get("admin_api.php?action=list_users&q=" + searchTerm),
                apiClient.get("admin_api.php?action=list_content&q=" + searchTerm),
                apiClient.get("admin_api.php?action=list_groups"),
                apiClient.get("admin_api.php?action=list_requests"),
                apiClient.get("admin_api.php?action=audit_logs"),
                apiClient.get("admin_api.php?action=system_health"),
                apiClient.get("admin_api.php?action=list_settings")
            ]);
            if (s.data.ok) setStats(s.data.stats);
            if (u.data.ok) setUsers(u.data.users);
            if (c.data.ok) setContent(c.data.content);
            if (g.data.ok) setGroups(g.data.groups);
            if (r.data.ok) setRequests(r.data.requests);
            if (l.data.ok) setLogs(l.data.logs);
            if (h.data.ok) setHealth(h.data.health);
            if (set.data.ok) setSettings(set.data.settings);
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [searchTerm]);

    const handleAction = async (action, payload) => {
        try {
            const res = await apiClient.post(`admin_api.php?action=${action}`, payload);
            if (res.data.ok) fetchAll();
            else alert(res.data.error || "Action failed");
        } catch (e) {
            alert("Network error");
        }
    };

    const updateSetting = async (key, value) => {
        await handleAction("update_setting", { key, value });
    };

    // UI Renders
    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === id 
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 active-glow" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen relative" style={{ background: "#08090e", color: "#e2e8f0" }}>
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(100px)" }} />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(100px)" }} />
            </div>

            <Header sidebarWidth={0} navOpen={false} />

            <div className="relative z-10" style={{ paddingTop: 64 }}>
                <main className="p-8 max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="text-cyan-500" size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">System Control</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">
                                Admin <span className="text-gradient-brand">Dashboard</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl w-full md:w-auto">
                            <Search className="ml-3 text-slate-500" size={18} />
                            <input 
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm px-2 py-2 w-full md:w-64 text-white placeholder:text-slate-600 font-semibold uppercase tracking-wider"
                            />
                            {loading && <div className="mr-3 animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full" />}
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap gap-2 mb-12 border-b border-white/5 pb-6">
                        <TabButton id="analytics" label="Overview" icon={Activity} />
                        <TabButton id="users" label="User Management" icon={Users} />
                        <TabButton id="content" label="Content Feed" icon={Archive} />
                        <TabButton id="groups" label="Groups" icon={MessageSquare} />
                        <TabButton id="audit" label="Activity Logs" icon={Terminal} />
                        <TabButton id="system" label="System Health" icon={Server} />
                        <TabButton id="settings" label="Settings" icon={SettingsIcon} />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === "analytics" && <AnalyticsModule stats={stats} />}
                            {activeTab === "users" && <UserManagementModule users={users} handleAction={handleAction} />}
                            {activeTab === "content" && <ContentFeedModule content={content} handleAction={handleAction} />}
                            {activeTab === "audit" && <AuditLogsModule logs={logs} />}
                            {activeTab === "system" && <SystemHealthModule health={health} />}
                            {activeTab === "settings" && <SettingsModule settings={settings} updateSetting={updateSetting} />}
                             {activeTab === "groups" && (
                                <GroupsModule 
                                    requests={requests} 
                                    groups={groups} 
                                    handleAction={handleAction} 
                                    fetchAll={fetchAll} 
                                    apiClient={apiClient} 
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}