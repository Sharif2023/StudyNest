import React from "react";
import { MessageSquare } from "lucide-react";
import { absUrl, isImage, isAudio, isVideo, isPDF, prettyName, getExt } from "./MessageUtils";
import { FileChip } from "./MessageComponents";

export default function MessageThread({ 
    messages, 
    myUser, 
    isGroup, 
    activeCid, 
    activeGroupId, 
    activeLabel,
    listRef 
}) {
    return (
        <main className="flex-1 flex flex-col h-full bg-transparent">
            {/* Thread Header */}
            <div className="h-16 border-b px-8 flex items-center justify-between bg-white border-[#001D36]/10">
                <div className="flex items-center gap-4">
                    {(activeCid || activeGroupId) ? (
                        <>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[#00808C] shadow-sm bg-[#00808C]/10 border border-[#00808C]/20`}>
                                {activeLabel.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-black text-[#001D36]">{activeLabel}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#8AB100] animate-pulse" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#66625C]">Active</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#66625C]">Select a conversation</div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-10 space-y-6 scroll-smooth scrollbar-hide">
                {messages.map((m, i) => {
                    const mine = m.sender_id === myUser?.id || m.user_id === myUser?.id;
                    const showAuthor = isGroup && !mine && (i === 0 || messages[i-1].user_id !== m.user_id);
                    
                    return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[75%] space-y-1">
                                {showAuthor && <div className="text-[10px] font-bold text-[#66625C] ml-2 mb-1">{m.username}</div>}
                                <div className={`group relative p-4 rounded-3xl text-[13px] font-bold leading-relaxed transition-all hover:scale-[1.01] ${mine 
                                    ? "bg-[#00808C] text-white shadow-sm rounded-br-none" 
                                    : "bg-white border border-[#001D36]/10 text-[#001D36] shadow-sm rounded-bl-none"}`}>
                                    
                                    {m.body || m.message}

                                    {m.attachment_url && (
                                        <div className="mt-4 space-y-3">
                                            {isImage(m.attachment_url) && (
                                                <a href={absUrl(m.attachment_url)} target="_blank" rel="noreferrer">
                                                    <img src={absUrl(m.attachment_url)} className="rounded-2xl max-h-64 w-full object-cover border border-white/10 shadow-2xl" />
                                                </a>
                                            )}
                                            {isAudio(m.attachment_url) && (
                                                <audio controls className="w-full h-8 opacity-90 brightness-90 filter hue-rotate-[180deg]">
                                                    <source src={absUrl(m.attachment_url)} />
                                                </audio>
                                            )}
                                            {isVideo(m.attachment_url) && (
                                                <video controls className="w-full max-h-64 rounded-2xl border border-white/10 shadow-2xl">
                                                    <source src={absUrl(m.attachment_url)} />
                                                </video>
                                            )}
                                            {(isPDF(m.attachment_url) || (!isImage(m.attachment_url) && !isAudio(m.attachment_url) && !isVideo(m.attachment_url))) && (
                                                <a href={absUrl(m.attachment_url)} target="_blank" rel="noreferrer" download className="block">
                                                    <FileChip name={prettyName(m.attachment_url)} ext={getExt(m.attachment_url)} className="bg-black/10 border-white/5" />
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    <div className={`text-[8px] font-medium mt-2 opacity-40 transition-opacity group-hover:opacity-100 ${mine ? 'text-right' : 'text-left'}`}>
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {(!activeCid && !activeGroupId) && (
                    <div className="h-full flex flex-col items-center justify-center text-[#001D36]/20">
                        <MessageSquare size={60} className="mb-6 animate-pulse" />
                        <div className="text-xs font-bold uppercase tracking-widest text-center">Select a conversation to start messaging</div>
                    </div>
                )}
            </div>
        </main>
    );
}
