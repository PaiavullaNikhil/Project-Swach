"use client";

import { Home, Map, BarChart2, Users, AlertCircle, FileText, Settings, LogOut, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Overview", icon: Home, href: "/" },
  { name: "Live Map", icon: Map, href: "/map" },
  { name: "Analytics", icon: BarChart2, href: "/analytics" },
  { name: "Workers", icon: Users, href: "/workers" },
  { name: "Vehicles", icon: Truck, href: "/vehicles" },
  { name: "Escalations", icon: AlertCircle, href: "/escalations" },
  { name: "Reports", icon: FileText, href: "/reports" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("ps_admin_session");
    document.cookie = "ps_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <div className="w-64 h-screen flex flex-col glass border-r sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          Swach Heads
        </h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
          Admin Dashboard
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:bg-white/5 hover:text-white rounded-xl transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-destructive hover:bg-destructive/10 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
