"use client";

import type { ProductRecord } from "@/lib/types";

interface VariantModalProps {
  product: ProductRecord | null;
  allProducts: ProductRecord[];
  onClose: () => void;
  onSelectProduct?: (p: ProductRecord) => void;
}

export function VariantModal({ product, allProducts, onClose, onSelectProduct }: VariantModalProps) {
  if (!product) return null;

  // Filter sibling variants with matching group_key
  const siblings = allProducts.filter((p) => p.group_key === product.group_key);

  const formatPrice = (val: number | null) => {
    if (val === null) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {product.brand} • {siblings.length} Variants Available
            </span>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {product.model_base}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Variant list */}
        <div className="p-6 overflow-y-auto space-y-3">
          {siblings.map((sib) => {
            const isSelected = sib.id === product.id;
            const hasOffer = sib.has_offer && sib.offer_price !== null && (sib.mop === null || sib.offer_price < sib.mop);
            const savings = hasOffer && sib.mop && sib.offer_price ? sib.mop - sib.offer_price : 0;

            return (
              <div
                key={sib.id}
                onClick={() => onSelectProduct && onSelectProduct(sib)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{sib.model}</span>
                      {sib.variant && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {sib.variant}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Offers info */}
                    {(sib.offer_text || sib.card_offer || sib.cashback) && (
                      <p className="text-xs text-slate-600 mt-1">
                        🎁 {sib.offer_text || sib.card_offer || sib.cashback}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    {hasOffer ? (
                      <div>
                        <div className="text-lg font-black text-emerald-600">
                          {formatPrice(sib.offer_price)}
                        </div>
                        <div className="text-xs text-slate-400 line-through">
                          {formatPrice(sib.mop)}
                        </div>
                        {savings > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            Save {formatPrice(savings)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-lg font-black text-slate-900">
                        {formatPrice(sib.mop)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
