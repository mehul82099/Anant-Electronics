import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as crypto from "crypto";
import { parsePriceCell } from "../src/lib/parse/price";
import { parseVariant } from "../src/lib/parse/variant";
import { extractHighlights, detectTags } from "../src/lib/parse/offers";
import { parseWorkbook } from "../src/lib/parse/workbook";

describe("Price parser", () => {
  it("parses plain numbers and /- suffix", () => {
    expect(parsePriceCell(18999).value).toBe(18999);
    expect(parsePriceCell("18999/-").value).toBe(18999);
    expect(parsePriceCell("18999 /-").value).toBe(18999);
  });

  it("parses fixed prices", () => {
    const res = parsePriceCell("13000 FIX");
    expect(res.value).toBe(13000);
    expect(res.fixed).toBe(true);
  });

  it("parses Samsung combined MOP + offer + date string", () => {
    const res = parsePriceCell("15999/-   15499/- OFFER 28 SEPT");
    expect(res.value).toBe(15999);
    expect(res.offer_value).toBe(15499);
    expect(res.offer_date_text).toBe("28 SEPT");
  });

  it("handles blank or unparseable text safely without guessing", () => {
    expect(parsePriceCell(null).status).toBe("missing");
    expect(parsePriceCell("").status).toBe("missing");
    expect(parsePriceCell("CALL FOR PRICE").status).toBe("text");
    expect(parsePriceCell("CALL FOR PRICE").value).toBeNull();
  });
});

describe("Variant parser", () => {
  it("extracts RAM and storage pairs", () => {
    const v1 = parseVariant("A06 5G (4/64)");
    expect(v1.ram_gb).toBe(4);
    expect(v1.storage_gb).toBe(64);
    expect(v1.variant).toBe("4GB + 64GB");
    expect(v1.model_base).toBe("A06 5G");

    const v2 = parseVariant("EDGE 50 PRO (12/256)");
    expect(v2.ram_gb).toBe(12);
    expect(v2.storage_gb).toBe(256);
    expect(v2.variant).toBe("12GB + 256GB");
  });

  it("extracts storage-only variants", () => {
    const v = parseVariant("IPHONE 16 (128GB)");
    expect(v.storage_gb).toBe(128);
    expect(v.variant).toBe("128GB");
  });
});

describe("Offer parser", () => {
  it("extracts bank offers and cashbacks", () => {
    const h1 = extractHighlights("2000 HDFC CC SWIPE", "card_offer");
    expect(h1.length).toBeGreaterThan(0);
    expect(h1[0].amount).toBe(2000);
    expect(h1[0].kind).toBe("Bank offer");

    const h2 = extractHighlights("1500 INSTANT CASHBACK", "cashback");
    expect(h2.length).toBeGreaterThan(0);
    expect(h2[0].amount).toBe(1500);
    expect(h2[0].kind).toBe("Instant cashback");
  });

  it("detects evidence-based tags", () => {
    const tags = detectTags(["HDFC CARD OFFER 2000 OFF", "EMI AVAILABLE"], false);
    expect(tags).toContain("Bank Offer");
    expect(tags).toContain("EMI");
  });
});

describe("Workbook Data Integrity", () => {
  it("parses the complete local workbook with 0 blocking errors", () => {
    const filePath = "C:/Users/Mehul/Downloads/MOP LIST NEW 28.10.25.xlsx";
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const dataset = parseWorkbook({
      buffer,
      sourceInfo: {
        kind: "xlsx",
        label: "Local Test Workbook",
        workbook_name: "MOP LIST NEW 28.10.25.xlsx",
        fetched_at: new Date().toISOString(),
        bytes: buffer.byteLength,
        sha256,
      },
    });

    expect(dataset.products.length).toBeGreaterThan(500);
    expect(dataset.accessories.length).toBeGreaterThan(50);
    expect(dataset.service_centers.length).toBeGreaterThan(10);
    expect(dataset.validation.filter((v) => v.blocking).length).toBe(0);

    // Verify row identity rule
    for (const p of dataset.products) {
      expect(p.id).toMatch(/^[A-Z0-9 /]+\|ROW\|\d+$/i);
      expect(p.source_row).toBeGreaterThan(0);
      expect(p.model).toBeTruthy();
      expect(Object.keys(p.source_cells).length).toBeGreaterThan(0);
    }
  });
});
