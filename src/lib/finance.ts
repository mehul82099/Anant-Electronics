import type { ProductRecord } from "./types";

export interface BankBadge {
  name: string;
  code: string;
  color: string; // Tailwind background/text classes or hex
  bg: string;
}

export const POPULAR_BANKS: BankBadge[] = [
  { name: "SBI", code: "SBI", bg: "bg-[#002B49]", color: "text-white" },
  { name: "HDFC", code: "HDFC", bg: "bg-[#004C8F]", color: "text-white" },
  { name: "ICICI", code: "ICICI", bg: "bg-[#B8261A]", color: "text-white" },
  { name: "KOTAK", code: "KOTAK", bg: "bg-[#ED1C24]", color: "text-white" },
  { name: "IDFC", code: "IDFC", bg: "bg-[#9B1C2E]", color: "text-white" },
  { name: "BOB", code: "BOB", bg: "bg-[#F26522]", color: "text-white" },
  { name: "FEDERAL", code: "FEDERAL", bg: "bg-[#0A8043]", color: "text-white" },
  { name: "DBS", code: "DBS", bg: "bg-[#E60000]", color: "text-white" },
  { name: "J&K", code: "J&K", bg: "bg-[#009245]", color: "text-white" },
  { name: "INDUSIND", code: "INDUSIND", bg: "bg-[#6A1A24]", color: "text-white" },
  { name: "AXIS", code: "AXIS", bg: "bg-[#97144D]", color: "text-white" },
  { name: "ONE CARD", code: "ONECARD", bg: "bg-[#1A1A1A]", color: "text-white" },
];

export interface FinanceScheme {
  id: string;
  funder: string; // "Bajaj Finserv", "HDB", "IDFC First", "TVS Credit", "HDFC Consumer"
  schemeName: string; // e.g. "8/0", "10/2", "12/4", "15/0"
  tenureMonths: number;
  advanceEmi: number; // Down payment in EMIs
  processingFee: number;
  cashback: number;
}

export interface CalculatedEmi {
  mop: number;
  cashback: number;
  effectivePrice: number;
  monthlyCreditCardEmi: number; // Standard 6-month No Cost / Low Cost EMI
  monthlyPaperFinanceEmi: number; // Standard 8 to 24 month NBFC/Paper finance EMI
  dailyCost: number; // Effective price / 365 or / 730
  schemes: Array<{
    name: string;
    downPayment: number;
    monthlyEmi: number;
    tenure: string;
    funder: string;
  }>;
}

/**
 * Deterministically computes EMI & Paper Finance breakdowns matching retail store standards.
 */
export function calculateFinanceOffers(product: ProductRecord): CalculatedEmi {
  const mop = product.mop ?? 0;
  
  // Calculate cashback or discount from product offers
  let cashback = 0;
  if (product.offer_price && product.mop && product.offer_price < product.mop) {
    cashback = product.mop - product.offer_price;
  } else if (product.cashback) {
    const num = parseInt(product.cashback.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num > 0 && num < mop) {
      cashback = num;
    }
  }

  const effectivePrice = Math.max(1, mop - cashback);

  // Credit Card No Cost EMI (typically 6-month tenure)
  const monthlyCreditCardEmi = Math.round(effectivePrice / 6);

  // Paper Finance (NBFCs like Bajaj / TVS / HDB / IDFC - typically 8 to 18-month schemes)
  // Standard 10/2 or 8/0 scheme: tenure 8 months
  const monthlyPaperFinanceEmi = Math.round(effectivePrice / 10);

  // Daily cost (calculated over 2 years / 730 days of ownership)
  const dailyCost = Math.max(1, Math.round(effectivePrice / 730));

  const schemes = [
    {
      name: "8 / 0 No Cost Scheme",
      funder: "Bajaj Finserv",
      tenure: "8 Months",
      downPayment: 0,
      monthlyEmi: Math.round(effectivePrice / 8),
    },
    {
      name: "10 / 2 Easy Down Payment",
      funder: "IDFC First Bank",
      tenure: "10 Months",
      downPayment: Math.round((effectivePrice / 10) * 2),
      monthlyEmi: Math.round(effectivePrice / 10),
    },
    {
      name: "12 / 4 Festive Scheme",
      funder: "HDB Financial",
      tenure: "12 Months",
      downPayment: Math.round((effectivePrice / 12) * 4),
      monthlyEmi: Math.round(effectivePrice / 12),
    },
    {
      name: "18 / 0 Long Tenure EMI",
      funder: "TVS Credit",
      tenure: "18 Months",
      downPayment: 0,
      monthlyEmi: Math.round(effectivePrice / 18),
    },
  ];

  return {
    mop,
    cashback,
    effectivePrice,
    monthlyCreditCardEmi,
    monthlyPaperFinanceEmi,
    dailyCost,
    schemes,
  };
}
