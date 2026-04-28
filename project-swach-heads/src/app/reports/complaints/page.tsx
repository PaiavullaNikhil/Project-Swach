"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Filter, ArrowUp, MapPin, UserPlus, X, ChevronDown, ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AssignmentModal } from "@/components/AssignmentModal";
import Link from "next/link";

interface Complaint {
  _id: string;
  photo_url: string;
  ward: string;
  upvotes: number;
  timestamp: string;
  status: string;
  worker_name?: string;
  priorityScore?: number;
}

const statusOptions = ["All", "Reported", "Assigned", "Cleared"];
const sortOptions = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Priority Score", value: "priority" },
];

const statusConfig: Record<string, { color: string; bg: string; icon: typeof AlertCircle }> = {
  Reported: { color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", icon: AlertCircle },
  Assigned: { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", icon: Loader2 },
  Cleared: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: CheckCircle },
};

export default function AllComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const fetchComplaints = () => {
    setLoading(true);
    fetch("/api/complaints")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComplaints(data);
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

  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    // Status filter
    if (activeStatus !== "All") {
      result = result.filter(c => c.status === activeStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(c =>
        (c.ward || "").toLowerCase().includes(q) ||
        c._id.toLowerCase().includes(q) ||
        (c.worker_name || "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case "upvotes":
        result.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case "priority":
        result.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        break;
    }

    return result;
  }, [complaints, activeStatus, searchQuery, sortBy]);

  // Stats counts
  const counts = useMemo(() => {
    const c = { all: complaints.length, Reported: 0, Assigned: 0, Cleared: 0 };
    complaints.forEach(comp => {
      if (comp.status in c) c[comp.status as keyof typeof c]++;
    });
    return c;
  }, [complaints]);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { color: "text-muted-foreground", bg: "bg-white/5 border-white/10", icon: AlertCircle };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const handleSuccess = () => {
    fetchComplaints();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/" 
          className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Complaints</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Showing {filteredComplaints.length} of {complaints.length} total reports
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {([
          { key: "All", label: "Total", count: counts.all, color: "from-blue-500/20 to-cyan-500/20", text: "text-blue-400" },
          { key: "Reported", label: "Reported", count: counts.Reported, color: "from-blue-500/20 to-indigo-500/20", text: "text-blue-400" },
          { key: "Assigned", label: "Assigned", count: counts.Assigned, color: "from-amber-500/20 to-orange-500/20", text: "text-amber-400" },
          { key: "Cleared", label: "Cleared", count: counts.Cleared, color: "from-emerald-500/20 to-green-500/20", text: "text-emerald-400" },
        ]).map(card => (
          <button
            key={card.key}
            onClick={() => setActiveStatus(card.key)}
            className={`glass rounded-2xl p-5 text-left transition-all duration-200 border ${
              activeStatus === card.key 
                ? "border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                : "border-white/5 hover:border-white/10"
            }`}
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.text}`}>{card.count}</p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 glass rounded-2xl p-4 border border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ward, ID, or worker name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                activeStatus === s
                  ? "bg-primary/20 border border-primary/50 text-primary"
                  : "bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white"
              }`}
            >
              {s}
              <span className="ml-1.5 opacity-60">
                {s === "All" ? counts.all : counts[s as keyof typeof counts] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            {sortOptions.find(s => s.value === sortBy)?.label}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-2 w-44 glass border border-white/10 rounded-xl py-1 z-50 shadow-2xl">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                    sortBy === opt.value ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 glass rounded-2xl border border-white/5">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-bold">No complaints found</h4>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredComplaints.map((c, idx) => (
              <motion.div
                key={c._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx < 10 ? idx * 0.03 : 0 }}
                onClick={() => c.status === 'Reported' && setSelectedComplaintId(c._id)}
                className={`flex gap-5 p-4 rounded-2xl transition-all duration-200 group border glass ${
                  c.status === 'Reported' 
                    ? "cursor-pointer hover:border-primary/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "border-white/5"
                }`}
              >
                {/* Image */}
                <img 
                  src={c.photo_url} 
                  alt="Waste report" 
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold truncate">{c.ward || "Unknown Area"}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(c.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        {" · "}
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.status === 'Reported' && (
                        <div className="p-1.5 bg-primary/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Assign Worker">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      {getStatusBadge(c.status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      {c.upvotes || 0} upvotes
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      ID: ...{c._id.slice(-6)}
                    </span>
                    {c.worker_name && (
                      <span className="text-amber-400/80">
                        Assigned to: <span className="font-medium text-amber-400">{c.worker_name}</span>
                      </span>
                    )}
                    {c.priorityScore !== undefined && (
                      <span className="ml-auto text-[10px] bg-white/5 px-2 py-0.5 rounded-full">
                        Score: {Math.round(c.priorityScore)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Assignment Modal */}
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
