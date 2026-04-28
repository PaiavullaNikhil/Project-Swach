"use client";

import dynamic from "next/dynamic";
import { Search, Filter, Layers, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BANGALORE_WARDS } from "@/constants/wards";

// Dynamically import Map component to avoid SSR issues with Leaflet
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground">Loading Map Engine...</div>
});

const healthFilters = [
  { key: null, label: "All Wards", color: null },
  { key: "high", label: "High Load (6+)", color: "bg-[#ef4444]" },
  { key: "warning", label: "Warning (3-5)", color: "bg-[#f97316]" },
  { key: "low", label: "Low Load (1-2)", color: "bg-[#eab308]" },
  { key: "healthy", label: "Healthy (0)", color: "bg-[#22c55e]" },
] as const;

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [wardSearch, setWardSearch] = useState("");
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [layers, setLayers] = useState({
    wards: true,
    complaints: true,
    workers: true,
  });
  const [wardHealthFilter, setWardHealthFilter] = useState<string | null>(null);

  const filterPanelRef = useRef<HTMLDivElement>(null);
  const layersPanelRef = useRef<HTMLDivElement>(null);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
      if (layersPanelRef.current && !layersPanelRef.current.contains(e.target as Node)) {
        setShowLayersPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredWards = BANGALORE_WARDS.filter(w =>
    w.toLowerCase().includes(wardSearch.toLowerCase())
  );

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedWard(null);
    setWardSearch("");
    setWardHealthFilter(null);
  };

  const hasActiveFilters = searchQuery !== "" || selectedWard !== null || wardHealthFilter !== null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-2xl glass border border-white/5">
        <div className="flex gap-4 flex-1 max-w-4xl items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by ward or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ward Health Filter Buttons */}
          <div className="flex gap-2">
            {healthFilters.map(f => (
              <button 
                key={f.key ?? "all"} 
                onClick={() => setWardHealthFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  wardHealthFilter === f.key
                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(var(--color-primary-rgb,59,130,246),0.2)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white"
                }`}
              >
                {f.color && <span className={`w-2 h-2 rounded-full ${f.color}`} />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Active Ward Filter Badge */}
          {selectedWard && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-400 font-medium animate-in">
              <span className="truncate max-w-[120px]">{selectedWard.split(" (")[0]}</span>
              <button onClick={() => setSelectedWard(null)} className="hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 items-center">
          {/* Clear All Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
            >
              Clear All
            </button>
          )}

          {/* Filter (Ward) Panel Toggle */}
          <div className="relative" ref={filterPanelRef}>
            <button 
              onClick={() => { setShowFilterPanel(!showFilterPanel); setShowLayersPanel(false); }}
              className={`p-2 border rounded-xl transition-all duration-200 ${
                showFilterPanel || selectedWard
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              title="Filter by Ward"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Ward Filter Dropdown */}
            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-2 w-72 glass border border-white/10 rounded-xl p-3 z-[2000] shadow-2xl animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filter by Ward</h4>
                  {selectedWard && (
                    <button
                      onClick={() => setSelectedWard(null)}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search wards..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                  {filteredWards.map(ward => (
                    <button
                      key={ward}
                      onClick={() => { setSelectedWard(ward === selectedWard ? null : ward); setShowFilterPanel(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                        selectedWard === ward
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {ward}
                    </button>
                  ))}
                  {filteredWards.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">No wards found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Layers Panel Toggle */}
          <div className="relative" ref={layersPanelRef}>
            <button 
              onClick={() => { setShowLayersPanel(!showLayersPanel); setShowFilterPanel(false); }}
              className={`p-2 border rounded-xl transition-all duration-200 ${
                showLayersPanel
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              title="Toggle Map Layers"
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Layers Dropdown */}
            {showLayersPanel && (
              <div className="absolute right-0 top-full mt-2 w-56 glass border border-white/10 rounded-xl p-3 z-[2000] shadow-2xl animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Map Layers</h4>
                <div className="space-y-2">
                  {([
                    { key: "wards" as const, label: "Ward Boundaries", color: "bg-emerald-400" },
                    { key: "complaints" as const, label: "Complaint Pins", color: "bg-red-400" },
                    { key: "workers" as const, label: "Worker Locations", color: "bg-blue-400" },
                  ]).map(layer => (
                    <label key={layer.key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={layers[layer.key]}
                          onChange={() => toggleLayer(layer.key)}
                          className="sr-only peer"
                        />
                        <div className={`w-8 h-4.5 rounded-full transition-colors duration-200 ${
                          layers[layer.key] ? "bg-primary/60" : "bg-white/10"
                        }`}>
                          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 shadow-sm ${
                            layers[layer.key] ? "left-[calc(100%-1rem)] bg-white" : "left-0.5 bg-white/50"
                          }`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${layer.color}`} />
                        <span className="text-xs">{layer.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex-1 rounded-2xl overflow-hidden glass border border-white/10 relative">
        <LiveMap 
          searchQuery={searchQuery}
          wardFilter={selectedWard}
          layers={layers}
          wardHealthFilter={wardHealthFilter}
          onWardHealthFilterChange={setWardHealthFilter}
        />
      </div>
    </div>
  );
}
