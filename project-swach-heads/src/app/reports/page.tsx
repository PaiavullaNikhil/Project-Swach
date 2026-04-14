"use client";

import { useEffect, useState } from "react";
import { FileText, Download, TrendingUp, TrendingDown, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Calculating report data...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Weekly Automated Reports</h2>
        <p className="text-muted-foreground mt-1">System-generated performance summaries and audits</p>
      </header>

      {/* Latest Report Highlight */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass p-8 rounded-[2rem] border-primary/20 bg-primary/5">
        <div className="flex justify-between items-start mb-8">
          <div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Live Performance Snapshot</span>
            <h3 className="text-2xl font-bold mt-3">Operational Summary as of {new Date().toLocaleDateString()}</h3>
          </div>
          <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
            <Download className="w-5 h-5" />
            DOWNLOAD PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Total Complaints</p>
            <p className="text-4xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-blue-500 font-bold flex items-center gap-1">
              Current system load
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Resolution Rate</p>
            <p className="text-4xl font-bold">
              {stats?.total > 0 ? Math.round((stats.cleared / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              {stats?.cleared || 0} Issues resolved
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Escalation Ratio</p>
            <p className="text-4xl font-bold text-amber-500">
              {stats?.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-amber-500 font-bold flex items-center gap-1">
              {stats?.escalated || 0} Delayed reports
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Avg Resolution Time</p>
            <p className="text-4xl font-bold">{stats?.workers?.avgResponse || "0m"}</p>
            <p className="text-xs text-muted-foreground font-bold flex items-center gap-1">
              System average
            </p>
          </div>
        </div>
      </motion.div>

      {/* Archives Table Placeholder - No fake data allowed */}
      <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl mt-12 border-dashed border-2 border-white/5">
         <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
         <h4 className="text-xl font-bold">Report Archives Empty</h4>
         <p className="text-muted-foreground text-sm">Automated weekly backups will appear here as they are generated.</p>
      </div>
    </div>
  );
}
