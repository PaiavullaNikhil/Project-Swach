"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Search...", 
  label,
  className 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-sm font-semibold text-muted-foreground block mb-2 px-1">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer flex justify-between items-center hover:border-primary/50 transition-all shadow-sm"
      >
        <span className={value ? "text-white" : "text-white/20"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-[100] w-full mt-2 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-64"
          >
            <div className="p-3 border-b border-white/5 bg-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or ID..."
                  className="w-full bg-background border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground italic">No results found</div>
              ) : (
                filteredOptions.map((opt) => (
                  <div 
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition-all ${
                      value === opt ? "bg-primary text-white" : "hover:bg-white/5 text-white/80"
                    }`}
                  >
                    {opt}
                    {value === opt && <Check className="w-4 h-4" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
