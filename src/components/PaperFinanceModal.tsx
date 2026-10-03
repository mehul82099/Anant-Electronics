"use client";

import { useState } from "react";
import type { ProductRecord } from "@/lib/types";
import { POPULAR_BANKS, calculateFinanceOffers } from "@/lib/finance";
import { STORE_CONTACT, buildWhatsAppEnquiryUrl, buildCallingUrl } from "@/lib/config/contact";

interface PaperFinanceModalProps {
  product: ProductRecord | null;
  onClose: () => void;
}

export function PaperFinanceModal({ product, onClose }: PaperFinanceModalProps) {
  const [activeTab, setActiveTab] = useState<"finance" | "nocost" | "cards" | "upi">("finance");
  const [selectedSchemeIdx, setSelectedSchemeIdx] = useState(0);

  if (!product) return null;

  const finance = calculateFinanceOffers(product);
  const activeScheme = finance.schemes[selectedSchemeIdx] || finance.schemes[0];

  const formatPrice = (val: number | null) => {
    if (val === null || val === undefined) return "N/A";
    return "₹" + val.toLocaleString("en-IN");
  };

  const handleWhatsAppEnquiry = () => {
    const text = `*Paper Finance & EMI Enquiry - Anant Electronics*\n\n` +
      `📱 *${product.brand} - ${product.model}*\n` +
      (product.variant ? `⚙️ Variant: ${product.variant}\n` : "") +
      `💰 MOP: ${formatPrice(product.mop)}\n` +
      (finance.cashback > 0 ? `🎁 Cashback/Discount: -${formatPrice(finance.cashback)}\n` : "") +
      `✅ *Effective Price: ${formatPrice(finance.effectivePrice)}*\n\n` +
      `🏦 *Selected Scheme*: ${activeScheme.name} (${activeScheme.funder})\n` +
      `💵 Down Payment: ${formatPrice(activeScheme.downPayment)}\n` +
      `📅 Monthly EMI: *${formatPrice(activeScheme.monthlyEmi)}/mo* (${activeScheme.tenure})\n` +
      `📆 Daily Cost: approx ₹${finance.dailyCost}/day\n\n` +
      `📍 Available at Anant Electronics • Call: ${STORE_CONTACT.displayPhone}`;

    window.open(buildWhatsAppEnquiryUrl(text), "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧮</span>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Paper Finance & Card Offers
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {product.brand} • {product.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Summary Price Card (Matching Oppo Retailer UI) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">MOP Price</span>
              <span className="text-sm font-bold text-slate-800">{formatPrice(finance.mop)}</span>
            </div>

            {finance.cashback > 0 && (
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-semibold flex items-center gap-1">
                  <span>🎁</span> Cashback / Instant Discount
                </span>
                <span className="text-sm font-bold">-{formatPrice(finance.cashback)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1">
                <span>✅</span> Effective Price
              </span>
              <span className="text-xl font-black text-emerald-600">
                {formatPrice(finance.effectivePrice)}
              </span>
            </div>

            {/* Quick Badges: CC / PF / Daily */}
            <div className="pt-3 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-between">
                <span className="font-semibold text-blue-900 flex items-center gap-1">
                  💳 CC EMI
                </span>
                <span className="font-black text-blue-700">
                  {formatPrice(finance.monthlyCreditCardEmi)}/mo
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/70 flex items-center justify-between">
                <span className="font-semibold text-purple-900 flex items-center gap-1">
                  🏦 Paper EMI
                </span>
                <span className="font-black text-purple-700">
                  {formatPrice(finance.monthlyPaperFinanceEmi)}/mo
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1">
                📅 Cost Per Day:
              </span>
              <span className="font-bold text-purple-700">
                ₹{finance.dailyCost} / day
              </span>
            </div>
          </div>

          {/* Nav Tabs (Matching Oppo App pills: Paper Finance, No Cost EMI, Bank Card Offers, UPI) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("finance")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "finance"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              📄 Paper Finance
            </button>
            <button
              onClick={() => setActiveTab("nocost")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "nocost"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ⭕ No Cost EMI
            </button>
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "cards"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              💳 Bank Card Offers
            </button>
            <button
              onClick={() => setActiveTab("upi")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "upi"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              📱 UPI Cashback
            </button>
          </div>

          {/* TAB 1: Paper Finance Schemes */}
          {activeTab === "finance" && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Select NBFC Paper Finance Scheme
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {finance.schemes.map((sch, idx) => {
                  const isSel = selectedSchemeIdx === idx;
                  return (
                    <div
                      key={sch.name}
                      onClick={() => setSelectedSchemeIdx(idx)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSel
                          ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-500">{sch.funder}</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {sch.tenure}
                        </span>
                      </div>
                      <div className="text-sm font-black text-slate-900">{sch.name}</div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500">EMI:</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatPrice(sch.monthlyEmi)}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                        <span>Down Payment:</span>
                        <span className="font-semibold text-slate-700">{formatPrice(sch.downPayment)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">📄 Required Documents for Paper Finance:</span>
                <span>Aadhaar Card, PAN Card & Bank passbook or Netbanking for automated NACH debit setup. Instant counter approval available in 10 mins.</span>
              </div>
            </div>
          )}

          {/* TAB 2: No Cost EMI breakdown */}
          {activeTab === "nocost" && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                0% Interest No Cost EMI Tenures
              </h4>
              <div className="space-y-2">
                {[
                  { tenure: "3 Months No Cost", emi: Math.round(finance.effectivePrice / 3), interest: "0%" },
                  { tenure: "6 Months No Cost", emi: Math.round(finance.effectivePrice / 6), interest: "0%" },
                  { tenure: "9 Months Low Cost", emi: Math.round(finance.effectivePrice / 9), interest: "Subsidized" },
                  { tenure: "12 Months Easy EMI", emi: Math.round(finance.effectivePrice / 12), interest: "Standard" },
                ].map((row) => (
                  <div
                    key={row.tenure}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{row.tenure}</span>
                      <span className="text-[11px] text-slate-500">Interest Rate: {row.interest}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600 block">
                        {formatPrice(row.emi)} / mo
                      </span>
                      <span className="text-[10px] text-slate-400">Total: {formatPrice(finance.effectivePrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Bank Card Offers (Matches exact Oppo Screenshot with Bank Logos/Chips) */}
          {activeTab === "cards" && (
            <div className="space-y-4">
              {/* Cashback on EMI Section */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    CASHBACK ON EMI
                  </span>
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    10% Instant on swipe
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {product.card_offer || "Applicable on leading credit cards with instant credit at POS counter."}
                </p>

                {/* Bank Badges (Dual Pill Style from Screenshot) */}
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

              {/* Cashback Non-EMI Section */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    CASHBACK NON-EMI (FULL SWIPE)
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                    7.5% on swipe
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_BANKS.slice(0, 7).map((b) => (
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

              {/* Key Selling Points / Features */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <span>✦</span> Key Selling Points & Offers
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  • 100% Brand New Genuine Indian Retail Unit with Manufacturer Warranty.<br />
                  • Instant On-Counter IMEI Activation & Data Transfer Assistance.<br />
                  • Zero Down Payment available on eligible customer credit scores.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: UPI Cashback */}
          {activeTab === "upi" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Store Direct UPI Discount</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Instant Benefit
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Pay via any UPI App (Google Pay, PhonePe, Paytm, BHIM) at the store counter QR code to avail instant spot processing discount.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2">
          <a
            href={buildCallingUrl()}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs text-center shadow-xs transition-colors"
          >
            📞 Call Store
          </a>
          <button
            onClick={handleWhatsAppEnquiry}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs text-center shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>💬 WhatsApp Enquiry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
