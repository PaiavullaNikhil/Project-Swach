"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

// Fix for default marker icons in Leaflet with Next.js
const customIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ComplaintPin {
  id: string;
  lat: number;
  lng: number;
  ward: string;
  status: string;
}

export default function LiveMap() {
  const [mounted, setMounted] = useState(false);
  const [pins, setPins] = useState<ComplaintPin[]>([]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapPins = data.map((c: any) => ({
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
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full h-full">
      <MapContainer 
        center={[12.9345, 77.6265]} 
        zoom={13} 
        style={{ height: "100%", width: "100%", filter: "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)" }}
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
            icon={customIcon}
          >
            <Popup className="dark-popup">
              <div className="p-2 bg-zinc-900 text-white rounded-lg">
                <h4 className="font-bold">{pin.ward}</h4>
                <p className="text-xs text-muted-foreground">Status: {pin.status}</p>
                <button className="mt-2 w-full bg-primary py-1 rounded text-[10px] font-bold">VIEW DETAILS</button>
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
    </div>
  );
}
