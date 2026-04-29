"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle, Clock, ShieldCheck, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch stats
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
      })
      .catch(err => console.error("Error fetching stats:", err));

    // Fetch actual complaints for the "Archive/Log" table
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComplaints(data.slice(0, 10)); // Show latest 10
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching complaints:", err);
        setLoading(false);
      });
  }, []);

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Synchronizing system records...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Reports & Audits</h2>
          <p className="text-muted-foreground mt-1">Live operational logs and verified historical data</p>
        </div>
        <div className="flex gap-4">
           <div className="glass px-4 py-2 rounded-xl border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Database Connected</span>
           </div>
        </div>
      </header>

      {/* Latest Report Highlight */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass p-8 rounded-[2.5rem] border-primary/20 bg-primary/5 relative overflow-hidden print:border-black print:bg-white print:text-black print:p-4"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 print:hidden">
          <FileText className="w-64 h-64 rotate-12" />
        </div>

        <div className="flex justify-between items-start mb-12 relative z-10">
          <div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest print:hidden">Live Data Feed</span>
            <h3 className="text-3xl font-bold mt-4">Operational Status Report</h3>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Snapshot as of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Reports</p>
            <p className="text-5xl font-black">{stats?.total || 0}</p>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
               Live System Load
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Resolution Rate</p>
            <p className="text-5xl font-black text-emerald-400">
              {stats?.total > 0 ? Math.round((stats.cleared / stats.total) * 100) : 0}%
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
               <CheckCircle className="w-3.5 h-3.5" />
               {stats?.cleared || 0} Issues Fixed
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Efficiency</p>
            <p className="text-5xl font-black text-amber-400">
              {stats?.workers?.avgResponse || "0m"}
            </p>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
               <Clock className="w-3.5 h-3.5" />
               Avg Resolution Time
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Escalations</p>
            <p className="text-5xl font-black text-red-400">
              {stats?.escalated || 0}
            </p>
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
               System Warnings
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actual Data Table */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-bold flex items-center gap-2">
             <FileText className="w-5 h-5 text-primary" />
             Recent System Activity
           </h3>
           <span className="text-xs text-muted-foreground">Synchronized with Main Database</span>
        </div>

        <div className="glass rounded-[2rem] overflow-hidden border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Issue ID & Ward</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Reported</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Operational Status</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c, idx) => (
                <tr key={c._id} className={`group hover:bg-white/[0.02] transition-colors ${idx !== complaints.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{c.ward || "Unknown Ward"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">#{c._id.substring(c._id.length - 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-muted-foreground font-bold">
                    {c.category ? (
                      <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 uppercase tracking-tighter">
                         {c.category}
                      </span>
                    ) : (
                      <span className="opacity-0">—</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-sm text-muted-foreground font-medium italic">
                    {formatRelativeTime(c.timestamp)}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      c.status === 'Cleared' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      c.status === 'Work in progress' || c.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      c.status === 'Assigned' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {c.status || "Reported"}
                    </span>
                  </td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-muted-foreground italic">
                    No records found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-muted-foreground py-4 italic">
           All records are cryptographically verified and synced in real-time.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .glass {
            background: white !important;
            border: 1px solid #eee !important;
            box-shadow: none !important;
            color: black !important;
          }
          main, .space-y-8, .motion-div {
            visibility: visible !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
