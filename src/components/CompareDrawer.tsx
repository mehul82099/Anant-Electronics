"use client";

import { useState } from "react";
import type { ProductRecord } from "@/lib/types";

interface CompareDrawerProps {
  items: ProductRecord[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareDrawer({ items, onRemove, onClear }: CompareDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  const formatPrice = (val: number | null) => {
    if (val === null) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  return (
    <>
      {/* Floating Bar at bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-full px-5 py-3 shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">
            {items.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold">Devices selected to compare</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Compare Now
          </button>
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-white text-xs font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Comparison Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900">
                Side-by-Side Product Comparison ({items.length} devices)
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-4 divide-x divide-slate-100">
                {items.map((item) => {
                  const hasOffer = item.has_offer && item.offer_price !== null && (item.mop === null || item.offer_price < item.mop);
                  const savings = hasOffer && item.mop && item.offer_price ? item.mop - item.offer_price : 0;

                  return (
                    <div key={item.id} className="px-3 space-y-4">
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.brand}
                        </span>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {item.model}
                      </h3>

                      {item.variant && (
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                          {item.variant}
                        </span>
                      )}

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs text-slate-500 block">Effective Price</span>
                        <span className="text-xl font-black text-emerald-600 block">
                          {hasOffer ? formatPrice(item.offer_price) : formatPrice(item.mop)}
                        </span>
                        {hasOffer && (
                          <span className="text-xs text-slate-400 line-through block">
                            MOP: {formatPrice(item.mop)}
                          </span>
                        )}
                        {savings > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 mt-1 block">
                            Save {formatPrice(savings)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="border-t border-slate-100 pt-2">
                          <strong className="text-slate-500 block mb-0.5">RAM & Storage:</strong>
                          <span className="font-medium text-slate-800">
                            {item.ram_gb ? `${item.ram_gb} GB RAM` : "N/A"} / {item.storage_gb ? `${item.storage_gb} GB Storage` : "N/A"}
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <strong className="text-slate-500 block mb-0.5">Offer Details:</strong>
                          <span className="font-medium text-slate-800">
                            {item.offer_text || item.card_offer || item.cashback || "No active offers listed"}
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-2">
                          <strong className="text-slate-500 block mb-0.5">Source:</strong>
                          <span className="font-mono text-slate-600">
                            {item.source_sheet} (Row {item.source_row})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
