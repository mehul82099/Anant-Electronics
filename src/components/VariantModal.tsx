"use client";

import { useState } from "react";
import type { ProductRecord } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";
import { useModelImages, getModelImage } from "@/lib/modelImages";
import { calculateFinanceOffers } from "@/lib/finance";
import { PaperFinanceModal } from "./PaperFinanceModal";

interface VariantModalProps {
  product: ProductRecord | null;
  allProducts: ProductRecord[];
  onClose: () => void;
  onSelectProduct?: (p: ProductRecord) => void;
}

export function VariantModal({ product, allProducts, onClose, onSelectProduct }: VariantModalProps) {
  const [financeProduct, setFinanceProduct] = useState<ProductRecord | null>(null);
  const imagesMap = useModelImages();

  if (!product) return null;

  // Filter sibling variants with matching group_key
  const siblings = allProducts.filter((p) => p.group_key === product.group_key);
  const headerImg = getModelImage(product, imagesMap);

  const formatPrice = (val: number | null) => {
    if (val === null) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {headerImg?.imageUrl || headerImg?.thumbnailUrl ? (
                <img
                  src={headerImg.imageUrl || headerImg.thumbnailUrl}
                  alt={product.model_base}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-xl">📱</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                {product.brand} • {siblings.length} Variants Available
              </span>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {product.model_base}
              </h2>
            </div>
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
            const sibImg = getModelImage(sib, imagesMap);

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
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 min-w-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs mt-0.5">
                      {sibImg?.thumbnailUrl || sibImg?.imageUrl ? (
                        <img
                          src={sibImg.thumbnailUrl || sibImg.imageUrl}
                          alt={sib.model}
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                  </div>

                  {/* Price & Action */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {hasOffer ? (
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-600">
                          {formatPrice(sib.offer_price)}
                        </div>
                        <div className="text-[11px] text-slate-400 line-through">
                          {formatPrice(sib.mop)}
                        </div>
                        {savings > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            Save {formatPrice(savings)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-base font-black text-slate-900">
                        {formatPrice(sib.mop)}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1">
                      {((sib.mop ?? 0) >= 3000 && !sib.brand.toLowerCase().includes("keypad") && !sib.model.toLowerCase().includes("keypad")) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFinanceProduct(sib);
                          }}
                          title="Open Paper Finance & Cards Calculator"
                          className="p-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          🧮 PF
                        </button>
                      )}
                      <a
                        href={buildCallingUrl()}
                        title={`Call ${STORE_CONTACT.displayPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const msg = `*Anant Electronics - Variant Enquiry*\n\n` +
                            `📱 *${sib.brand} - ${sib.model}*\n` +
                            (sib.variant ? `⚙️ Variant: ${sib.variant}\n` : "") +
                            (hasOffer ? `🔥 Offer Price: ${formatPrice(sib.offer_price)} (MOP: ${formatPrice(sib.mop)})\n` : `💰 Price: ${formatPrice(sib.mop)}\n`) +
                            (sib.offer_text ? `🎁 Offer: ${sib.offer_text}\n` : "") +
                            `\n📍 Available at Anant Electronics\n📞 Store Contact: ${STORE_CONTACT.displayPhone}`;
                          window.open(buildWhatsAppEnquiryUrl(msg), "_blank");
                        }}
                        title={`WhatsApp enquiry to ${STORE_CONTACT.displayPhone}`}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                      >
                        <span>WhatsApp</span>
                      </button>
                    </div>
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

      {/* Embedded Paper Finance & Card Offers Modal */}
      {financeProduct && (
        <PaperFinanceModal
          product={financeProduct}
          onClose={() => setFinanceProduct(null)}
        />
      )}
    </div>
  );
}
