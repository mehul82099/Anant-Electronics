"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset, ProductRecord } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";
import { POPULAR_BANKS, calculateFinanceOffers } from "@/lib/finance";
import { PaperFinanceModal } from "@/components/PaperFinanceModal";

export default function PresentationPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState<ProductRecord | null>(null);
  const [imagesMap, setImagesMap] = useState<Record<string, { imageUrl: string; thumbnailUrl: string; title: string }>>({});
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  useEffect(() => {
    fetch("/data/model_images.json")
      .then((res) => res.json())
      .then((data: Record<string, { imageUrl: string; thumbnailUrl: string; title: string }>) => {
        setImagesMap(data);
      })
      .catch((err) => console.error("Error loading model images:", err));
  }, []);

  const getImage = (product: ProductRecord) => {
    if (!imagesMap) return null;
    const k1 = `${product.brand}|||${(product.model_base || "").replace(/\s*\(\d+[\/\+]\d+\)/gi, "").replace(/\s*\(\d+\)/gi, "").replace(/\s*\b\d+GB\b/gi, "").replace(/\s*\b\d+TB\b/gi, "").trim()}`.toLowerCase();
    const k2 = `${product.brand}|||${product.model_base || ""}`.toLowerCase();
    const k3 = `${product.model || ""}`.toLowerCase();
    const k4 = `${product.model_base || ""}`.toLowerCase();

    return imagesMap[k1] || imagesMap[k2] || imagesMap[k3] || imagesMap[k4] || null;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDataset = () => {
      fetch(`/api/dataset?t=${Date.now()}`)
        .then((res) => res.json())
        .then((data: Dataset) => {
          if (!isMounted || !data) return;
          setDataset((prev) => {
            if (!prev || prev.version !== data.version) {
              // Version changed or initial load
              setActiveProduct((currActive) => {
                if (!currActive) {
                  return data.products.find((p) => p.has_offer && p.offer_price && p.mop && p.mop - p.offer_price > 2000) || data.products[0] || null;
                }
                // Keep the active product updated with its latest price/offer
                const updated = data.products.find((p) => p.id === currActive.id) || currActive;
                return updated;
              });
              return data;
            }
            return prev;
          });
        })
        .catch((err) => console.error(err));
    };

    fetchDataset();
    // Poll every 2 seconds for real-time spreadsheet updates
    const timer = setInterval(fetchDataset, 2000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
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

  const hasCardOffer = Boolean(activeProduct.card_offer && activeProduct.card_offer.trim().length > 0);
  const hasTextOffer = Boolean(activeProduct.offer_text && activeProduct.offer_text.trim().length > 0);
  const hasCashback = Boolean(activeProduct.cashback && activeProduct.cashback.trim().length > 0);
  const hasHighlights = Boolean(activeProduct.offer_highlights && activeProduct.offer_highlights.length > 0);
  const hasAnyOffer = hasOffer || hasCardOffer || hasTextOffer || hasCashback || hasHighlights;

  const isKeypad = activeProduct.brand.toLowerCase().includes("keypad") || activeProduct.model.toLowerCase().includes("keypad") || (activeProduct.mop !== null && activeProduct.mop < 3000);
  const eligibleForFinance = !isKeypad && (activeProduct.mop ?? 0) >= 3000;

  const finance = calculateFinanceOffers(activeProduct);

  return (
    <div className="space-y-6">
      {/* Top Presentation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <img
            src="/brand-logo.jpg"
            alt="Anant Electronics Logo"
            className="h-10 sm:h-12 w-auto max-w-[210px] object-contain rounded-lg"
          />
          <div className="hidden sm:block border-l border-slate-700 pl-3">
            <h1 className="text-base font-bold leading-tight">Customer Presentation Display</h1>
            <p className="text-xs text-slate-400">Verified Live Pricing & Offers</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFinanceModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>🧮</span>
            <span>Paper Finance & Cards</span>
          </button>
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
              {activeProduct.stock_status === "Out of Stock" && (
                <span className="text-sm font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-red-600 text-white shadow-sm animate-pulse">
                  🔴 OUT OF STOCK
                </span>
              )}
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

            {/* Model Device Image Showcase */}
            {(() => {
              const modelImg = getImage(activeProduct);
              return (
                <div className="max-h-72 sm:max-h-80 w-full flex items-center justify-center my-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-inner overflow-hidden relative group">
                  {modelImg?.imageUrl || modelImg?.thumbnailUrl ? (
                    <img
                      src={modelImg.imageUrl || modelImg.thumbnailUrl}
                      alt={activeProduct.model}
                      className="object-contain max-h-64 drop-shadow-xl hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (modelImg?.thumbnailUrl && target.src !== modelImg.thumbnailUrl) {
                          target.src = modelImg.thumbnailUrl;
                        } else {
                          target.onerror = null;
                          target.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 select-none">
                      <svg className="w-20 h-20 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                        {activeProduct.brand} • Flagship Device
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {activeProduct.model}
            </h2>

            {/* Price Presentation */}
            <div className="mt-8 p-6 rounded-2xl bg-slate-900 text-white shadow-xl space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block">
                {hasAnyOffer ? "SPECIAL STORE PRICE" : "STORE PRICE"}
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

            {/* Retailer Offers & Finance Showcase (Shown only if eligible for finance) */}
            {eligibleForFinance && (
              <div className="mt-6 space-y-4">
                {/* Top Action: Open Paper Finance Calculator */}
                <button
                  onClick={() => setShowFinanceModal(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>🧮</span>
                  <span>{hasAnyOffer ? "Open Paper Finance & Card Calculator" : "Calculate EMI & Paper Finance"}</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Credit Card EMI */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block flex items-center gap-1">
                      <span>💳</span> Monthly CC EMI
                    </span>
                    <div className="text-2xl font-black text-blue-700">
                      {formatPrice(finance.monthlyCreditCardEmi)}<span className="text-xs font-semibold text-blue-600">/mo</span>
                    </div>
                    <span className="text-[11px] text-blue-800 block">6-Month No Cost EMI</span>
                  </div>

                  {/* Paper Finance EMI */}
                  <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 block flex items-center gap-1">
                      <span>🏦</span> Paper Finance EMI
                    </span>
                    <div className="text-2xl font-black text-purple-700">
                      {formatPrice(finance.monthlyPaperFinanceEmi)}<span className="text-xs font-semibold text-purple-600">/mo</span>
                    </div>
                    <span className="text-[11px] text-purple-800 block">Bajaj / IDFC / TVS NBFC</span>
                  </div>

                  {/* Cost Per Day */}
                  <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 shadow-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-900 block flex items-center gap-1">
                      <span>📅</span> Cost Per Day
                    </span>
                    <div className="text-2xl font-black text-rose-700">
                      ₹{finance.dailyCost}<span className="text-xs font-semibold text-rose-600">/day</span>
                    </div>
                    <span className="text-[11px] text-rose-800 block">Pocket-friendly ownership</span>
                  </div>
                </div>

                {/* Bank Card Offer - ONLY shown if sheet actually provides card offer or cashback */}
                {(activeProduct.card_offer || activeProduct.cashback) && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>💳 Bank Card Offer</span>
                      </h4>
                      {activeProduct.cashback && (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {activeProduct.cashback}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {activeProduct.card_offer || activeProduct.cashback}
                    </p>

                    {/* Bank Badges Pill Row */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {POPULAR_BANKS.map((b) => (
                        <div
                          key={b.code}
                          className="inline-flex items-center rounded-md border border-slate-200 overflow-hidden text-[11px] font-bold shadow-2xs"
                        >
                          <span className={`px-2 py-0.5 ${b.bg} ${b.color}`}>
                            {b.name}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-50 text-slate-700">
                            {b.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* Customer Enquiry Action Bar */}
            <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <div>
                  <span className="text-xs font-black uppercase text-emerald-900 block">Customer Enquiry & Counter Booking</span>
                  <span className="text-sm font-bold text-emerald-800">Direct Call & WhatsApp: {STORE_CONTACT.displayPhone}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={buildCallingUrl()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call {STORE_CONTACT.phone}</span>
                </a>
                <button
                  onClick={() => {
                    const msg = `*Customer Presentation Enquiry - Anant Electronics*\n\n` +
                      `📱 *${activeProduct.brand} - ${activeProduct.model}*\n` +
                      (activeProduct.variant ? `⚙️ Variant: ${activeProduct.variant}\n` : "") +
                      (hasOffer ? `🔥 Special Price: ${formatPrice(activeProduct.offer_price)} (MOP: ${formatPrice(activeProduct.mop)})\n` : `💰 Price: ${formatPrice(activeProduct.mop)}\n`) +
                      (activeProduct.offer_text ? `🎁 Offer: ${activeProduct.offer_text}\n` : "") +
                      `\n📍 Store Enquiry • Contact: ${STORE_CONTACT.displayPhone}`;
                    window.open(buildWhatsAppEnquiryUrl(msg), "_blank");
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <span>WhatsApp Enquiry</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span>Anant Electronics Retail Store • Jaipur</span>
              <span>Direct Helpline: {STORE_CONTACT.displayPhone}</span>
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
              const thumbImg = getImage(p);

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 min-w-9 rounded-md bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {thumbImg?.thumbnailUrl || thumbImg?.imageUrl ? (
                          <img
                            src={thumbImg.thumbnailUrl || thumbImg.imageUrl}
                            alt={p.model}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (thumbImg?.thumbnailUrl && target.src !== thumbImg.thumbnailUrl) {
                                target.src = thumbImg.thumbnailUrl;
                              } else {
                                target.onerror = null;
                                target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block truncate">
                          {p.brand} {p.stock_status === "Out of Stock" && <span className="text-red-600 font-extrabold">• OUT OF STOCK</span>}
                        </span>
                        <span className="text-xs font-bold text-slate-900 block leading-tight truncate">
                          {p.model}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
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

      {/* Oppo-style Paper Finance Modal in Presentation Display */}
      {showFinanceModal && activeProduct && (
        <PaperFinanceModal
          product={activeProduct}
          onClose={() => setShowFinanceModal(false)}
        />
      )}
    </div>
  );
}
