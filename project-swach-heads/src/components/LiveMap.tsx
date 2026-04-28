"use client";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";

// Fix for default marker icons in Leaflet with Next.js
// Marker icons setup
const truckIcon = L.icon({
  iconUrl: "/truck.png",
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

const trashIcon = L.icon({
  iconUrl: "/trash.png",
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

import { AssignmentModal } from "./AssignmentModal";

interface ComplaintPin {
  id: string;
  lat: number;
  lng: number;
  ward: string;
  status: string;
  priorityScore?: number;
}

interface apiComplaint {
  _id: string;
  location: { coordinates: [number, number] };
  ward?: string;
  status: string;
  priorityScore?: number;
}

interface WorkerLocation {
  worker_id: string;
  lat: number;
  lon: number;
  name?: string;
}

interface LiveMapProps {
  searchQuery: string;
  wardFilter: string | null;
  layers: {
    wards: boolean;
    complaints: boolean;
    workers: boolean;
  };
  wardHealthFilter: string | null;
  onWardHealthFilterChange: (filter: string | null) => void;
}

export default function LiveMap({ searchQuery, wardFilter, layers, wardHealthFilter, onWardHealthFilterChange }: LiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const [pins, setPins] = useState<ComplaintPin[]>([]);
  const [workers, setWorkers] = useState<WorkerLocation[]>([]);
  const [wardGeoData, setWardGeoData] = useState<any>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [, setSocket] = useState<any>(null);

  // Stats aggregation by ward (uses ALL pins so ward heat stays accurate)
  const wardStats = useMemo(() => {
    const stats: Record<string, { active: number, total: number, complaints: ComplaintPin[] }> = {};
    pins.forEach(pin => {
      if (!stats[pin.ward]) {
        stats[pin.ward] = { active: 0, total: 0, complaints: [] };
      }
      stats[pin.ward].total++;
      if (pin.status === 'Reported' || pin.status === 'Assigned') {
        stats[pin.ward].active++;
      }
      stats[pin.ward].complaints.push(pin);
    });
    return stats;
  }, [pins]);

  const getColor = (activeCount: number) => {
    if (activeCount === 0) return "#22c55e"; // Green
    if (activeCount < 3) return "#eab308";  // Yellow/Amber
    if (activeCount < 6) return "#f97316";  // Orange
    return "#ef4444"; // Red
  };

  // Helper to get health level for a ward based on active complaint count
  const getHealthLevel = (activeCount: number): string => {
    if (activeCount >= 6) return "high";
    if (activeCount >= 3) return "warning";
    if (activeCount >= 1) return "low";
    return "healthy";
  };

  // Determine which wards match the health filter
  const wardsMatchingHealth = useMemo(() => {
    if (!wardHealthFilter) return null; // null means no filter active
    const matching = new Set<string>();
    Object.entries(wardStats).forEach(([wardName, stats]) => {
      if (getHealthLevel(stats.active) === wardHealthFilter) {
        matching.add(wardName);
      }
    });
    return matching;
  }, [wardStats, wardHealthFilter]);

  // Filter pins based on search, ward, and health filters
  const filteredPins = useMemo(() => {
    let result = pins;

    // Ward filter
    if (wardFilter) {
      result = result.filter(pin => pin.ward === wardFilter);
    }

    // Search filter - by ward name or complaint ID
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(pin =>
        pin.ward.toLowerCase().includes(q) ||
        pin.id.toLowerCase().includes(q)
      );
    }

    // Ward health filter - only show pins in wards matching the selected health level
    if (wardsMatchingHealth) {
      result = result.filter(pin => wardsMatchingHealth.has(pin.ward));
    }

    return result;
  }, [pins, searchQuery, wardFilter, wardsMatchingHealth]);

  const wardStyle = (feature: any) => {
    const wardName = `${feature.properties.name_en} (Ward ${feature.properties.id})`;
    const active = wardStats[wardName]?.active || 0;

    // If a ward filter is active, dim non-matching wards
    const isMatchingWard = !wardFilter || wardName === wardFilter;
    // If search is active, dim wards that don't match
    const matchesSearch = !searchQuery.trim() || wardName.toLowerCase().includes(searchQuery.trim().toLowerCase());
    // If health filter is active, dim wards that don't match the health level
    const matchesHealth = !wardHealthFilter || getHealthLevel(active) === wardHealthFilter;

    const isVisible = isMatchingWard && matchesSearch && matchesHealth;

    return {
      fillColor: getColor(active),
      weight: isVisible ? 1.5 : 0.5,
      opacity: isVisible ? 0.8 : 0.2,
      color: '#000000',
      fillOpacity: isVisible ? 0.6 : 0.08
    };
  };

  const fetchPins = () => {
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapPins = data
            .filter((c: apiComplaint) => c.status !== "Cleared" && c.status !== "Resolved")
            .map((c: apiComplaint) => ({
              id: c._id,
              lat: c.location.coordinates[1],
              lng: c.location.coordinates[0],
              ward: c.ward || "Unknown",
              status: c.status,
              priorityScore: c.priorityScore || 0
            }));
          setPins(mapPins);
        }
      })
      .catch(err => console.error("Error fetching pins:", err));
  };

  const fetchWorkers = () => {
    fetch("/api/workers")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            const activeWorkers = data
                .filter(w => w.current_location)
                .map(w => ({
                    worker_id: w.worker_id,
                    lat: w.current_location.coordinates[1],
                    lon: w.current_location.coordinates[0],
                    name: w.name
                }));
            setWorkers(activeWorkers);
        }
      })
      .catch(err => console.error("Error fetching workers:", err));
  };

  useEffect(() => {
    setMounted(true);
    fetchPins();
    fetchWorkers();

    // Fetch GeoJSON ward data
    fetch("/wards.json")
      .then(res => res.json())
      .then(data => setWardGeoData(data))
      .catch(err => console.error("Error loading ward GeoJSON:", err));

    // Socket setup - the API_URL should be the backend URL, for now let's use the current origin's port change or similar
    // Assuming backend is at :8001 as seen in main.py
    const backendUrl = "http://127.0.0.1:8001"; // In production this would be an env var
    const newSocket = io(backendUrl, {
        path: '/ws/socket.io',
        transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on("location_update", (data: { worker_id: string, lat: number, lon: number }) => {
        setWorkers(prev => {
            const index = prev.findIndex(w => w.worker_id === data.worker_id);
            if (index > -1) {
                const updated = [...prev];
                updated[index] = { ...updated[index], lat: data.lat, lon: data.lon };
                return updated;
            }
            return [...prev, { worker_id: data.worker_id, lat: data.lat, lon: data.lon }];
        });
    });

    newSocket.on("status_update", () => {
        fetchPins(); // Simplest way to ensure consistency
    });

    return () => {
        newSocket.close();
    };
  }, []);

  if (!mounted) return null;

  // GeoJSON key that changes when filters change to force re-render of ward styles
  const geoJsonKey = `${wardFilter || "all"}-${searchQuery}-${wardHealthFilter || "none"}`;

  return (
    <div className="w-full h-full">
      <MapContainer 
        center={[12.9345, 77.6265]} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ward boundaries layer */}
        {layers.wards && wardGeoData && (
          <GeoJSON 
            key={geoJsonKey}
            data={wardGeoData} 
            style={wardStyle}
            onEachFeature={(feature, layer) => {
              const wardName = `${feature.properties.name_en} (Ward ${feature.properties.id})`;
              const stats = wardStats[wardName] || { active: 0, total: 0, complaints: [] };
              
              layer.bindPopup(`
                <div class="p-3 bg-zinc-900 text-white rounded-lg min-w-[200px]">
                  <h4 class="font-bold text-base mb-1 border-b border-white/10 pb-1">${wardName}</h4>
                  <div class="space-y-2 mt-2">
                    <div class="flex justify-between text-xs">
                      <span>Active Complaints:</span>
                      <span class="font-bold text-red-400">${stats.active}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span>Total Issues:</span>
                      <span class="font-bold text-blue-400">${stats.total}</span>
                    </div>
                  </div>
                  <div class="mt-4 pt-2 border-t border-white/10 text-[10px] text-muted-foreground italic">
                    Click "Priority Feed" in dashboard to manage individual assignments.
                  </div>
                </div>
              `, { className: 'dark-popup' });

              layer.on({
                mouseover: (e) => {
                  const l = e.target;
                  l.setStyle({ fillOpacity: 0.8, weight: 2 });
                },
                mouseout: (e) => {
                  const l = e.target;
                  // Re-apply proper style on mouseout
                  const isMatchingWard = !wardFilter || wardName === wardFilter;
                  const matchesSearch = !searchQuery.trim() || wardName.toLowerCase().includes(searchQuery.trim().toLowerCase());
                  const matchesHealth = !wardHealthFilter || getHealthLevel(wardStats[wardName]?.active || 0) === wardHealthFilter;
                  const isVisible = isMatchingWard && matchesSearch && matchesHealth;
                  l.setStyle({ 
                    fillOpacity: isVisible ? 0.6 : 0.08, 
                    weight: isVisible ? 1.5 : 0.5 
                  });
                }
              });
            }}
          />
        )}

        {/* Complaint pins layer - uses filtered pins */}
        {layers.complaints && filteredPins.map(pin => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={trashIcon}>
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold">{pin.ward}</p>
                <p>Status: <span className={`font-semibold ${
                  pin.status === "Reported" ? "text-red-500" : 
                  pin.status === "Assigned" ? "text-amber-500" : 
                  "text-green-500"
                }`}>{pin.status}</span></p>
                <p className="text-muted-foreground text-[10px]">ID: {pin.id}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Worker markers layer */}
        {layers.workers && workers.map(w => (
          <Marker key={w.worker_id} position={[w.lat, w.lon]} icon={truckIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{w.name || w.worker_id}</p>
                <p className="text-muted-foreground">Worker</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend Overlay - Clickable Ward Health Filters */}
      <div className="absolute bottom-6 right-6 glass p-4 rounded-xl z-[1000] border border-white/10 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ward Health</h5>
          {wardHealthFilter && (
            <button
              onClick={() => onWardHealthFilterChange(null)}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {([
          { key: "high", color: "bg-[#ef4444]", label: "High Load (6+)" },
          { key: "warning", color: "bg-[#f97316]", label: "Warning (3-5)" },
          { key: "low", color: "bg-[#eab308]", label: "Low Load (1-2)" },
          { key: "healthy", color: "bg-[#22c55e]", label: "Healthy (0)" },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => onWardHealthFilterChange(wardHealthFilter === item.key ? null : item.key)}
            className={`flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded-lg transition-all duration-200 ${
              wardHealthFilter === item.key
                ? "bg-white/10 text-white font-semibold"
                : wardHealthFilter && wardHealthFilter !== item.key
                  ? "text-muted-foreground/40 hover:text-muted-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${item.color} transition-transform duration-200 ${
              wardHealthFilter === item.key ? "scale-125" : ""
            }`} />
            {item.label}
            {wardHealthFilter === item.key && (
              <span className="ml-auto text-[10px] text-primary font-bold">
                {wardsMatchingHealth?.size || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedComplaintId && (
        <AssignmentModal 
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onSuccess={fetchPins}
        />
      )}
    </div>
  );
}
