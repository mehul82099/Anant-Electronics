import type { OfferField, OfferHighlight, OfferKind, OfferTag } from "../types";

/**
 * OFFER TEXT INTERPRETATION
 *
 * The raw text is ALWAYS authoritative and always displayed.
 * Highlights are extracted only from segments that START with an amount (or "X% … UPTO N")
 * immediately followed by an unambiguous keyword. Because the keyword sits directly next to
 * the amount in the same segment, the amount can never be attributed to the wrong offer type,
 * and highlights are only ever attached to the record the text belongs to.
 */

// Split on " / ", "&", "+", ";" – but never on the "/-" price suffix.
const SPLIT = /\s*(?:\/(?!-)|&|\+|;)\s*/;

const AMOUNT_FIRST = /^\(?\s*(\d{3,6})\s*(?:\/-)?\s*(?:RS\.?\s*)?(.*)$/i;
const PERCENT_UPTO = /^(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:INSTANT\s+)?(?:OFF\s+)?UPTO\s+(\d{3,6})/i;
const UPTO_INSTANT = /^UPTO\s+(\d{3,6})\s*(?:\/-)?\s+INSTANT\b/i;
const INSTANT_UPTO = /^INSTANT\s+OFF\s+UPTO\s+(\d{3,6})/i;

function kindFromRest(rest: string): OfferKind | null {
  const r = rest.trim().toUpperCase();
  if (/^UPI\b/.test(r)) return "UPI";
  if (/^UPGRADE\b/.test(r) || /^EXCHANGE\b/.test(r)) return "Upgrade";
  if (/^(ICB|INSTANT\s+CASHBACK|INSTATNT\s+CASHBACK|CASHBACK)\b/.test(r)) return "Instant cashback";
  if (/^(INSTANT\s+OFF|INSTANT\s+DISCOUNT|OFF|DISCOUNT|INSTANT)\b/.test(r)) return "Instant discount";
  if (/^(ON\s+)?EMI\b/.test(r)) return "EMI";
  if (/^(HDFC|ICICI|SBI|AXIS|KOTAK|IDFC|ALL\s+(REGULAR\s+)?BANK|ALL\s+BANK)\b/.test(r)) return "Bank offer";
  return null;
}

export function extractHighlights(text: string | null, field: OfferField): OfferHighlight[] {
  if (!text) return [];
  const out: OfferHighlight[] = [];
  const segments = text.split(SPLIT).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    let m: RegExpMatchArray | null;
    if ((m = seg.match(PERCENT_UPTO))) {
      out.push({ field, kind: "Instant discount", amount: null, percent: Number(m[1]), upto: Number(m[2]), segment: seg });
      continue;
    }
    if ((m = seg.match(UPTO_INSTANT)) || (m = seg.match(INSTANT_UPTO))) {
      out.push({ field, kind: "Instant discount", amount: null, percent: null, upto: Number(m[1]), segment: seg });
      continue;
    }
    if ((m = seg.match(AMOUNT_FIRST))) {
      const amount = Number(m[1]);
      const kind = kindFromRest(m[2] ?? "");
      if (kind) out.push({ field, kind, amount, percent: null, upto: null, segment: seg });
    }
  }
  return out;
}

/** Evidence-based tags for filtering. A tag exists only if the source text literally supports it. */
export function detectTags(texts: (string | null)[], hasSpecialPrice: boolean): OfferTag[] {
  const t = ` ${texts.filter(Boolean).join(" \n ").toUpperCase()} `;
  const tags = new Set<OfferTag>();
  if (/\b(HDFC|ICICI|SBI|AXIS|KOTAK|IDFC|BOB|AMEX|INDUSIND|INDUSLAND|FEDERAL|FEDRAL|DBS|YES|ONE ?CARD|AU|PNB)\b|\bBANK\b|\bCC\b|\bCARD\b|FULL SWIPE/.test(t))
    tags.add("Bank Offer");
  if (/CASHBACK|\bICB\b/.test(t)) tags.add("Cashback");
  if (/\bEMI\b|\bNCE\b|\bNCEM\b|\bLCE\b/.test(t)) tags.add("EMI");
  if (/UPGRADE|EXCHANGE/.test(t)) tags.add("Exchange / Upgrade");
  if (/\bUPI\b/.test(t)) tags.add("UPI");
  if (/OLD MRP/.test(t)) tags.add("Old MRP Stock");
  if (hasSpecialPrice) tags.add("Special Price");
  return [...tags];
}

export const OFFER_TAGS: OfferTag[] = ["Bank Offer", "Cashback", "EMI", "Exchange / Upgrade", "UPI", "Special Price", "Old MRP Stock"];
