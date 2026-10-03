"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset, AccessoryRecord } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";

export default function AccessoriesPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [imageMap, setImageMap] = useState<Record<string, { imageUrl: string; thumbnailUrl: string; title: string }> | null>(null);

  useEffect(() => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => {
        setDataset(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/data/accessory_images.json")
      .then((r) => r.json())
      .then((imgData) => setImageMap(imgData))
      .catch((err) => console.warn("Failed to load accessory images:", err));
  }, []);

  const getAccessoryImage = (a: AccessoryRecord) => {
    if (!imageMap) return null;
    const k1 = a.id.toLowerCase().trim();
    const k2 = a.product_name.toLowerCase().trim();
    return imageMap[k1] || imageMap[k2] || null;
  };

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
      `📍 Available at Anant Electronics\n📞 Store Contact: ${STORE_CONTACT.displayPhone}`;
    window.open(buildWhatsAppEnquiryUrl(text), "_blank");
  };

  const handleCall = () => {
    window.location.href = buildCallingUrl();
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
        {filtered.map((item) => {
          const img = getAccessoryImage(item);
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Product Image on TOP of the name */}
                <div className="w-full h-44 sm:h-48 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-3 overflow-hidden relative shadow-inner group-hover:bg-slate-100/70 transition-colors">
                  {img?.imageUrl || img?.thumbnailUrl ? (
                    <img
                      src={img.imageUrl || img.thumbnailUrl}
                      alt={item.product_name}
                      className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Accessory</span>
                    </div>
                  )}
                </div>

                {item.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 inline-block mb-1.5">
                    {item.category}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
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

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCall}
                    title={`Call ${STORE_CONTACT.displayPhone}`}
                    className="p-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleWhatsApp(item)}
                    title={`WhatsApp enquiry to ${STORE_CONTACT.displayPhone}`}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
