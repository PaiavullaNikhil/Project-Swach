"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, Award, Clock, ArrowUpRight, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching analytics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Aggregating real-time data...</p>
      </div>
    );
  }

  if (!analytics) return <div>Failed to load analytics</div>;

  // Format hourly data: map { _id: 8, volume: 10 } to { time: '08:00', volume: 10 }
  const formattedHourly = Array.from({ length: 24 }, (_, i) => {
    const existing = analytics.hourlyStats?.find((h: any) => h._id === i);
    return {
      time: `${i.toString().padStart(2, '0')}:00`,
      volume: existing?.volume || 0
    };
  }).filter((_, i) => i % 2 === 0); // Show every 2 hours for clarity

  // Format ward data for area chart
  const formattedWardRes = analytics.wardPerformance?.map((w: any) => ({
    name: w.name || "Unknown",
    time: Number((w.avgResolutionTime || 0).toFixed(1))
  })) || [];

  const filteredWorkers = analytics.bestWorkers?.filter((w: any) => 
    w.ward?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
        <p className="text-muted-foreground mt-1">Deep dive into operational metrics and trends</p>
      </header>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Hourly Volume */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-primary" />
               Hourly Report Volume
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              PEAK: {Math.max(...formattedHourly.map(h => h.volume))} r/h
            </span>
          </div>
          <div className="h-[300px] overflow-x-auto overflow-y-hidden custom-scrollbar">
            <div style={{ minWidth: Math.max(formattedHourly.length * 60, 500), height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedHourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#18181b' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-6">Resolution Status Breakdown</h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.statusStats?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8 min-w-[140px]">
              {analytics.statusStats?.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs font-medium truncate max-w-[100px]">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Avg Resolution Time (Ward-wise Area Chart) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6 rounded-3xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Avg. Resolution Time (Hours)
            </h3>
            <div className="flex gap-2 text-[10px] font-bold text-muted-foreground">
               REAL-TIME PERFORMANCE BY WARD
            </div>
          </div>
          <div className="h-[350px] overflow-x-auto overflow-y-hidden custom-scrollbar">
            <div style={{ minWidth: Math.max(formattedWardRes.length * 80, 800), height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedWardRes}>
                  <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="time" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTime)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Best Workers Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-6 rounded-3xl lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
               <Award className="w-5 h-5 text-green-500" />
               Ward-wise Best Workers
            </h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search ward or worker..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ward</th>
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Worker</th>
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completions</th>
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Time (Hrs)</th>
                  <th className="pb-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredWorkers.map((w: any, i: number) => (
                  <tr key={w.ward} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <span className="text-sm font-medium">{w.ward}</span>
                    </td>
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {w.name?.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-medium text-sm">{w.name}</span>
                    </td>
                    <td className="py-4 text-sm font-bold">{w.reports}</td>
                    <td className="py-4 text-sm text-green-500 font-bold whitespace-nowrap">
                       <Clock className="inline-block w-3 h-3 mr-2 text-amber-500" />
                       {w.avgTime ? w.avgTime.toFixed(1) : "0.0"} hrs
                    </td>
                    <td className="py-4 text-right">
                       <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
