"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { SyncStatus } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";

export function Header() {
  const pathname = usePathname();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/sync")
      .then((r) => r.json())
      .then((d) => setSyncStatus(d.status))
      .catch(() => {});

    // Poll every 5s for live status updates
    const timer = setInterval(() => {
      fetch("/api/sync")
        .then((r) => r.json())
        .then((d) => setSyncStatus(d.status))
        .catch(() => {});
    }, 5000);
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
              <img
                src="/brand-logo.jpg"
                alt="Anant Electronics Logo"
                className="h-10 sm:h-11 w-auto max-w-[200px] object-contain rounded-lg group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          {/* Quick Contact & Presentation Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Helpline & WhatsApp */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-full p-1 pl-3 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-700 hidden md:inline">
                📞 {STORE_CONTACT.displayPhone}
              </span>
              <a
                href={buildCallingUrl()}
                title={`Call ${STORE_CONTACT.displayPhone}`}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
              <a
                href={buildWhatsAppEnquiryUrl("Hi Anant Electronics, I would like to enquire about mobile prices and offers.")}
                target="_blank"
                rel="noopener noreferrer"
                title={`WhatsApp ${STORE_CONTACT.displayPhone}`}
                className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-transform hover:scale-105"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>
            </div>

            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              title="Click to sync immediately with Google Sheets"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
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
              <span className="hidden xs:inline">
                {isSyncing
                  ? "Syncing..."
                  : syncStatus?.current_version
                  ? `v${syncStatus.current_version}`
                  : "Sync"}
              </span>
            </button>

            <Link
              href="/presentation"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <span>Present</span>
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
