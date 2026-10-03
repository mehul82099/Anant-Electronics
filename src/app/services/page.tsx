"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";

export default function ServicesPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");

  useEffect(() => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => {
        setDataset(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const brands = useMemo(() => {
    if (!dataset) return [];
    return dataset.service_centers.map((s) => s.brand).sort();
  }, [dataset]);

  const filteredSections = useMemo(() => {
    if (!dataset) return [];

    return dataset.service_centers
      .filter((s) => selectedBrand === "ALL" || s.brand === selectedBrand)
      .map((s) => {
        if (!search.trim()) return s;
        const q = search.toLowerCase();
        const matchedCenters = s.centers.filter(
          (c) =>
            c.center_name?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q) ||
            c.phones.some((p) => p.includes(q))
        );
        return { ...s, centers: matchedCenters };
      })
      .filter((s) => s.centers.length > 0);
  }, [dataset, selectedBrand, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCenters = dataset?.service_centers.reduce((acc, s) => acc + s.centers.length, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Authorized Service Centers</h1>
          <p className="text-sm text-slate-600 mt-1">
            Direct contact directory for {totalCenters} official brand service centers in Jaipur & Rajasthan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={buildCallingUrl()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Call Shop: {STORE_CONTACT.phone}</span>
          </a>
          <a
            href={buildWhatsAppEnquiryUrl("Hi Anant Electronics, I need help regarding phone service center or warranty support.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search service center by name, area (e.g. MI Road, Raja Park), or phone..."
          className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Brands ({dataset?.service_centers.length})</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {filteredSections.map((sec) => (
          <div key={sec.brand} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                {sec.brand}
              </h2>
              <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 rounded-full bg-slate-200">
                {sec.centers.length} Centers
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {sec.centers.map((c) => (
                <div key={c.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <h3 className="font-bold text-slate-900 text-base">{c.center_name}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{c.address}</p>
                  </div>

                  {c.phones.length > 0 && (
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
                      {c.phones.map((phone, idx) => (
                        <a
                          key={idx}
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{phone}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
