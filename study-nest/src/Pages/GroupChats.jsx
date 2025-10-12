import React, { useEffect, useState, useRef } from 'react';
import Footer from '../Components/Footer';
import { Link } from 'react-router-dom';

const API_BASE = "http://localhost/studynest/study-nest/src/api/group_chat_api.php";

// Helper function for API calls
async function apiCall(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include'
  });
  
  return response.json();
}

async function apiPost(action, data = {}) {
  const response = await fetch(`${API_BASE}?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  return response.json();
}

export default function GroupChats() {
  const [groupChats, setGroupChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Load user's group chats
  const loadGroupChats = async () => {
    setLoading(true);
    try {
      const result = await apiCall('my_group_chats');
      if (result.ok) {
        setGroupChats(result.group_chats || []);
      } else {
        setError(result.error || 'Failed to load group chats');
      }
    } catch (err) {
      setError('Failed to load group chats');
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected chat
  const loadMessages = async (chatId, sinceId = 0) => {
    try {
      const result = await apiCall('get_messages', {
        group_chat_id: chatId,
        since_id: sinceId
      });
      if (result.ok) {
        if (sinceId > 0) {
          // Append new messages
          setMessages(prev => [...prev, ...result.messages]);
        } else {
          // Replace all messages
          setMessages(result.messages || []);
        }
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Load participants for selected chat
  const loadParticipants = async (chatId) => {
    try {
      const result = await apiCall('get_participants', { group_chat_id: chatId });
      if (result.ok) {
        setParticipants(result.participants || []);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const result = await apiPost('send_message', {
        group_chat_id: selectedChat.id,
        body: newMessage.trim(),
        message_type: 'text'
      });
      
      if (result.ok) {
        setNewMessage('');
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, result.message]);
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    }
  };

  // Mark messages as read
  const markAsRead = async (chatId) => {
    if (messages.length === 0) return;
    
    const lastMessageId = Math.max(...messages.map(m => m.id));
    try {
      await apiPost('mark_read', {
        group_chat_id: chatId,
        last_read_message_id: lastMessageId
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // Load unread counts
  const loadUnreadCounts = async () => {
    try {
      const result = await apiCall('get_unread_counts');
      if (result.ok) {
        setUnreadCounts(result.unread_counts || {});
      }
    } catch (err) {
      console.error('Failed to load unread counts:', err);
    }
  };

  // Handle chat selection
  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setParticipants([]);
    await loadMessages(chat.id);
    await loadParticipants(chat.id);
    await markAsRead(chat.id);
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load data on component mount
  useEffect(() => {
    loadGroupChats();
    loadUnreadCounts();
  }, []);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!selectedChat) return;

    const interval = setInterval(async () => {
      const lastMessageId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) : 0;
      await loadMessages(selectedChat.id, lastMessageId);
      await loadUnreadCounts();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedChat, messages]);

  // Handle key press for sending messages
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-700/40 bg-gradient-to-r from-slate-700 to-slate-900 backdrop-blur-lg shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-white font-bold">
                <img src="src/assets/logo.png" alt="Study-Nest-Logo" className="h-7 w-7" />
              </span>
              <span className="font-semibold tracking-tight text-white">StudyNest</span>
            </Link>
            <span className="text-white font-medium">Group Chats</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-white font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 hover:text-black">Back to Home</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Group Chats List */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow ring-1 ring-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">My Group Chats</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-80px)]">
              {loading ? (
                <div className="p-4 text-center text-zinc-500">Loading...</div>
              ) : groupChats.length === 0 ? (
                <div className="p-4 text-center text-zinc-500">No group chats found</div>
              ) : (
                groupChats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 ${
                      selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-900 truncate">{chat.chat_name}</h3>
                        <p className="text-sm text-zinc-500 truncate">{chat.course_code} - Section {chat.section_name}</p>
                        {chat.last_message && (
                          <p className="text-sm text-zinc-600 truncate mt-1">
                            {chat.last_message.length > 50 
                              ? chat.last_message.substring(0, 50) + '...' 
                              : chat.last_message
                            }
                          </p>
                        )}
                      </div>
                      {unreadCounts[chat.id] > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadCounts[chat.id]}
                        </span>
                      )}
                    </div>
                    {chat.last_message_time && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatMessageTime(chat.last_message_time)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow ring-1 ring-zinc-200 overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-200 bg-zinc-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{selectedChat.chat_name}</h3>
                      <p className="text-sm text-zinc-600">{selectedChat.course_code} - Section {selectedChat.section_name}</p>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {participants.length} participant{participants.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === selectedChat.created_by ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === selectedChat.created_by 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-zinc-100 text-zinc-900'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.username} ({message.student_id})
                          </span>
                        </div>
                        <p className="text-sm">{message.body}</p>
                        {message.attachment_url && (
                          <div className="mt-2">
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:text-blue-100 underline"
                            >
                              📎 Attachment
                            </a>
                          </div>
                        )}
                        <p className="text-xs opacity-75 mt-1">
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-lg font-medium mb-2">Select a Group Chat</h3>
                  <p>Choose a group chat from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
