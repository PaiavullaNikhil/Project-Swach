"use client";

import { useEffect, useState } from "react";
import { User, Truck, X, UserPlus, CheckCircle2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Worker {
  _id: string;
  name: string;
  worker_id: string;
  status: string;
  ward: string;
  assigned_vehicle_id?: string;
}

interface AssignmentModalProps {
  complaintId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignmentModal({ complaintId, onClose, onSuccess }: AssignmentModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workers")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWorkers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching workers:", err);
        setLoading(false);
      });
  }, []);

  const handleAssign = async () => {
    if (!selectedWorkerId) return;
    const worker = workers.find(w => w.worker_id === selectedWorkerId);
    if (!worker) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          complaint_id: complaintId, 
          worker_id: selectedWorkerId,
          worker_name: worker.name,
          // If the worker has a vehicle assigned in their profile, link it to the task
          vehicle_number: worker.assigned_vehicle_id || null, 
          // Note: vehicle_type would need a separate fetch or field in worker doc
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-bold">Assign Worker</h3>
              <p className="text-xs text-muted-foreground mt-1">Select a field worker for task #{complaintId.slice(-6)}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Scanning personnel...</p>
             </div>
           ) : workers.length === 0 ? (
             <div className="text-center py-10">
                <p className="text-muted-foreground italic">No workers registered yet.</p>
             </div>
           ) : (
             workers.map((worker) => (
                <TouchableOpacity
                  key={worker._id}
                  onClick={() => setSelectedWorkerId(worker.worker_id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedWorkerId === worker.worker_id 
                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" 
                    : "bg-white/5 border-transparent hover:border-white/10"
                  }`}
                >
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      selectedWorkerId === worker.worker_id ? "bg-primary text-white" : "bg-white/10"
                   }`}>
                      {worker.name.charAt(0)}
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-sm tracking-tight">{worker.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1 font-semibold">
                         <span className="flex items-center gap-1 uppercase tracking-tighter"><MapPin className="w-3 h-3" /> {worker.ward}</span>
                         <span className={`px-1.5 py-0.5 rounded-full uppercase ${
                            worker.status === 'Idle' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                         }`}>
                            {worker.status}
                         </span>
                      </div>
                   </div>
                   {selectedWorkerId === worker.worker_id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                   )}
                </TouchableOpacity>
             ))
           )}
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
           <button 
             onClick={onClose}
             className="flex-1 py-3 px-4 rounded-2xl font-bold border border-white/10 hover:bg-white/5 transition-all text-sm"
           >
             CANCEL
           </button>
           <button 
             onClick={handleAssign}
             disabled={!selectedWorkerId || submitting}
             className="flex-2 bg-primary text-white py-3 px-8 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
           >
             {submitting ? "ASSIGNING..." : "CONFIRM ASSIGNMENT"}
           </button>
        </div>
      </motion.div>
    </div>
  );
}

// Simple wrapper to avoid 'onClick on div' issues if needed
function TouchableOpacity({ children, onClick, className }: { children: React.ReactNode, onClick: () => void, className: string }) {
    return (
        <div onClick={onClick} className={className}>
            {children}
        </div>
    )
}
