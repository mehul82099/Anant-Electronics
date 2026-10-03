"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset, AccessoryRecord } from "@/lib/types";

export default function AccessoriesPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => {
        setDataset(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    if (!dataset) return [];
    const set = new Set<string>();
    for (const a of dataset.accessories) {
      if (a.category) set.add(a.category);
    }
    return Array.from(set).sort();
  }, [dataset]);

  const filtered = useMemo(() => {
    if (!dataset) return [];
    return dataset.accessories.filter((a) => {
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.product_name.toLowerCase().includes(q) ||
          (a.category && a.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dataset, search, selectedCategory]);

  const formatPrice = (val: number | null) => {
    if (val === null) return "Ask in Store";
    return "₹" + val.toLocaleString("en-IN");
  };

  const handleWhatsApp = (a: AccessoryRecord) => {
    const text = `*Anant Electronics - Accessory Enquiry*\n\n` +
      `🎧 *${a.product_name}*\n` +
      (a.category ? `Category: ${a.category}\n` : "") +
      `Price: ${formatPrice(a.price)}\n\n` +
      `📍 Available at Anant Electronics`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accessories & Protection</h1>
        <p className="text-sm text-slate-600 mt-1">
          Screen guards, chargers, cases, audio & wearable accessories available in stock.
        </p>

        {/* Search & Filters */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accessories (e.g. Tempered, Charger, Buds)..."
            className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Categories ({dataset?.accessories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accessories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {item.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 inline-block mb-1.5">
                  {item.category}
                </span>
              )}
              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                {item.product_name}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Price</span>
                <span className="text-lg font-black text-emerald-600 block">
                  {formatPrice(item.price)}
                </span>
              </div>

              <button
                onClick={() => handleWhatsApp(item)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Enquire
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
