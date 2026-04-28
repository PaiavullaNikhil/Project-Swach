"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, UserCheck, UserPlus, Star, MapPin, Clock, Edit2, X, Search, ArrowUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BANGALORE_WARDS } from "@/constants/wards";
import { SearchableSelect } from "@/components/SearchableSelect";

interface Worker {
  name: string;
  worker_id: string;
  ward: string;
  status: string;
  tasks_completed: number;
  rating: number;
  current_location?: { coordinates: [number, number] };
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({ name: "", worker_id: "", phone: "", ward: "", assigned_vehicle_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [assignTaskWorker, setAssignTaskWorker] = useState<Worker | null>(null);

  const fetchWorkers = async () => {
    try {
      const res = await fetch("/api/workers");
      const data = await res.json();
      if (Array.isArray(data)) setWorkers(data);
    } catch (err) {
      console.error("Error fetching workers:", err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (Array.isArray(data)) setVehicles(data);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchVehicles();

    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        if (data.workers) setStats(data.workers);
      })
      .catch(err => console.error("Error fetching worker stats:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingWorker ? "PUT" : "POST";
      const res = await fetch("/api/workers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingWorker(null);
        setFormData({ name: "", worker_id: "", phone: "", ward: "", assigned_vehicle_id: "" });
        fetchWorkers();
      } else {
        const err = await res.json();
        alert(err.error || `Failed to ${editingWorker ? 'update' : 'create'} worker`);
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      worker_id: worker.worker_id,
      phone: (worker as any).phone || "", // Assume phone might be missing
      ward: worker.ward,
      assigned_vehicle_id: (worker as any).assigned_vehicle_id || ""
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Worker Management</h2>
          <p className="text-muted-foreground mt-1">Track and manage field staff performance</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <UserPlus className="w-4 h-4" />
          Add New Worker
        </button>
      </header>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Register New Field Worker</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Full Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="flex gap-4">
                   <div className="flex-1">
                      <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Worker ID</label>
                      <input 
                        required
                        value={formData.worker_id}
                        onChange={(e) => setFormData({ ...formData, worker_id: e.target.value.toUpperCase() })}
                        placeholder="W001"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
                      />
                   </div>
                    <div className="flex-1">
                       <SearchableSelect 
                         label="Operational Ward"
                         options={BANGALORE_WARDS}
                         value={formData.ward}
                         onChange={(val) => setFormData({ ...formData, ward: val })}
                         placeholder="Start typing ward name..."
                       />
                    </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Phone Number</label>
                  <input 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Assigned Vehicle (Optional)</label>
                  <select 
                    value={formData.assigned_vehicle_id}
                    onChange={(e) => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    <option value="" className="bg-zinc-900 text-muted-foreground">No Vehicle (Self-selection at login)</option>
                    {vehicles.map(v => (
                      <option key={v.plate_number} value={v.plate_number} className="bg-zinc-900">
                        {v.plate_number} - {v.vehicle_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                        setShowModal(false);
                        setEditingWorker(null);
                        setFormData({ name: "", worker_id: "", phone: "", ward: "", assigned_vehicle_id: "" });
                    }}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all text-sm"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
                  >
                    {submitting ? "PROCESSING..." : editingWorker ? "SAVE CHANGES" : "CONFIRM"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Stats - Connected to API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Workers</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <UserCheck className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="text-2xl font-bold">{stats?.active || 0}</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <Clock className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Response</p>
            <p className="text-2xl font-bold">{stats?.avgResponse || "0m"}</p>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <h3 className="text-xl font-bold mt-12 mb-6">Staff Roster</h3>
      {workers.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl border-dashed border-2 border-white/5">
           <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-muted-foreground italic">No workers found in the current roster.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {workers.map((worker, i) => (
            <motion.div 
              key={worker.worker_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-lg font-bold">
                    {worker.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold group-hover:text-primary transition-colors">{worker.name}</h4>
                    <p className="text-xs text-muted-foreground">ID: {worker.worker_id}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                  worker.status === 'Active' ? 'bg-green-500/10 text-green-500' : 
                  worker.status === 'Idle' ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-muted-foreground'
                }`}>
                  {worker.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Area</span>
                  <span className="font-medium">{worker.ward}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Tasks</span>
                  <span className="font-medium">{worker.tasks_completed} Resolved</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3" /> Rating</span>
                  <span className="font-medium text-amber-500">{worker.rating} / 5.0</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button 
                  onClick={() => handleEdit(worker)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  EDIT PROFILE
                </button>
                <button 
                  onClick={() => setAssignTaskWorker(worker)}
                  className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  ASSIGN TASK
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Task Assignment Modal */}
      {assignTaskWorker && (
        <TaskAssignmentModal
          worker={assignTaskWorker}
          onClose={() => setAssignTaskWorker(null)}
          onSuccess={() => {
            setAssignTaskWorker(null);
            fetchWorkers();
          }}
        />
      )}
    </div>
  );
}

// ─── Task Assignment Modal ────────────────────────────────────────────────────

interface Complaint {
  _id: string;
  photo_url: string;
  ward: string;
  upvotes: number;
  timestamp: string;
  status: string;
  priorityScore?: number;
}

function TaskAssignmentModal({ worker, onClose, onSuccess }: { worker: Worker; onClose: () => void; onSuccess: () => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"worker-ward" | "all">("worker-ward");

  useEffect(() => {
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Only show unassigned (Reported) complaints
          setComplaints(data.filter((c: Complaint) => c.status === "Reported"));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching complaints:", err);
        setLoading(false);
      });
  }, []);

  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    // Ward filter
    if (filterMode === "worker-ward" && worker.ward) {
      result = result.filter(c => c.ward === worker.ward);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(c =>
        (c.ward || "").toLowerCase().includes(q) ||
        c._id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [complaints, filterMode, searchQuery, worker.ward]);

  const handleAssign = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: selectedId,
          worker_id: worker.worker_id,
          worker_name: worker.name,
          vehicle_number: (worker as any).assigned_vehicle_id || null,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch {
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
        className="glass border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">Assign Task</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select a complaint to assign to <span className="text-primary font-semibold">{worker.name}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter tabs + Search */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setFilterMode("worker-ward")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === "worker-ward"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {worker.ward ? worker.ward.split(" (")[0] : "Worker Ward"}
              </button>
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === "all"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                All Wards
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Complaint List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Loading unassigned complaints...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">
                {complaints.length === 0
                  ? "No unassigned complaints available"
                  : filterMode === "worker-ward"
                    ? "No complaints in this ward. Try 'All Wards'."
                    : "No complaints match your search."
                }
              </p>
              {filterMode === "worker-ward" && complaints.length > 0 && (
                <button
                  onClick={() => setFilterMode("all")}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Show all wards
                </button>
              )}
            </div>
          ) : (
            filteredComplaints.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedId(c._id === selectedId ? null : c._id)}
                className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedId === c._id
                    ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                    : "bg-white/5 border-transparent hover:border-white/10"
                }`}
              >
                <img src={c.photo_url} alt="Waste" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold truncate">{c.ward || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                      {new Date(c.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      {c.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      ...{c._id.slice(-4)}
                    </span>
                    {c.priorityScore !== undefined && (
                      <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full">
                        Score: {Math.round(c.priorityScore)}
                      </span>
                    )}
                  </div>
                </div>
                {selectedId === c._id && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 self-center" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl font-bold border border-white/10 hover:bg-white/5 transition-all text-sm"
          >
            CANCEL
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedId || submitting}
            className="flex-[2] bg-primary text-white py-3 px-8 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
          >
            {submitting ? "ASSIGNING..." : "CONFIRM ASSIGNMENT"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
