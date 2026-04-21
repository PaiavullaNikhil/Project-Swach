"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, Send, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { AssignmentModal } from "@/components/AssignmentModal";

interface ChatMessage {
  _id?: string;
  sender_id?: string;
  sender_name: string;
  sender_role: "Admin" | "Worker";
  message: string;
  timestamp: string;
}

interface Escalation {
  id: string;
  ward: string;
  delay: string;
  photo_url: string;
  status: string;
  worker_id: string;
  assigned_worker: string;
}

interface apiComplaint {
  _id: string;
  ward?: string;
  photo_url: string;
  status: string;
  timestamp: string;
  worker_id?: string;
  worker_name?: string;
}

const WORKER_API_URL = "http://localhost:8001";

export default function EscalationsPage() {
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchEscalations = () => {
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const escData = data.filter((c: apiComplaint) => {
            const ageHours = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60);
            return ageHours > 72 && c.status !== "Cleared";
          }).map((c: apiComplaint) => ({
            id: c._id,
            ward: c.ward || "Unknown",
            delay: "72h+",
            photo_url: c.photo_url,
            status: c.status,
            assigned_worker: c.worker_name || c.worker_id || "Unassigned",
            worker_id: c.worker_id || ""
          }));
          setEscalations(escData);
          if (escData.length > 0 && !selected) setSelected(escData[0]);
        }
      })
      .catch(err => console.error("Error fetching escalations:", err));
  };

  useEffect(() => {
    fetchEscalations();
    
    // Initialize Socket
    socketRef.current = io(WORKER_API_URL, {
      path: "/ws/socket.io"
    });

    socketRef.current.on("new_chat_message", (msg: ChatMessage) => {
      setMessages(prev => {
        // Avoid duplicate messages if any
        if (prev.some(m => m.timestamp === msg.timestamp && m.message === msg.message)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selected) {
      // Join Room
      socketRef.current?.emit("join_chat", { complaint_id: selected.id });

      // Fetch History
      fetch(`${WORKER_API_URL}/chat/${selected.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(err => console.error("Error fetching messages:", err));
        
      return () => {
        socketRef.current?.emit("leave_chat", { complaint_id: selected.id });
      };
    }
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !selected) return;
    const msg = {
      sender_id: "admin_01",
      sender_name: "Admin",
      sender_role: "Admin",
      message: input,
    };
    
    fetch(`${WORKER_API_URL}/chat/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg)
    }).then(() => {
      setInput("");
    });
  };

  const handleAssignmentSuccess = () => {
    // Refresh the sidebar list
    fetchEscalations();
    
    // Close the modal
    setIsAssignmentModalOpen(false);
    
    // Explicitly update the selected item's assigned_worker to "Updating..." 
    // It will be fully updated once fetchEscalations finishes, but this gives immediate feedback
    if (selected) {
      setSelected(prev => prev ? { ...prev, assigned_worker: "Updating..." } : null);
      setMessages([]); // Clear chat history from UI
    }
    
    // To be even better, we could reload the single selected complaint details here
    setTimeout(fetchEscalations, 500); // Small delay to ensure DB secondary consistency if on Atlas
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-8">
      {/* Sidebar List */}
      <div className="w-96 flex flex-col gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-destructive" />
          Critical Escalations
        </h2>
        
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {escalations.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 glass rounded-2xl">No critical escalations found.</div>
          ) : (
            escalations.map((esc) => (
              <div 
                key={esc.id}
                onClick={() => setSelected(esc)}
                className={`p-4 rounded-2xl glass border cursor-pointer transition-all ${
                  selected?.id === esc.id ? "border-primary bg-primary/5" : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">{esc.delay} OVERDUE</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{esc.id.slice(-6)}</span>
                </div>
                <div className="flex gap-4">
                  <img src={esc.photo_url} className="w-12 h-12 rounded-lg object-cover" alt="Waste" />
                  <div>
                    <h4 className="font-bold text-sm">{esc.ward}</h4>
                    <p className="text-xs text-muted-foreground truncate w-40">With: {esc.assigned_worker}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 glass border border-white/5 rounded-3xl flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">{selected.ward} — {selected.id.slice(-6)}</h3>
                  <p className="text-xs text-muted-foreground">Communicating with {selected.assigned_worker}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignmentModalOpen(true)}
                className="relative z-50 cursor-pointer bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border border-destructive/20"
              >
                RE-ASSIGN WORKER
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div 
                    key={msg._id || i}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.sender_role === 'Admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] space-y-1 ${msg.sender_role === 'Admin' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] text-muted-foreground font-bold px-1 uppercase tracking-tighter">
                        {msg.sender_role === 'Admin' ? 'Management' : msg.sender_name}
                      </p>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        msg.sender_role === 'Admin' 
                          ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                          : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                      }`}>
                        {msg.message}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message to the worker..."
                  className="w-full bg-background border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 opacity-20" />
             </div>
             <p className="font-medium">Select an escalation to begin investigation</p>
          </div>
        )}
      </div>

      {isAssignmentModalOpen && selected && (
        <AssignmentModal 
          complaintId={selected.id}
          initialWorkerId={selected.worker_id}
          onClose={() => setIsAssignmentModalOpen(false)}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}
