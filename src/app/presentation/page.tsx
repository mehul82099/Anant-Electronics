"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset, ProductRecord } from "@/lib/types";

export default function PresentationPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState<ProductRecord | null>(null);

  useEffect(() => {
    fetch("/api/dataset")
      .then((res) => res.json())
      .then((data: Dataset) => {
        setDataset(data);
        if (data.products.length > 0) {
          // Default to high-profile phone (e.g. Samsung or Apple)
          const feat = data.products.find((p) => p.has_offer && p.offer_price && p.mop && p.mop - p.offer_price > 2000) || data.products[0];
          setActiveProduct(feat);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!dataset) return [];
    return dataset.products.filter((p) => {
      if (selectedBrand !== "ALL" && p.brand !== selectedBrand) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.model.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dataset, selectedBrand, search]);

  const brands = useMemo(() => {
    if (!dataset) return [];
    return Array.from(new Set(dataset.products.map((p) => p.brand))).sort();
  }, [dataset]);

  const formatPrice = (val: number | null) => {
    if (val === null) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!dataset || !activeProduct) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-base font-semibold text-slate-700">Loading Customer Presentation...</p>
        </div>
      </div>
    );
  }

  const hasOffer = activeProduct.has_offer && activeProduct.offer_price !== null && (activeProduct.mop === null || activeProduct.offer_price < activeProduct.mop);
  const savings = hasOffer && activeProduct.mop && activeProduct.offer_price ? activeProduct.mop - activeProduct.offer_price : 0;
  const savingsPct = hasOffer && activeProduct.mop && savings > 0 ? Math.round((savings / activeProduct.mop) * 100) : 0;

  // Approximate 6-month No Cost EMI calculation
  const effectivePrice = activeProduct.offer_price ?? activeProduct.mop ?? 0;
  const emiPerMonth = effectivePrice > 0 ? Math.round(effectivePrice / 6) : 0;

  return (
    <div className="space-y-6">
      {/* Top Presentation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg">
            AE
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Customer Presentation Display</h1>
            <p className="text-xs text-slate-400">Anant Electronics • Verified Live Pricing & Offers</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            ⛶ Fullscreen / TV Mode
          </button>
        </div>
      </div>

      {/* Main Presentation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device Showcase (Left 8 cols) */}
        <div className="lg:col-span-8 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-blue-100 text-blue-800">
                {activeProduct.brand}
              </span>
              {activeProduct.variant && (
                <span className="text-sm font-bold px-3 py-1 rounded-lg bg-slate-200 text-slate-800">
                  {activeProduct.variant}
                </span>
              )}
              {hasOffer && (
                <span className="text-sm font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-emerald-500 text-white animate-pulse">
                  SPECIAL OFFER ACTIVE
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {activeProduct.model}
            </h2>

            {/* Price Presentation */}
            <div className="mt-8 p-6 rounded-2xl bg-slate-900 text-white shadow-xl space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block">
                SPECIAL STORE PRICE
              </span>
              <div className="flex flex-wrap items-baseline gap-4">
                <span className="text-4xl sm:text-6xl font-black text-emerald-400 tracking-tight">
                  {formatPrice(hasOffer ? activeProduct.offer_price : activeProduct.mop)}
                </span>
                {hasOffer && (
                  <span className="text-xl sm:text-2xl font-bold text-slate-400 line-through">
                    MOP: {formatPrice(activeProduct.mop)}
                  </span>
                )}
              </div>

              {savings > 0 && (
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold">
                  🎉 INSTANT SAVINGS: {formatPrice(savings)} ({savingsPct}% OFF)
                </div>
              )}

              {activeProduct.offer_date_text && (
                <p className="text-xs text-amber-300 pt-1">
                  ⏳ Offer Valid Till: {activeProduct.offer_date_text}
                </p>
              )}
            </div>

            {/* Offers & EMI Showcase */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank & Cash offers */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span>💳 Bank & Card Discounts</span>
                </h4>
                <p className="text-sm font-semibold text-slate-800">
                  {activeProduct.card_offer || activeProduct.cashback || activeProduct.offer_text || "Standard store cashback and card swipe available."}
                </p>
              </div>

              {/* EMI Calculation */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span>📅 Easy EMI Breakdown</span>
                </h4>
                <p className="text-sm font-semibold text-slate-800">
                  From <strong className="text-emerald-600 text-base">{formatPrice(emiPerMonth)}/month</strong> (approx 6-month tenure)
                </p>
                <span className="text-[11px] text-slate-500 block">Available with major credit & debit cards at counter.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Anant Electronics Retail Store • Jaipur</span>
            <span>Genuine Indian Stock • 100% Brand Warranty</span>
          </div>
        </div>

        {/* Quick Model Selector (Right 4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col max-h-[700px]">
          <h3 className="font-bold text-slate-900 text-base mb-3">Quick Phone Switcher</h3>

          {/* Search inside presentation */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search phone..."
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />

          {/* Brand select */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-800 mb-3"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Model list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.map((p) => {
              const isSelected = p.id === activeProduct.id;
              const hasOff = p.has_offer && p.offer_price !== null && (p.mop === null || p.offer_price < p.mop);

              return (
                <div
                  key={p.id}
                  onClick={() => setActiveProduct(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        {p.brand}
                      </span>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {p.model}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {formatPrice(hasOff ? p.offer_price : p.mop)}
                      </span>
                      {hasOff && (
                        <span className="text-[9px] font-bold text-emerald-600 block uppercase">
                          Offer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
