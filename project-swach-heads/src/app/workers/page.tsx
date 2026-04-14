"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserPlus, Star, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

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

  useEffect(() => {
    fetch("/api/workers")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWorkers(data);
      })
      .catch(err => console.error("Error fetching workers:", err));
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Worker Management</h2>
          <p className="text-muted-foreground mt-1">Track and manage field staff performance</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <UserPlus className="w-4 h-4" />
          Add New Worker
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Workers</p>
            <p className="text-2xl font-bold">54</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <UserCheck className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="text-2xl font-bold">32</p>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <Clock className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Response</p>
            <p className="text-2xl font-bold">14m</p>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
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
    </div>
  );
}
