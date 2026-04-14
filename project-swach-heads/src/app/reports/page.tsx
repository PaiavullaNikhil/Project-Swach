"use client";

import { FileText, Download, TrendingUp, TrendingDown, Award } from "lucide-react";
import { motion } from "framer-motion";

const reports = [
  { id: "REP-2026-W15", date: "April 14, 2026", week: "Week 15", status: "Generated" },
  { id: "REP-2026-W14", date: "April 07, 2026", week: "Week 14", status: "Archived" },
  { id: "REP-2026-W13", date: "March 31, 2026", week: "Week 13", status: "Archived" },
];

export default function ReportsPage() {
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
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Latest Report</span>
            <h3 className="text-2xl font-bold mt-3">Summary for April 07 – April 14, 2026</h3>
          </div>
          <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
            <Download className="w-5 h-5" />
            DOWNLOAD PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Total Complaints</p>
            <p className="text-4xl font-bold">1,248</p>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14.2% from last week
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Resolution Rate</p>
            <p className="text-4xl font-bold">92.4%</p>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.1% improvement
            </p>
          </div>
          <div className="space-y-2 text-destructive">
            <p className="text-sm text-muted-foreground font-medium">Worst Performing Ward</p>
            <p className="text-xl font-bold uppercase">BTM Layout</p>
            <p className="text-xs font-bold flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> 62% closure rate
            </p>
          </div>
          <div className="space-y-2 text-green-500">
            <p className="text-sm text-muted-foreground font-medium">Star Performer</p>
            <p className="text-xl font-bold">Anita Desai</p>
            <p className="text-xs font-bold flex items-center gap-1">
              <Award className="w-3 h-3" /> 100% completion
            </p>
          </div>
        </div>
      </motion.div>

      {/* Archives Table */}
      <h4 className="text-xl font-bold mt-12">Report Archives</h4>
      <div className="glass rounded-3xl overflow-hidden mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5">
              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Report ID</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Generation Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground">Status</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-5 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium">{r.id}</span>
                </td>
                <td className="px-6 py-5 text-sm">{r.date}</td>
                <td className="px-6 py-5">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                    r.status === 'Generated' ? 'bg-green-500/10 text-green-500' : 'bg-white/10 text-muted-foreground'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <Download className="w-4 h-4 text-muted-foreground hover:text-white" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
