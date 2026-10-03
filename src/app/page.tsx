"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset, ProductRecord } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { VariantModal } from "@/components/VariantModal";
import { SourceInspectModal } from "@/components/SourceInspectModal";
import { CompareDrawer } from "@/components/CompareDrawer";

export default function HomePage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [priceRange, setPriceRange] = useState<string>("ALL");
  const [selectedOfferTag, setSelectedOfferTag] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");
  const [sortBy, setSortBy] = useState<string>("DEFAULT");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");

  // Interactive modals & drawer state
  const [variantProduct, setVariantProduct] = useState<ProductRecord | null>(null);
  const [inspectProduct, setInspectProduct] = useState<ProductRecord | null>(null);
  const [comparedProducts, setComparedProducts] = useState<ProductRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchDataset = () => {
      fetch(`/api/dataset?t=${Date.now()}`)
        .then((res) => res.json())
        .then((data: Dataset) => {
          if (!isMounted || !data) return;
          setDataset((prev) => {
            if (!prev || prev.version !== data.version) {
              return data;
            }
            return prev;
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load dataset:", err);
          if (isMounted) setLoading(false);
        });
    };

    fetchDataset();
    // Poll every 2 seconds for instant updates when Excel/Google Sheet is edited
    const interval = setInterval(fetchDataset, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute brand counts
  const brandCounts = useMemo(() => {
    if (!dataset) return {};
    const counts: Record<string, number> = {};
    for (const p of dataset.products) {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    }
    return counts;
  }, [dataset]);

  // Compute sibling counts by group_key
  const siblingCounts = useMemo(() => {
    if (!dataset) return {};
    const map: Record<string, number> = {};
    for (const p of dataset.products) {
      map[p.group_key] = (map[p.group_key] || 0) + 1;
    }
    return map;
  }, [dataset]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!dataset) return [];

    let list = dataset.products.filter((p) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesModel = p.model.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesVariant = p.variant ? p.variant.toLowerCase().includes(q) : false;
        const matchesOffer = (p.offer_text || "").toLowerCase().includes(q) || (p.card_offer || "").toLowerCase().includes(q);
        if (!matchesModel && !matchesBrand && !matchesVariant && !matchesOffer) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrand !== "ALL" && p.brand !== selectedBrand) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }

      // Only active offers
      if (onlyOffers && !p.has_offer) {
        return false;
      }

      // Offer tag filter
      if (selectedOfferTag !== "ALL") {
        if (!p.offer_tags.includes(selectedOfferTag as any)) {
          return false;
        }
      }

      // Stock status filter (Red in sheet = Out of stock)
      if (stockFilter === "IN_STOCK" && p.stock_status === "Out of Stock") return false;
      if (stockFilter === "OUT_OF_STOCK" && p.stock_status !== "Out of Stock") return false;

      // Price range
      const effectivePrice = p.offer_price ?? p.mop ?? 0;
      if (priceRange === "U15K" && (effectivePrice > 15000 || effectivePrice === 0)) return false;
      if (priceRange === "15K_30K" && (effectivePrice < 15000 || effectivePrice > 30000)) return false;
      if (priceRange === "30K_60K" && (effectivePrice < 30000 || effectivePrice > 60000)) return false;
      if (priceRange === "A60K" && effectivePrice < 60000) return false;

      return true;
    });

    // Sorting
    if (sortBy === "PRICE_ASC") {
      list = [...list].sort((a, b) => (a.offer_price ?? a.mop ?? 0) - (b.offer_price ?? b.mop ?? 0));
    } else if (sortBy === "PRICE_DESC") {
      list = [...list].sort((a, b) => (b.offer_price ?? b.mop ?? 0) - (a.offer_price ?? a.mop ?? 0));
    } else if (sortBy === "DISCOUNT_DESC") {
      list = [...list].sort((a, b) => {
        const saveA = a.mop && a.offer_price && a.offer_price < a.mop ? a.mop - a.offer_price : 0;
        const saveB = b.mop && b.offer_price && b.offer_price < b.mop ? b.mop - b.offer_price : 0;
        return saveB - saveA;
      });
    } else if (sortBy === "BRAND_ASC") {
      list = [...list].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
    }

    return list;
  }, [dataset, search, selectedBrand, selectedCategory, onlyOffers, priceRange, selectedOfferTag, stockFilter, sortBy]);

  const handleToggleCompare = (prod: ProductRecord) => {
    if (comparedProducts.some((p) => p.id === prod.id)) {
      setComparedProducts(comparedProducts.filter((p) => p.id !== prod.id));
    } else {
      if (comparedProducts.length >= 4) {
        alert("You can compare up to 4 devices at a time.");
        return;
      }
      setComparedProducts([...comparedProducts, prod]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading catalog from Google Sheets...</p>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200">
        <h2 className="text-xl font-bold text-red-600">Failed to load dataset</h2>
        <p className="text-sm text-slate-600 mt-1">Please check your connection and Google Sheets permissions.</p>
      </div>
    );
  }

  const brands = Object.keys(brandCounts).sort();

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 580+ phones by model (e.g. A06, S25, iPhone 16), RAM/storage, or offer..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Brand Selector Pills */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Brands:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedBrand("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedBrand === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Brands ({dataset.products.length})
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedBrand === b
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {b} ({brandCounts[b]})
              </button>
            ))}
          </div>
        </div>

        {/* Filter Badges & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Offers toggle */}
            <button
              onClick={() => setOnlyOffers(!onlyOffers)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                onlyOffers
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>🔥 Has Active Offer</span>
            </button>

            {/* Stock status filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📦 All Stock</option>
              <option value="IN_STOCK">🟢 In Stock Only</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock Only</option>
            </select>

            {/* Price Ranges */}
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Prices</option>
              <option value="U15K">Under ₹15,000</option>
              <option value="15K_30K">₹15,000 – ₹30,000</option>
              <option value="30K_60K">₹30,000 – ₹60,000</option>
              <option value="A60K">Above ₹60,000</option>
            </select>

            {/* Offer Tags */}
            <select
              value={selectedOfferTag}
              onChange={(e) => setSelectedOfferTag(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Offer Types</option>
              <option value="Bank Offer">Bank Offer</option>
              <option value="Cashback">Cashback</option>
              <option value="EMI">EMI</option>
              <option value="Exchange / Upgrade">Exchange / Upgrade</option>
              <option value="UPI">UPI Offer</option>
              <option value="Special Price">Special Price</option>
            </select>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Phone">Smartphones & Feature Phones</option>
              <option value="Tablet">Tablets / iPads</option>
              <option value="Audio">Audio / Buds</option>
              <option value="Watch">Smartwatches</option>
              <option value="TV">Smart TVs</option>
            </select>
          </div>

          {/* Sort & View Mode */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DEFAULT">Sort: Default</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="DISCOUNT_DESC">Biggest Savings</option>
              <option value="BRAND_ASC">Brand (A-Z)</option>
            </select>

            {/* View Mode buttons */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-md text-xs font-medium ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`p-1.5 rounded-md text-xs font-medium ${
                  viewMode === "list" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Counter & Active Filter Tags */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredProducts.length}</strong> of <strong>{dataset.products.length}</strong> devices
          {selectedBrand !== "ALL" && ` for ${selectedBrand}`}
        </span>
        {(search || selectedBrand !== "ALL" || onlyOffers || priceRange !== "ALL" || selectedOfferTag !== "ALL") && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedBrand("ALL");
              setOnlyOffers(false);
              setPriceRange("ALL");
              setSelectedOfferTag("ALL");
              setSelectedCategory("ALL");
            }}
            className="text-blue-600 font-bold hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Products Presentation */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-base font-bold text-slate-700">No phones match your current filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedBrand("ALL");
              setOnlyOffers(false);
              setPriceRange("ALL");
              setSelectedOfferTag("ALL");
            }}
            className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              siblingCount={siblingCounts[product.group_key] || 1}
              onOpenVariants={setVariantProduct}
              onInspectSource={setInspectProduct}
              isCompared={comparedProducts.some((c) => c.id === product.id)}
              onToggleCompare={handleToggleCompare}
            />
          ))}
        </div>
      ) : (
        /* List / Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Brand & Model</th>
                <th className="p-3">Variant</th>
                <th className="p-3">Regular (MOP)</th>
                <th className="p-3">Offer Price</th>
                <th className="p-3">Offers / Highlights</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const hasOffer = p.has_offer && p.offer_price !== null && (p.mop === null || p.offer_price < p.mop);
                const savings = hasOffer && p.mop && p.offer_price ? p.mop - p.offer_price : 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 mr-2">
                        {p.brand}
                      </span>
                      {p.model}
                    </td>
                    <td className="p-3 font-semibold text-blue-700">{p.variant || "—"}</td>
                    <td className="p-3 font-medium text-slate-500">
                      {p.mop ? `₹${p.mop.toLocaleString("en-IN")}` : "N/A"}
                    </td>
                    <td className="p-3 font-black text-emerald-600">
                      {hasOffer ? (
                        <div>
                          <span>₹{p.offer_price?.toLocaleString("en-IN")}</span>
                          {savings > 0 && (
                            <span className="text-[10px] block font-semibold text-emerald-700">
                              Save ₹{savings.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                      {p.offer_text || p.card_offer || p.cashback || "—"}
                    </td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      {siblingCounts[p.group_key] > 1 && (
                        <button
                          onClick={() => setVariantProduct(p)}
                          className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          Variants ({siblingCounts[p.group_key]})
                        </button>
                      )}
                      <button
                        onClick={() => setInspectProduct(p)}
                        className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sibling Variant Modal */}
      <VariantModal
        product={variantProduct}
        allProducts={dataset.products}
        onClose={() => setVariantProduct(null)}
        onSelectProduct={(p) => setVariantProduct(p)}
      />

      {/* Source Cell Inspector Modal */}
      <SourceInspectModal
        product={inspectProduct}
        onClose={() => setInspectProduct(null)}
      />

      {/* Compare Drawer */}
      <CompareDrawer
        items={comparedProducts}
        onRemove={(id) => setComparedProducts(comparedProducts.filter((c) => c.id !== id))}
        onClear={() => setComparedProducts([])}
      />
    </div>
  );
}
