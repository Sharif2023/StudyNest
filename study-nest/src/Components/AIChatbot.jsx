import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Bot, User, Minimize2, Maximize2 } from "lucide-react";
import apiClient from "../apiConfig";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! I'm your StudyNest AI assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await apiClient.post("chatbot.php", { message: userMsg });
      const data = res.data;
      
      if (data.response) {
        setMessages(prev => [...prev, { role: "bot", content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: "bot", content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { role: "bot", content: "Connection failed. Please check your network." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[520px] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#001D36]/10 bg-white"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#001D36]/10 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#001D36] flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#001D36] tracking-tight">StudyNest AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8AB100] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#8AB100] uppercase tracking-widest">Active Now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(true)} className="p-2 rounded-lg hover:bg-[#F0F4F8] text-[#66625C] transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-[#F0F4F8] text-[#66625C] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll bg-[#F0F4F8]/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-[#00808C]/10 text-[#00808C]" : "bg-[#001D36]/10 text-[#001D36]"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#00808C] text-white rounded-tr-none"
                          : "bg-white border border-[#001D36]/10 text-[#001D36] rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#001D36]/10 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#001D36]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#001D36]/40 animate-bounce" style={{ animationDelay: "200ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#001D36]/40 animate-bounce" style={{ animationDelay: "400ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#001D36]/10 bg-white">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full bg-[#F0F4F8] border border-[#001D36]/10 rounded-xl py-3 pl-4 pr-12 text-xs text-[#001D36] placeholder:text-[#66625C] outline-none focus:border-[#00808C]/40 focus:bg-white transition-all shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 rounded-lg bg-[#00808C] text-white disabled:opacity-50 disabled:bg-[#66625C] transition-all shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      {(!isOpen || isMinimized) && (
        <motion.button
          layoutId="chatbot-toggle"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="relative group h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-[#001D36] shadow-xl border border-white/10"
        >
          {isMinimized ? <Maximize2 className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
          
          <div className="absolute inset-0 rounded-2xl animate-pulse group-hover:animate-none opacity-50 transition-opacity" />
            
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#8AB100] border-2 border-white shadow-lg" />
        </motion.button>
      )}
    </div>
  );
}
