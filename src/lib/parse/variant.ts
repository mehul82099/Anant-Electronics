import type { ProductCategory } from "../types";

/**
 * Variant (RAM / storage) extraction from the model text.
 * Used for display labels ("8GB + 256GB") and to group sibling variants in the UI.
 * It NEVER merges records – every source row stays its own record.
 */

const STORAGE_SET = new Set([8, 16, 32, 64, 128, 256, 512, 1024]);

export interface VariantInfo {
  ram_gb: number | null;
  storage_gb: number | null;
  variant: string | null;
  variant_raw: string | null;
  model_base: string;
}

function storageFrom(n: number, unit: string | undefined): number | null {
  const u = (unit ?? "").toUpperCase();
  if (u === "TB") return n >= 1 && n <= 4 ? n * 1024 : null;
  if (STORAGE_SET.has(n)) return n;
  return null;
}

export function storageLabel(gb: number): string {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`;
}

export function variantLabel(ram: number | null, storage: number | null): string | null {
  if (ram !== null && storage !== null) return `${ram}GB + ${storageLabel(storage)}`;
  if (storage !== null) return storageLabel(storage);
  if (ram !== null) return `${ram}GB RAM`;
  return null;
}

function cleanBase(s: string): string {
  return s
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-_]+|[\s\-_]+$/g, "")
    .trim();
}

export function parseVariant(modelText: string): VariantInfo {
  const text = modelText.replace(/\u00a0/g, " ");

  // 1) RAM/STORAGE pairs: "(8/256)", "(12/1 TB)", "(16 / 1 TB)", "(12/ 1TB)", bare "8/256"
  const pair = /\(?\s*(\d{1,2})\s*\/\s*(\d{1,4})\s*(TB|GB)?\s*\)?/i;
  const pm = text.match(pair);
  if (pm) {
    const ram = Number(pm[1]);
    const storage = storageFrom(Number(pm[2]), pm[3]);
    if (ram >= 1 && ram <= 24 && storage !== null) {
      return {
        ram_gb: ram,
        storage_gb: storage,
        variant: variantLabel(ram, storage),
        variant_raw: pm[0].trim(),
        model_base: cleanBase(text.replace(pm[0], " ")),
      };
    }
  }

  // 2) Storage only: "(128)", "(256gb)", "(1 TB)", "(1TB)", "256GB", "512gb"
  const single = [/\(\s*(\d{1,4})\s*(GB|TB)?\s*\)/i, /\b(\d{1,4})\s*(GB|TB)\b/i];
  for (const re of single) {
    const sm = text.match(re);
    if (sm) {
      const storage = storageFrom(Number(sm[1]), sm[2]);
      if (storage !== null) {
        return {
          ram_gb: null,
          storage_gb: storage,
          variant: variantLabel(null, storage),
          variant_raw: sm[0].trim(),
          model_base: cleanBase(text.replace(sm[0], " ")),
        };
      }
    }
  }

  return { ram_gb: null, storage_gb: null, variant: null, variant_raw: null, model_base: cleanBase(text) };
}

/**
 * Product category from explicit keywords in the model text (or the section header).
 * Unknown -> the sheet default ("Phone" for phone brand sheets) only when the row has a
 * phone-like RAM/storage variant; otherwise "Other". Lenovo tablets etc. are detected by keyword.
 */
export function detectCategory(
  modelText: string,
  section: string | null,
  hasVariant: boolean,
  sheetDefault: ProductCategory | null,
): ProductCategory {
  const t = ` ${modelText.toUpperCase()} ${section ? section.toUpperCase() : ""} `;
  if (/\bTV\b|\d{2}\\?["”]\s|\bQLED\b|\b4K\b|\bFHD\b|\bHD\s+-/.test(t)) return "TV";
  if (/\b(TAB|TABLET|PAD|IPAD|X PAD)\b/.test(t)) return "Tablet";
  if (/\bWATCH\b/.test(t)) return "Watch";
  if (/\b(BUDS|AIRPODS|EARBUDS|HEADPHONE|NECKBAND)\b/.test(t)) return "Audio";
  if (/\bKEYPAD\b|\bFLIP\b|\bSINGLE SIM\b|\bDUAL SIM\b|\bMUSIC\b/.test(t)) return "Phone";
  if (hasVariant) return "Phone";
  return sheetDefault ?? "Other";
}
