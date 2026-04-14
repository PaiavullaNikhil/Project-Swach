"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, Award, Clock, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const timeData = [
  { time: '08:00', volume: 12 },
  { time: '10:00', volume: 25 },
  { time: '12:00', volume: 45 },
  { time: '14:00', volume: 38 },
  { time: '16:00', volume: 52 },
  { time: '18:00', volume: 68 },
  { time: '20:00', volume: 32 },
];

const categoryData = [
  { name: 'Solid Waste', value: 400 },
  { name: 'Liquid/Sewage', value: 300 },
  { name: 'Hazardous', value: 100 },
  { name: 'E-Waste', value: 200 },
];

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b'];

const topReporters = [
  { name: "S. Murthy", reports: 86, rating: "98%" },
  { name: "P. Venkat", reports: 72, rating: "95%" },
  { name: "L. Khan", reports: 65, rating: "99%" },
];

export default function AnalyticsPage() {
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
            <span className="text-xs text-muted-foreground font-mono">LIVE PEAK: 68 r/h</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
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
        </motion.div>

        {/* Category Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-6">Category Distribution</h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4 pr-12">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-medium">{c.name}</span>
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
            <div className="flex gap-2">
               <button className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold">BY WARD</button>
               <button className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold">BY CATEGORY</button>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'HSR', time: 12 }, { name: 'Kora', time: 24 }, { name: 'Indira', time: 18 }, { name: 'BTM', time: 32 }, { name: 'Jaya', time: 14 }
              ]}>
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
        </motion.div>

        {/* Top Reporters Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-6 rounded-3xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
               <Award className="w-5 h-5 text-green-500" />
               Leaderboard: Top Reporters
            </h3>
            <button className="text-xs text-primary font-bold hover:underline">VIEW ALL ACHIEVEMENTS</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reporter (Pseudonym)</th>
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valid Reports</th>
                  <th className="pb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Rate</th>
                  <th className="pb-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topReporters.map((r, i) => (
                  <tr key={r.name} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="font-medium">{r.name}</span>
                    </td>
                    <td className="py-4 text-sm font-bold">{r.reports}</td>
                    <td className="py-4 text-sm text-green-500 font-bold">{r.rating}</td>
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
