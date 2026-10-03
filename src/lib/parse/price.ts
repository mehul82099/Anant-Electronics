import type { CellValue, ParsedPrice } from "../types";
import { isBlank } from "./cells";

/**
 * PRICE PARSING – deterministic patterns only.
 *
 * Anything that does not match one of the explicit grammars below is returned with
 * status "text" and value null so the UI shows the exact source text instead of a guess.
 */

const MONTHS = "JAN|FEB|MAR|APR|MAY|JUN|JUNE|JUL|JULY|AUG|SEP|SEPT|OCT|NOV|DEC";
const NUM = String.raw`(\d{2,7})`;
const SUFFIX = String.raw`(?:\s*\/-)?`;

/** "18999", "18999/-", "18999 /-" */
const RE_PLAIN = new RegExp(String.raw`^${NUM}${SUFFIX}$`);
/** "13000  FIX", "9000/-  FIX" */
const RE_FIX = new RegExp(String.raw`^${NUM}${SUFFIX}\s+FIX(?:ED)?$`, "i");
/**
 * Samsung-style combined cell:
 *   "15999/-   15499/- OFFER 28 SEPT"
 *   "75000/-      72000 OFFER  21 JUN"
 *   "19999    17999 OFFER TILL 31 OCT"
 */
const RE_PRICE_OFFER_DATE = new RegExp(
  String.raw`^${NUM}${SUFFIX}\s+${NUM}${SUFFIX}\s+OFFER\s+(?:TILL\s+)?(\d{1,2}\s*(?:${MONTHS}))\.?$`,
  "i",
);

function base(raw: CellValue): ParsedPrice {
  return { status: "missing", value: null, offer_value: null, offer_date_text: null, note: null, fixed: false, raw };
}

export function parsePriceCell(raw: CellValue): ParsedPrice {
  const out = base(raw);
  if (isBlank(raw)) return out;

  if (typeof raw === "number") {
    if (Number.isFinite(raw) && raw > 0) {
      out.status = "number";
      out.value = raw;
    } else {
      out.status = "text";
    }
    return out;
  }

  const s = String(raw).replace(/\u00a0/g, " ").trim();
  let m: RegExpMatchArray | null;

  if ((m = s.match(RE_PLAIN))) {
    out.status = "parsed";
    out.value = Number(m[1]);
    return out;
  }
  if ((m = s.match(RE_FIX))) {
    out.status = "parsed";
    out.value = Number(m[1]);
    out.fixed = true;
    out.note = "FIX";
    return out;
  }
  if ((m = s.match(RE_PRICE_OFFER_DATE))) {
    const regular = Number(m[1]);
    const offer = Number(m[2]);
    // Only accept when the structure is unambiguous: offer must be lower than the regular price.
    if (offer < regular) {
      out.status = "parsed";
      out.value = regular;
      out.offer_value = offer;
      out.offer_date_text = m[3].replace(/\s+/g, " ").toUpperCase();
      return out;
    }
  }
  out.status = "text";
  return out;
}

/** Offer-price column cell: only a clean number counts as an offer price. */
export function parseOfferPriceCell(raw: CellValue): number | null {
  if (isBlank(raw)) return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  const m = String(raw).trim().match(RE_PLAIN);
  return m ? Number(m[1]) : null;
}

/**
 * Price embedded at the END of a name cell, separated by a dash/underscore with whitespace:
 *   "TEMPERED 2.5D  -  100/-"           -> name "TEMPERED 2.5D", 100
 *   "INSTA 360 GO3  32GB _ 32000/-"     -> name "INSTA 360 GO3  32GB", 32000
 *   "PAD 70 PRO - WITH PEN (8/128)  WIFI   -  41500" -> last separator wins
 * A dash without surrounding whitespace ("A-56") is never treated as a separator.
 */
const RE_EMBEDDED = /^(.*\S)(?:\s+[-_]\s*|\s*[-_]\s+)(\d{3,7})\s*(?:\/-)?\s*$/;

export function parseEmbeddedPrice(text: string): { name: string; price: number } | null {
  const m = text.match(RE_EMBEDDED);
  if (!m) return null;
  const name = m[1].replace(/[\s\-_]+$/, "").trim();
  if (!name) return null;
  return { name, price: Number(m[2]) };
}

export function formatOfferDate(dateText: string | null): string | null {
  if (!dateText) return null;
  return dateText.replace(/([A-Z])([A-Z]+)/g, (_m, a: string, b: string) => a + b.toLowerCase());
}

export const parsePrice = parsePriceCell;
export const parseOfferPrice = parseOfferPriceCell;
