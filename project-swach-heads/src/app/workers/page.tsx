"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserPlus, Star, MapPin, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [formData, setFormData] = useState({ name: "", worker_id: "", phone: "", ward: "", assigned_vehicle_id: "" });
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: "", worker_id: "", phone: "", ward: "", assigned_vehicle_id: "" });
        fetchWorkers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create worker");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
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
                      <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Ward</label>
                      <input 
                        required
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        placeholder="HSR Layout"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
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
                    {submitting ? "REGISTERING..." : "CONFIRM"}
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
                <button className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-xl text-xs font-bold transition-all">PERFORMANCE</button>
                <button className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-xl text-xs font-bold transition-all">ASSIGN TASK</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
