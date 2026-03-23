import React, { useEffect, useMemo, useRef, useState } from "react";
import LeftNav from "../Components/LeftNav";
import Header from "../Components/Header";

import apiClient from "../apiConfig";
import ChatSidebar from "../Components/Messages/ChatSidebar";
import MessageThread from "../Components/Messages/MessageThread";
import MessageComposer from "../Components/Messages/MessageComposer";
import { pickAudioMime, extFromMime } from "../Components/Messages/MessageUtils";

const POLL_MS = 2500;

/* ===================== MAIN COMPONENT ===================== */

export default function Messages() {
    const [activeTab, setActiveTab] = useState("private"); // 'private' | 'groups'
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    
    const [activeCid, setActiveCid] = useState(null); // Used for private chats
    const [activeGroupId, setActiveGroupId] = useState(null); // Used for group chats
    
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const listRef = useRef(null);
    const lastIdRef = useRef(0);

    // Voice note state
    const [isRecording, setIsRecording] = useState(false);
    const [recMs, setRecMs] = useState(0);
    const [recError, setRecError] = useState("");
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recChunksRef = useRef([]);
    const recTimerRef = useRef(null);
    const recCancelledRef = useRef(false);

    const [myUser, setMyUser] = useState(null);

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
        if (auth?.id) setMyUser(auth);
    }, []);

    const isGroup = activeTab === "groups";

    /* ---------- Data Fetching ---------- */
    const loadConversations = async () => {
        try {
            const res = await apiClient.get("messages_api.php?action=conversations_list");
            if (res.data.ok) setConversations(res.data.conversations || []);
        } catch (e) { console.warn(e); }
    };

    const loadMyGroups = async () => {
        try {
            const res = await apiClient.get("group_api.php?action=my_groups");
            if (res.data.ok) {
                // Only show accepted groups
                setMyGroups((res.data.groups || []).filter(g => g.status === 'accepted'));
            }
        } catch (e) { console.warn(e); }
    };

    const loadMessages = async (cid, groupId, sinceId = 0) => {
        if (!cid && !groupId) return;
        try {
            let res;
            if (groupId) {
                res = await apiClient.get(`group_api.php?action=messages&group_id=${groupId}`);
            } else {
                res = await apiClient.get(`messages_api.php?action=messages_fetch&conversation_id=${cid}&since_id=${sinceId}`);
            }
            
            const j = res.data;
            if (!j.ok) return;

            let newMsgs = j.messages || [];
            if (sinceId === 0 && !groupId) newMsgs = [...newMsgs].reverse(); 

            setMessages((prev) => {
                const map = new Map(prev.map((m) => [m.id, m]));
                newMsgs.forEach((m) => map.set(m.id, m));
                const arr = Array.from(map.values()).sort((a, b) => {
                    const da = new Date(a.created_at).getTime();
                    const db = new Date(b.created_at).getTime();
                    return da - db;
                });
                lastIdRef.current = arr.length ? arr[arr.length - 1].id : 0;
                return arr;
            });

            if (newMsgs.length && cid) {
                const last = newMsgs[newMsgs.length - 1].id;
                apiClient.post("messages_api.php?action=messages_mark_read", {
                    conversation_id: cid,
                    last_read_message_id: last
                }).catch(() => { });
            }
        } catch (e) { console.warn(e); }
    };

    const searchUsers = async () => {
        const q = searchTerm.trim();
        if (!q) { setResults([]); return; }
        setSearching(true);
        try {
            const res = await apiClient.get(`messages_api.php?action=users_search&q=${q}`);
            if (res.data.ok) setResults(res.data.users || []);
        } catch (e) { console.warn(e); }
        finally { setSearching(false); }
    };

    /* ---------- Actions ---------- */
    const startChatWith = async (userId) => {
        if (!userId || userId === myUser?.id) return;
        try {
            const res = await apiClient.post("messages_api.php?action=conversations_ensure", { recipient_id: userId });
            if (!res.data.ok) return;
            setActiveTab("private");
            setActiveCid(res.data.conversation_id);
            setActiveGroupId(null);
            setResults([]); setSearchTerm("");
            loadConversations();
        } catch (e) { console.warn(e); }
    };

    const sendMessage = async (blob = null, filename = null) => {
        if ((!activeCid && !activeGroupId) || (!text.trim() && !file && !blob)) return;
        setLoading(true);
        try {
            const fd = new FormData();
            if (activeGroupId) {
                fd.append("group_id", String(activeGroupId));
                if (text.trim()) fd.append("message", text.trim());
                if (file) fd.append("attachment", file);
                if (blob) fd.append("attachment", new File([blob], filename, { type: blob.type }));
                await apiClient.post("group_api.php?action=send_message", fd);
            } else {
                fd.append("conversation_id", String(activeCid));
                if (text.trim()) fd.append("body", text.trim());
                if (file) fd.append("attachment", file);
                if (blob) fd.append("attachment", new File([blob], filename, { type: blob.type }));
                await apiClient.post("messages_api.php?action=messages_send", fd);
            }
            setText(""); setFile(null);
            loadMessages(activeCid, activeGroupId, lastIdRef.current);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); }
    };

    /* ---------- Voice Recording ---------- */
    const startRecording = async () => {
        setRecError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const mime = pickAudioMime();
            const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            mediaRecorderRef.current = mr;
            recChunksRef.current = [];
            recCancelledRef.current = false;
            mr.ondataavailable = (e) => e.data.size > 0 && recChunksRef.current.push(e.data);
            mr.onstop = async () => {
                clearInterval(recTimerRef.current);
                mediaStreamRef.current?.getTracks().forEach(t => t.stop());
                setIsRecording(false);
                if (recCancelledRef.current) { setRecMs(0); return; }
                const blob = new Blob(recChunksRef.current, { type: mime || "audio/webm" });
                const fname = `voice_${Date.now()}.${extFromMime(mime)}`;
                await sendMessage(blob, fname);
                setRecMs(0);
            };
            mr.start(250);
            setIsRecording(true);
            setRecMs(0);
            recTimerRef.current = setInterval(() => setRecMs(m => m + 1000), 1000);
        } catch (e) { setRecError("Mic access denied"); }
    };

    /* ---------- Effects ---------- */
    useEffect(() => {
        loadConversations();
        loadMyGroups();
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            loadConversations();
            loadMyGroups();
        }, POLL_MS * 3);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        setMessages([]);
        lastIdRef.current = 0;
        loadMessages(activeCid, activeGroupId, 0);
    }, [activeCid, activeGroupId]);

    useEffect(() => {
        const t = setInterval(() => loadMessages(activeCid, activeGroupId, lastIdRef.current), POLL_MS);
        return () => clearInterval(t);
    }, [activeCid, activeGroupId]);

    useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

    const activeLabel = useMemo(() => {
        if (activeGroupId) return myGroups.find(g => g.id === activeGroupId)?.section_name || "Group Chat";
        if (activeCid) {
            const conv = conversations.find(c => c.conversation_id === activeCid);
            return conv?.other_username || conv?.other_email || "Chat";
        }
        return "Select a conversation";
    }, [activeCid, activeGroupId, conversations, myGroups]);

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: "#08090e", color: "#e2e8f0" }}>
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)", filter: "blur(80px)" }} />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)", filter: "blur(80px)" }} />
            </div>

            <LeftNav sidebarWidth={72} navOpen={false} />
            <Header sidebarWidth={72} navOpen={false} />

            <div className="flex relative z-10" style={{ paddingLeft: 72, height: "calc(100vh - 64px)", marginTop: 64 }}>
                <ChatSidebar 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchUsers={searchUsers}
                    results={results}
                    startChatWith={startChatWith}
                    conversations={conversations}
                    activeCid={activeCid}
                    setActiveCid={setActiveCid}
                    myGroups={myGroups}
                    activeGroupId={activeGroupId}
                    setActiveGroupId={setActiveGroupId}
                />

                <div className="flex-1 flex flex-col h-full bg-black/[0.15]">
                    <MessageThread 
                        messages={messages}
                        myUser={myUser}
                        isGroup={isGroup}
                        activeCid={activeCid}
                        activeGroupId={activeGroupId}
                        activeLabel={activeLabel}
                        listRef={listRef}
                    />

                    <MessageComposer 
                        isRecording={isRecording}
                        recMs={recMs}
                        file={file}
                        setFile={setFile}
                        text={text}
                        setText={setText}
                        sendMessage={sendMessage}
                        startRecording={startRecording}
                        stopRecording={() => mediaRecorderRef.current?.stop()}
                        fileInputRef={fileInputRef}
                        recError={recError}
                    />
                </div>
            </div>
        </div>
    );
}
