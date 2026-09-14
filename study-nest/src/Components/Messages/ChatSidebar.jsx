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
        <aside className="w-80 flex flex-col border-r h-full overflow-hidden border-[#001D36]/10 bg-white">
            <div className="p-6 border-b border-[#001D36]/10 flex-shrink-0">
                <div className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#001D36] flex items-center justify-center shadow-md transition-transform">
                        <MessageSquare size={16} className="text-white" />
                    </div>
                    <span className="text-[#001D36]">Messages</span>
                </div>

                <div className="flex p-1 rounded-2xl bg-[#F0F4F8] border border-[#001D36]/5 mb-6">
                    <button
                        onClick={() => setActiveTab("private")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'private' ? 'bg-white text-[#001D36] shadow-sm border border-[#001D36]/5' : 'text-[#66625C] hover:text-[#001D36]'}`}
                    >
                        <MessageSquare size={12} />
                        Private
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-white text-[#001D36] shadow-sm border border-[#001D36]/5' : 'text-[#66625C] hover:text-[#001D36]'}`}
                    >
                        <Users size={12} />
                        Groups
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66625C] group-hover:text-[#00808C] transition-colors" size={14} />
                    <input
                        className="w-full rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none transition-all placeholder:text-[#66625C] bg-[#F0F4F8] border border-[#001D36]/5 text-[#001D36] focus:border-[#00808C]/50 focus:bg-white"
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
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 mb-3 text-[#00808C]">Search Results</div>
                                {results.map(u => (
                                    <button key={u.id} onClick={() => startChatWith(u.id)} className="w-full text-left p-4 rounded-2xl bg-[#F0F4F8] border border-transparent hover:border-[#00808C]/20 mb-2 hover:scale-[0.98] transition-all group">
                                        <div className="font-bold text-[#001D36] group-hover:text-[#00808C] truncate">{u.username || u.email}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-[#66625C] mt-1">ID: {u.student_id || 'External'}</div>
                                    </button>
                                ))}
                                <div className="h-px w-full my-4 bg-[#001D36]/5" />
                            </div>
                        )}
                        <div className="text-[10px] font-black uppercase tracking-widest px-2 mb-3 text-[#66625C]">Recent Conversations</div>
                        {conversations.map(c => {
                            const active = activeCid === c.conversation_id;
                            return (
                                <button key={c.conversation_id} onClick={() => { setActiveCid(c.conversation_id); setActiveGroupId(null); }}
                                    className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden group hover:bg-[#F0F4F8] ${active ? 'bg-[#00808C]/10 border border-[#00808C]/20' : 'border border-transparent'}`}>
                                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00808C]" />}
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className={`text-xs font-bold ${active ? 'text-[#001D36]' : 'text-[#001D36]'}`}>
                                            {c.other_username || c.other_email}
                                        </div>
                                        {c.unread > 0 && <div className="h-4 px-1.5 rounded-full bg-[#00808C] text-[8px] font-bold text-white flex items-center shadow-sm">{c.unread}</div>}
                                    </div>
                                    <div className="text-[10px] truncate text-[#66625C] font-bold">{c.last_message || "Start a conversation..."}</div>
                                </button>
                            );
                        })}
                    </>
                )}

                {activeTab === 'groups' && (
                    <>
                        <div className="text-[10px] font-black uppercase tracking-widest px-2 mb-3 text-[#66625C]">My Groups</div>
                        {myGroups.map(g => {
                            const active = activeGroupId === g.id;
                            return (
                                <button key={g.id} onClick={() => { setActiveGroupId(g.id); setActiveCid(null); }}
                                    className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden group hover:bg-[#F0F4F8] ${active ? 'bg-[#00808C]/10 border border-[#00808C]/20' : 'border border-transparent'}`}>
                                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00808C]" />}
                                    <div className={`text-xs font-bold mb-1 ${active ? 'text-[#001D36]' : 'text-[#001D36]'}`}>
                                        {g.section_name}
                                    </div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#66625C]">Active member</div>
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        </aside>
    );
}
