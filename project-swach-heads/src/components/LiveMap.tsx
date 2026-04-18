"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
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
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [, setSocket] = useState<any>(null);

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
        {pins.map((pin) => (
          <Marker 
            key={pin.id} 
            position={[pin.lat, pin.lng]} 
            icon={trashIcon}
          >
            <Popup className="dark-popup">
              <div className="p-2 bg-zinc-900 text-white rounded-lg min-w-[150px]">
                <h4 className="font-bold text-sm mb-1">{pin.ward}</h4>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-muted-foreground">Status:</span>
                    <span className={`text-[10px] font-bold ${pin.status === 'Reported' ? 'text-blue-400' : 'text-amber-400'}`}>{pin.status}</span>
                </div>
                {pin.status === 'Reported' && (
                    <button 
                        onClick={() => setSelectedComplaintId(pin.id)}
                        className="w-full bg-primary py-2 rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-all uppercase tracking-wider"
                    >
                        ASSIGN WORKER
                    </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {workers.map((worker) => (
            <Marker
                key={worker.worker_id}
                position={[worker.lat, worker.lon]}
                icon={truckIcon}
            >
                <Popup className="dark-popup">
                    <div className="p-2 bg-zinc-900 text-white rounded-lg min-w-[100px]">
                        <h4 className="font-bold text-sm mb-1">{worker.name || "Worker"}</h4>
                        <p className="text-[10px] text-muted-foreground">ID: {worker.worker_id}</p>
                    </div>
                </Popup>
            </Marker>
        ))}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 right-6 glass p-4 rounded-xl z-[1000] border border-white/10 space-y-2">
        <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Map Legend</h5>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Reported
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Assigned
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Resolved
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
