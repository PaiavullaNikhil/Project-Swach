"use client";

import dynamic from "next/dynamic";
import { Search, Filter, Layers } from "lucide-react";

// Dynamically import Map component to avoid SSR issues with Leaflet
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground">Loading Map Engine...</div>
});

const filters = ["All Status", "High Priority", "Reported", "Assigned", "Resolved"];

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-2xl glass border border-white/5">
        <div className="flex gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by ward or ID..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button key={f} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors">
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10">
            <Filter className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10">
            <Layers className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 rounded-2xl overflow-hidden glass border border-white/10 relative">
        <LiveMap />
      </div>
    </div>
  );
}
