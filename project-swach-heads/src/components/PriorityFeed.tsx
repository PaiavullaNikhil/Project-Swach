"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowUp, MapPin, UserPlus } from "lucide-react";
import { AssignmentModal } from "./AssignmentModal";
import Link from "next/link";

interface Complaint {
  _id: string;
  photo_url: string;
  ward: string;
  upvotes: number;
  timestamp: string;
  status: string;
  worker_name?: string;
}

export function PriorityFeed() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const fetchComplaints = () => {
    setLoading(true);
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter out cleared/resolved complaints, show only active ones sorted by most recent
          const active = data
            .filter((c: Complaint) => c.status !== "Cleared" && c.status !== "Resolved")
            .sort((a: Complaint, b: Complaint) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
          setComplaints(active);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching complaints:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSuccess = () => {
    fetchComplaints();
  };

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Priority Feed
        </h3>
        <Link 
          href="/reports/complaints" 
          className="text-sm text-primary hover:underline transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="space-y-4">
             {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No active complaints found.</div>
        ) : (
          complaints.map((c) => (
            <div 
              key={c._id} 
              onClick={() => c.status === 'Reported' && setSelectedComplaintId(c._id)}
              className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10"
            >
              <img src={c.photo_url} alt="Waste" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold">{c.ward || "Unknown Area"}</span>
                  <div className="flex items-center gap-2">
                    {c.status === 'Reported' && (
                      <div className="p-1 bg-primary/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <UserPlus className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-full">
                      {new Date(c.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-green-500" />
                    {c.upvotes || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {c._id.slice(-4)}
                  </span>
                  <span className={c.status === 'Reported' ? 'text-blue-400 font-bold' : 'text-amber-400 font-bold'}>
                    {c.status}
                    {c.worker_name && (
                      <span className="hidden group-hover:inline ml-2 text-white/70 font-normal">
                        ({c.worker_name})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedComplaintId && (
        <AssignmentModal 
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
