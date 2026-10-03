"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { SyncStatus } from "@/lib/types";

export function Header() {
  const pathname = usePathname();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/sync")
      .then((r) => r.json())
      .then((d) => setSyncStatus(d.status))
      .catch(() => {});

    // Poll every 30s
    const timer = setInterval(() => {
      fetch("/api/sync")
        .then((r) => r.json())
        .then((d) => setSyncStatus(d.status))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.status) {
        window.location.reload();
      }
    } catch (e) {
      alert("Sync failed: " + e);
    } finally {
      setIsSyncing(false);
    }
  };

  const navLinks = [
    { href: "/", label: "📱 Phones & Devices" },
    { href: "/accessories", label: "🎧 Accessories" },
    { href: "/services", label: "🏢 Service Centers" },
    { href: "/calendar", label: "📅 Store Calendar" },
    { href: "/presentation", label: "📺 Customer Mode" },
    { href: "/admin", label: "⚙️ Admin / Diagnostics" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                AE
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                  Anant Electronics
                </span>
                <span className="text-xs font-medium text-slate-500 block">
                  Live Mobile Price & Presentation
                </span>
              </div>
            </Link>
          </div>

          {/* Sync Status Badge & Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              title="Click to sync immediately with Google Sheets"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSyncing
                    ? "bg-amber-500 animate-ping"
                    : syncStatus?.last_attempt_status === "blocked"
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
              />
              <span>
                {isSyncing
                  ? "Syncing Sheets..."
                  : syncStatus?.current_version
                  ? `Live v${syncStatus.current_version}`
                  : "Google Sheets"}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <Link
              href="/presentation"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <span>Present to Customer</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
