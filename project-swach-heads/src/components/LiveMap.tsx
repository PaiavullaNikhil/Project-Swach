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
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const trashIcon = L.icon({
  iconUrl: "/trash.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

import { AssignmentModal } from "./AssignmentModal";

interface ComplaintPin {
  id: string;
  lat: number;
  lng: number;
  ward: string;
  status: string;
}

interface apiComplaint {
  _id: string;
  location: { coordinates: [number, number] };
  ward?: string;
  status: string;
}

interface WorkerLocation {
  worker_id: string;
  lat: number;
  lon: number;
  name?: string;
}

export default function LiveMap() {
  const [mounted, setMounted] = useState(false);
  const [pins, setPins] = useState<ComplaintPin[]>([]);
  const [workers, setWorkers] = useState<WorkerLocation[]>([]);
  const [wardGeoData, setWardGeoData] = useState<any>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [, setSocket] = useState<any>(null);

  // Stats aggregation by ward
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

  const wardStyle = (feature: any) => {
    const wardName = `${feature.properties.name_en} (Ward ${feature.properties.id})`;
    const active = wardStats[wardName]?.active || 0;
    return {
      fillColor: getColor(active),
      weight: 1.5,
      opacity: 0.8,
      color: '#000000',
      fillOpacity: 0.6
    };
  };

  const fetchPins = () => {
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapPins = data.map((c: apiComplaint) => ({
            id: c._id,
            lat: c.location.coordinates[1],
            lng: c.location.coordinates[0],
            ward: c.ward || "Unknown",
            status: c.status
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
        {wardGeoData && (
          <GeoJSON 
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
                  l.setStyle({ fillOpacity: 0.6, weight: 1 });
                }
              });
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 right-6 glass p-4 rounded-xl z-[1000] border border-white/10 space-y-2">
        <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Ward Health</h5>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> High Load (6+)
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" /> Warning (3-5)
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#eab308]" /> Low Load (1-2)
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Healthy (0)
        </div>
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
