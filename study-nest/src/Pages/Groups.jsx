// src/pages/Groups.jsx
import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";
import apiClient from "../apiConfig";
import { 
  Users, 
  Search, 
  Upload, 
  X, 
  CheckCircle, 
  Clock, 
  Lock, 
  ArrowRight,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getAuthUser() {
    try {
        const raw = localStorage.getItem("studynest.auth");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function Groups() {
    const [groups, setGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [search, setSearch] = useState("");
    const [joinModal, setJoinModal] = useState({ open: false, groupId: null, sectionName: "" });
    const [proofFile, setProofFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const me = getAuthUser();

    const fetchAll = () => {
        apiClient.get("group_api.php", { params: { action: "my_groups" } })
            .then((res) => { if (res.data.ok) setMyGroups(res.data.groups); });

        apiClient.get("admin_api.php", { params: { action: "list_groups", k: "MYKEY123" } })
            .then((res) => { if (res.data.ok) setGroups(res.data.groups); });
    };

    useEffect(() => { fetchAll(); }, []);

    const cancelRequest = async (id) => {
        if (!confirm("Cancel this join request?")) return;
        const res = await apiClient.post("group_api.php", { group_id: id }, { params: { action: "cancel_request" } });
        if (res.data.ok) fetchAll();
    };

    const myStatus = (id) => myGroups.find((g) => g.id === id)?.status || null;

    const getCourseCode = (sectionName) => {
        const parts = sectionName.split(" / ");
        return parts[1] || "";
    };

    const joinedCourses = new Set(
        myGroups
            .filter((g) => g.status === "accepted" || g.status === "pending")
            .map((g) => getCourseCode(g.section_name))
    );

    const handleJoinSubmit = async () => {
        if (!proofFile) return alert("Please upload your routine proof.");
        setLoading(true);
        const fd = new FormData();
        fd.append("group_id", joinModal.groupId);
        fd.append("proof", proofFile);

        const res = await apiClient.post("group_api.php", fd, { params: { action: "join_group" } });
        setLoading(false);
        if (res.data.ok) {
            setJoinModal({ open: false, groupId: null, sectionName: "" });
            setProofFile(null);
            fetchAll();
        } else {
            alert(res.data.error || "Failed to join group");
        }
    };

    return (
        <div className="min-h-screen bg-[#08090e] text-slate-200 selection:bg-cyan-500/30">
            <LeftNav sidebarWidth={72} />
            <Header sidebarWidth={72} />

            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(100px)" }} />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(100px)" }} />
            </div>

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-6xl mx-auto" style={{ paddingLeft: "calc(72px + 1.5rem)" }}>
                <header className="mb-16">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Collaborative Ecosystem</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-display font-black text-white leading-tight tracking-tighter mb-4 italic">
                            STUDY <span className="text-gradient-brand underline decoration-zinc-800 decoration-4 underline-offset-8">GROUPS.</span>
                        </h1>
                        <p className="max-w-xl text-slate-500 text-sm font-medium leading-relaxed">
                            Connect with peers from your specific sections. Access exclusive resources, routine-synced chats, and synchronized learning environments.
                        </p>
                    </motion.div>
                </header>

                {/* Search & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                    <div className="lg:col-span-3">
                        <div className="glass-card p-2 rounded-[2rem] border border-white/10 bg-white/[0.02] flex items-center group transition-all hover:bg-white/[0.04]">
                            <div className="relative flex-1">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Find your section node... (e.g. CSE 1101)"
                                    className="w-full bg-transparent border-none text-white pl-16 pr-6 py-5 text-sm font-black uppercase tracking-widest placeholder:text-slate-600 focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1 glass-card p-6 rounded-[2rem] border border-white/10 bg-white/[0.02] flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">My Nodes</div>
                            <div className="text-3xl font-black text-white">{myGroups.length}</div>
                        </div>
                        <Users className="w-8 h-8 text-cyan-500/50" />
                    </div>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {groups
                            .filter((g) => g.section_name.toLowerCase().includes(search.toLowerCase()))
                            .map((g, idx) => {
                                const status = myStatus(g.id);
                                const courseCode = getCourseCode(g.section_name);
                                const alreadyInCourse = joinedCourses.has(courseCode);

                                return (
                                    <motion.div
                                        key={g.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Users size={60} />
                                        </div>
                                        
                                        <div className="mb-6">
                                            <div className="text-[10px] font-black tracking-[0.2em] text-cyan-500 uppercase mb-2 italic">Active Section</div>
                                            <h3 className="text-lg font-black text-white leading-snug uppercase italic tracking-tight truncate pr-10">{g.section_name}</h3>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {status === "accepted" ? (
                                                <Link
                                                    to={`/group/${g.id}`}
                                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all"
                                                >
                                                    Enter Neural Link <ArrowRight size={14} />
                                                </Link>
                                            ) : status === "pending" ? (
                                                <div className="flex gap-2">
                                                    <div className="flex-1 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                                        <Clock size={14} /> Verifying
                                                    </div>
                                                    <button onClick={() => cancelRequest(g.id)} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : status === "rejected" ? (
                                                <div className="flex gap-2">
                                                    <div className="flex-1 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                                        <ShieldAlert size={14} /> Denied
                                                    </div>
                                                    <button onClick={() => setJoinModal({ open: true, groupId: g.id, sectionName: g.section_name })} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all text-center">
                                                        Retry
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => !alreadyInCourse && setJoinModal({ open: true, groupId: g.id, sectionName: g.section_name })}
                                                    disabled={alreadyInCourse}
                                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all ${alreadyInCourse 
                                                        ? "bg-white/[0.01] border border-white/5 text-slate-700 cursor-not-allowed" 
                                                        : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-400"}`}
                                                >
                                                    {alreadyInCourse ? <><Lock size={14} /> Conflict</> : <>Join Cohort <ArrowRight size={14} /></>}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                    </AnimatePresence>
                </div>
                <Footer sidebarWidth={72} />
            </main>

            {/* Join Modal */}
            <AnimatePresence>
                {joinModal.open && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setJoinModal({ open: false, groupId: null, sectionName: "" })} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg glass-card p-10 rounded-[3rem] border border-white/10 bg-[#0c0d12] shadow-2xl">
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Initialize Join</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 italic">{joinModal.sectionName}</p>

                            <div className="space-y-6">
                                <div className="relative border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-[2rem] p-12 text-center transition-all bg-white/[0.01]">
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.csv"
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {proofFile ? (
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto flex items-center justify-center text-cyan-400">
                                                <CheckCircle size={32} />
                                            </div>
                                            <div className="text-sm font-black text-white truncate max-w-[200px] mx-auto uppercase">{proofFile.name}</div>
                                            <button onClick={(e) => { e.stopPropagation(); setProofFile(null); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400">Clear File</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
                                                <Upload size={32} />
                                            </div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Upload Class Routine Proof</div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setJoinModal({ open: false, groupId: null, sectionName: "" })} className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Abort</button>
                                    <button onClick={handleJoinSubmit} disabled={!proofFile || loading} className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all">
                                        {loading ? "Transmitting..." : "Submit Join Request"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
