import type { CellValue } from "../types";

/** Treat "", "  ", null, undefined (and NBSP-only strings) as blank. Never as 0. */
export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.replace(/[\s\u00a0\u200b]+/g, "") === "";
  return false;
}

/** Trimmed text of a cell, or null when blank. Numbers are converted to their plain string. */
export function cellText(v: CellValue | undefined): string | null {
  if (isBlank(v)) return null;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v).replace(/[\u00a0]/g, " ").trim();
}

/** Text with internal whitespace runs collapsed – used for DISPLAY only; raw is always kept. */
export function collapse(s: string | null): string | null {
  if (s === null) return null;
  const t = s.replace(/[\s\u00a0]+/g, " ").trim();
  return t === "" ? null : t;
}

export function colLetter(index0: number): string {
  let n = index0 + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function colIndex(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function a1(col: string, row: number): string {
  return `${col}${row}`;
}

/** Normalise a header / sheet name for comparisons: upper-case, single spaces, no punctuation noise. */
export function normKey(s: string | null | undefined): string {
  return (s ?? "")
    .toUpperCase()
    .replace(/[\u00a0]/g, " ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Small, dependency-free stable hash (FNV-1a, 53-bit) for fingerprints. */
export function hash(input: string): string {
  let h1 = 0x811c9dc5 ^ input.length;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0"));
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
