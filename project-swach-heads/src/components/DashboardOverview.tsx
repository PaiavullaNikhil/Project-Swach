"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { PriorityFeed } from "@/components/PriorityFeed";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { Activity, CheckCircle, Clock, AlertTriangle, PieChart as PieIcon } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardOverview() {
  const [stats, setStats] = useState({ total: 0, active: 0, cleared: 0, escalated: 0 });
  const [wardData, setWardData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trends, setTrends] = useState<{name: string, complaints: number, resolved: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stats Fetching
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(err => console.error("Error fetching stats:", err));

    // Analytics Fetching
    fetch("/api/analytics")
      .then(res => res.json())
      .then(data => {
        if (data.wardPerformance) setWardData(data.wardPerformance);
        if (data.dailyTrends) setTrends(data.dailyTrends);
        if (data.categoryStats) setCategoryData(data.categoryStats);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching analytics:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground mt-1">Live monitoring and operational health</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <div className="flex items-center gap-2 justify-end mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-muted-foreground font-mono">LIVE FEED ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Complaints" 
          value={stats.total} 
          icon={Activity} 
          trend={stats.total > 0 ? "Real-time" : "No data"} 
          trendUp 
        />
        <StatsCard 
          title="Active Issues" 
          value={stats.active} 
          icon={AlertTriangle} 
          trend={stats.active > 10 ? "High Load" : "Healthy"} 
          trendUp={stats.active > 10} 
        />
        <StatsCard 
          title="Cleared" 
          value={stats.cleared} 
          icon={CheckCircle} 
          trend={`${stats.total > 0 ? Math.round((stats.cleared/stats.total) * 100) : 0}% Rate`} 
          trendUp 
        />
        <StatsCard 
          title="Escalations" 
          value={stats.escalated} 
          icon={Clock} 
          trend={stats.escalated > 0 ? "Needs Review" : "Clear"} 
          trendUp={stats.escalated > 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Complaint vs Resolution Trends</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-primary"></div> Reported
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div> Resolved
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading trend data...</div>
              ) : trends.length === 0 || trends.every(t => t.complaints === 0 && t.resolved === 0) ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">No trend data available for the last 7 days</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fafafa' }}
                    />
                    <Area type="monotone" dataKey="complaints" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReported)" />
                    <Area type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold mb-6">Ward-wise Performance</h3>
            <div className="h-[300px]">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading performance data...</div>
              ) : wardData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">No ward performance data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-lg shadow-2xl">
                              <p className="text-xs font-bold mb-2 border-b border-white/10 pb-1">{label}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4 text-[10px]">
                                  <span className="text-primary font-medium uppercase">Resolved:</span>
                                  <span className="font-bold text-white">{payload[0].value}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-[10px]">
                                  <span className="text-amber-500 font-medium uppercase">Active:</span>
                                  <span className="font-bold text-white">{payload[1].value}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="cleared" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active" fill="#27272a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Analytics Area */}
        <div className="lg:col-span-1 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Category Distribution</h3>
            </div>
            <div className="h-[250px] relative">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Analyzing categories...</div>
              ) : categoryData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">No category data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryData.map((entry: any, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-muted-foreground truncate">{entry.name}</span>
                  <span className="font-bold ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <PriorityFeed />
        </div>
      </div>
    </div>
  );
}
