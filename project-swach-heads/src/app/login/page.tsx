"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate simple auth for dev phase
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("ps_admin_session", "active");
      document.cookie = "ps_admin_session=active; path=/; max-age=86400"; // 24h
      router.push("/");
    } else {
      setError("Invalid administrative credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="glass border border-white/10 p-10 rounded-[40px] shadow-2xl">
          <div className="mb-10 text-center">
             <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20">
                <ShieldCheck className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-3xl font-bold tracking-tight mb-2">Swach Heads</h1>
             <p className="text-muted-foreground">Administrative Control Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl font-medium text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : (
                <>
                  SIGN IN <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground uppercase tracking-[0.2em] font-semibold opacity-50">
            Internal Use Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
