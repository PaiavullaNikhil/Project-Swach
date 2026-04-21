"use client";

import { useEffect, useState } from "react";
import { Truck, Plus, CheckCircle2, AlertCircle, MapPin, Settings2, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BANGALORE_WARDS } from "@/constants/wards";
import { SearchableSelect } from "@/components/SearchableSelect";

interface Vehicle {
  _id: string;
  plate_number: string;
  vehicle_type: string;
  ward: string;
  status: string;
  created_at: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({ plate_number: "", vehicle_type: "Mini Truck", ward: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (Array.isArray(data)) setVehicles(data);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingVehicle ? "PUT" : "POST";
      const res = await fetch("/api/vehicles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        setEditingVehicle(null);
        setFormData({ plate_number: "", vehicle_type: "Mini Truck", ward: "" });
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.error || `Failed to ${editingVehicle ? "update" : "create"} vehicle`);
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      vehicle_type: vehicle.vehicle_type,
      ward: vehicle.ward
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fleet Management</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor your sanitation vehicle registry</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Register Vehicle
        </button>
      </header>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl border-dashed border-2 border-white/5">
           <Truck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-muted-foreground italic">No vehicles registered in the fleet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle, i) => (
            <motion.div 
              key={vehicle._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                 <div className={`w-2 h-2 rounded-full ${vehicle.status === 'Available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500'} animate-pulse`} />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-xl font-bold tracking-tight">{vehicle.plate_number}</h4>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{vehicle.vehicle_type}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Status</span>
                   <span className={`font-bold ${vehicle.status === 'Available' ? 'text-green-500' : 'text-amber-500'}`}>{vehicle.status}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Area / Ward</span>
                   <span className="font-bold text-primary/80">{vehicle.ward || "General"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Location</span>
                   <span className="flex items-center gap-1 font-medium italic"><MapPin className="w-3 h-3" /> In Yard</span>
                </div>
              </div>

              <div className="flex gap-2">
                 <button className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/5">
                    VIEW LOGS
                 </button>
                 <button 
                    onClick={() => handleEdit(vehicle)}
                    className="p-2.5 bg-white/5 hover:bg-primary/10 hover:text-primary rounded-xl transition-all border border-white/5"
                  >
                    <Edit2 className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Register New Vehicle</h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Plate Number</label>
                  <input 
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                    placeholder="KA-01-EF-1234"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                 <div>
                   <SearchableSelect 
                     label="Operational Ward"
                     options={BANGALORE_WARDS}
                     value={formData.ward}
                     onChange={(val) => setFormData({ ...formData, ward: val })}
                     placeholder="Select ward..."
                   />
                 </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">Vehicle Type</label>
                  <select 
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                  >
                    <option>Mini Truck</option>
                    <option>Compactor Truck</option>
                    <option>Electric Tipper</option>
                    <option>Tractor</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all text-sm"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm disabled:opacity-50"
                  >
                    {submitting ? "PROCESSING..." : editingVehicle ? "SAVE CHANGES" : "CONFIRM"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
