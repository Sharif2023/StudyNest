import React from "react";
import { MessageSquare, Users, Search } from "lucide-react";

export default function ChatSidebar({ 
    activeTab, 
    setActiveTab, 
    searchTerm, 
    setSearchTerm, 
    searchUsers, 
    results, 
    startChatWith, 
    conversations, 
    activeCid, 
    setActiveCid, 
    myGroups, 
    activeGroupId, 
    setActiveGroupId 
}) {
    return (
        <aside className="w-80 flex flex-col border-r h-full overflow-hidden" 
            style={{ background: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.05)" }}>
            
            <div className="p-6 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform">
                        <MessageSquare size={18} className="text-white" />
                    </div>
                    Messages <span className="text-gradient-brand">Hub</span>
                </div>

                <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-6">
                    <button 
                        onClick={() => setActiveTab("private")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'private' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                        <MessageSquare size={12} />
                        Private
                    </button>
                    <button 
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'groups' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                        <Users size={12} />
                        Groups
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-cyan-500 transition-colors" size={14} />
                    <input
                        className="w-full rounded-xl pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all placeholder:text-slate-600"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#f8fafc" }}
                        placeholder={activeTab === 'private' ? "Search users..." : "Search groups..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                {activeTab === 'private' && (
                    <>
                        {results.length > 0 && (
                            <div className="mb-6">
                                <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-3 text-cyan-500">Search Results</div>
                                {results.map(u => (
                                    <button key={u.id} onClick={() => startChatWith(u.id)} className="w-full text-left p-4 rounded-2xl bg-white/[0.04] border border-white/[0.05] mb-2 hover:scale-[0.98] transition-all group">
                                        <div className="font-bold text-white group-hover:text-cyan-400 truncate">{u.username || u.email}</div>
                                        <div className="text-[9px] font-medium text-slate-500 mt-1">ID: {u.student_id || 'External'}</div>
                                    </button>
                                ))}
                                <div className="h-px w-full my-4 bg-white/[0.03]" />
                            </div>
                        )}
                        <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-3 text-slate-600">Recent Conversations</div>
                        {conversations.map(c => {
                            const active = activeCid === c.conversation_id;
                            return (
                                <button key={c.conversation_id} onClick={() => { setActiveCid(c.conversation_id); setActiveGroupId(null); }}
                                    className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden group hover:bg-white/[0.03] ${active ? 'bg-white/[0.05] border border-white/[0.1]' : 'border border-transparent'}`}>
                                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_15px_#06b6d4]" />}
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>
                                            {c.other_username || c.other_email}
                                        </div>
                                        {c.unread > 0 && <div className="h-4 px-1.5 rounded-full bg-cyan-500 text-[8px] font-bold text-white flex items-center shadow-lg shadow-cyan-500/20">{c.unread}</div>}
                                    </div>
                                    <div className="text-[10px] truncate text-slate-500 font-medium">{c.last_message || "Start a conversation..."}</div>
                                </button>
                            );
                        })}
                    </>
                )}

                {activeTab === 'groups' && (
                    <>
                        <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-3 text-slate-600">My Groups</div>
                        {myGroups.map(g => {
                            const active = activeGroupId === g.id;
                            return (
                                <button key={g.id} onClick={() => { setActiveGroupId(g.id); setActiveCid(null); }}
                                    className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden group hover:bg-white/[0.03] ${active ? 'bg-white/[0.05] border border-white/[0.1]' : 'border border-transparent'}`}>
                                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_15px_#7c3aed]" />}
                                    <div className={`text-xs font-bold mb-1 ${active ? 'text-white' : 'text-slate-400'}`}>
                                        {g.section_name}
                                    </div>
                                    <div className="text-[9px] font-medium text-slate-500">Active member</div>
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        </aside>
    );
}
