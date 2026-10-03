"use client";

import { useState } from "react";
import type { ProductRecord } from "@/lib/types";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";
import { useModelImages, getModelImage, type ModelImage } from "@/lib/modelImages";
import { calculateFinanceOffers } from "@/lib/finance";
import { PaperFinanceModal } from "./PaperFinanceModal";

interface ProductCardProps {
  product: ProductRecord;
  siblingCount?: number;
  imagesMap?: Record<string, ModelImage>;
  onOpenVariants?: (product: ProductRecord) => void;
  onInspectSource?: (product: ProductRecord) => void;
  isCompared?: boolean;
  onToggleCompare?: (product: ProductRecord) => void;
}

export function ProductCard({
  product,
  siblingCount = 0,
  imagesMap: propImagesMap,
  onOpenVariants,
  onInspectSource,
  isCompared = false,
  onToggleCompare,
}: ProductCardProps) {
  const [showRawOffers, setShowRawOffers] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const hookImagesMap = useModelImages();
  const imagesMap = propImagesMap || hookImagesMap;
  const imgData = getModelImage(product, imagesMap);
  const finance = calculateFinanceOffers(product);

  const formatPrice = (val: number | null) => {
    if (val === null) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  const hasOffer = product.has_offer && product.offer_price !== null && (product.mop === null || product.offer_price < product.mop);
  const savings = hasOffer && product.mop && product.offer_price ? product.mop - product.offer_price : 0;
  const savingsPct = hasOffer && product.mop && savings > 0 ? Math.round((savings / product.mop) * 100) : 0;

  const handleWhatsApp = () => {
    const text = `*Anant Electronics - Product Enquiry*\n\n` +
      `📱 *${product.brand} - ${product.model}*\n` +
      (product.variant ? `⚙️ Variant: ${product.variant}\n` : "") +
      (hasOffer
        ? `🔥 *Offer Price: ${formatPrice(product.offer_price)}* (MOP: ${formatPrice(product.mop)} - Save ${formatPrice(savings)})\n`
        : `💰 *Price: ${formatPrice(product.mop)}*\n`) +
      (product.offer_text ? `🎁 Offer: ${product.offer_text}\n` : "") +
      (product.card_offer ? `💳 Card Offer: ${product.card_offer}\n` : "") +
      (product.cashback ? `💵 Cashback: ${product.cashback}\n` : "") +
      `\n📍 Available at Anant Electronics\n📞 Store Contact: ${STORE_CONTACT.displayPhone}`;

    window.open(buildWhatsAppEnquiryUrl(text), "_blank");
  };

  const handleCall = () => {
    window.location.href = buildCallingUrl();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      {/* Top Banner & Badges */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {product.brand}
            </span>
            {product.category && product.category !== "Phone" && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                {product.category}
              </span>
            )}
            {product.fixed_price && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                FIXED
              </span>
            )}
          </div>

          {/* Compare toggle */}
          {onToggleCompare && (
            <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={isCompared}
                onChange={() => onToggleCompare(product)}
                className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Compare</span>
            </label>
          )}
        </div>

        {/* Device Image Showcase / Sleek Fallback Badge */}
        <div className="w-full h-44 my-3 flex items-center justify-center bg-gradient-to-b from-slate-50/70 to-slate-100/30 rounded-xl border border-slate-100/80 p-2 overflow-hidden group/img transition-all hover:border-slate-200">
          {imgData?.imageUrl || imgData?.thumbnailUrl ? (
            <img
              src={imgData.imageUrl || imgData.thumbnailUrl}
              alt={product.model}
              className="max-h-36 max-w-full object-contain drop-shadow-md group-hover/img:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 py-4 select-none">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {product.brand}
              </span>
            </div>
          )}
        </div>

        {/* Model Title */}
        <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug tracking-tight group-hover:text-blue-600 transition-colors">
          {product.model}
        </h3>

        {/* Variant Chip */}
        {product.variant && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
            <span>{product.variant}</span>
          </div>
        )}

        {/* Oppo-style Retailer Pricing Display */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {/* MOP & Cashback line */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">MOP</span>
            <span className="font-bold text-slate-700">{formatPrice(finance.mop)}</span>
          </div>

          {finance.cashback > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-700">
              <span className="font-semibold flex items-center gap-1">
                <span>🎁</span> Cashback
              </span>
              <span className="font-extrabold">-{formatPrice(finance.cashback)}</span>
            </div>
          )}

          {/* EFFECTIVE PRICE */}
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
              EFFECTIVE PRICE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                {formatPrice(finance.effectivePrice)}
              </span>
              {hasOffer && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  SAVE {formatPrice(savings)} ({savingsPct}%)
                </span>
              )}
            </div>
          </div>

          {/* Oppo-style CC, PF, and Daily Cost Pills */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {/* Credit Card Pill */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/60 font-bold text-blue-900">
                <span>💳</span>
                <span>{formatPrice(finance.monthlyCreditCardEmi)}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-600 text-white uppercase font-black">CC</span>
              </div>

              {/* Paper Finance Pill */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200/60 font-bold text-purple-900">
                <span>🏦</span>
                <span>{formatPrice(finance.monthlyPaperFinanceEmi)}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-600 text-white uppercase font-black">PF</span>
              </div>

              {/* Cost per day pill */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/60 font-bold text-rose-800 text-[11px]">
                <span>📅</span>
                <span>₹{finance.dailyCost}/day</span>
              </div>
            </div>

            {/* PF Calc Button (Matches exact Oppo screenshot) */}
            <button
              onClick={() => setShowFinanceModal(true)}
              className="w-full mt-2 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>🧮</span>
              <span>PF Calc & Card Offers</span>
            </button>
          </div>
        </div>

        {/* Offer Highlights & Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {product.offer_highlights.map((h, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60"
            >
              {h.kind}: {h.amount ? `₹${h.amount.toLocaleString("en-IN")}` : h.percent ? `${h.percent}%` : ""} {h.segment}
            </span>
          ))}
          {product.offer_tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Raw Offers Detail (Collapsible) */}
        {(product.offer_text || product.card_offer || product.cashback) && (
          <div className="mt-3">
            <button
              onClick={() => setShowRawOffers(!showRawOffers)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>{showRawOffers ? "Hide offer details" : "View offer details"}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showRawOffers ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showRawOffers && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                {product.offer_text && (
                  <p>
                    <strong className="text-slate-900">Offer:</strong> {product.offer_text}
                  </p>
                )}
                {product.card_offer && (
                  <p>
                    <strong className="text-slate-900">Card Offer:</strong> {product.card_offer}
                  </p>
                )}
                {product.cashback && (
                  <p>
                    <strong className="text-slate-900">Cashback:</strong> {product.cashback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {siblingCount > 1 && onOpenVariants && (
            <button
              onClick={() => onOpenVariants(product)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {siblingCount} Variants
            </button>
          )}

          {onInspectSource && (
            <button
              onClick={() => onInspectSource(product)}
              title="Inspect exact source row in Google Sheets"
              className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60"
            >
              Source ({product.source_sheet}!{product.source_row})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCall}
            title={`Call store directly at ${STORE_CONTACT.displayPhone}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="hidden sm:inline">Call</span>
          </button>

          <button
            onClick={handleWhatsApp}
            title={`WhatsApp enquiry to ${STORE_CONTACT.displayPhone}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <span>WhatsApp</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Oppo-style Paper Finance Modal */}
      {showFinanceModal && (
        <PaperFinanceModal
          product={product}
          onClose={() => setShowFinanceModal(false)}
        />
      )}
    </div>
  );
}
