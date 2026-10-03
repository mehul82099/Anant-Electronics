import * as fs from "fs";
import * as crypto from "crypto";
import { parseWorkbook } from "../src/lib/parse/workbook";

const filePath = "C:/Users/Mehul/Downloads/MOP LIST NEW 28.10.25.xlsx";
const buffer = fs.readFileSync(filePath);
const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

console.log("Parsing workbook:", filePath);
const dataset = parseWorkbook({
  buffer,
  sourceInfo: {
    kind: "xlsx",
    label: "Local Workbook",
    workbook_name: "MOP LIST NEW 28.10.25.xlsx",
    fetched_at: new Date().toISOString(),
    bytes: buffer.byteLength,
    sha256,
  },
  syncVersion: 1,
});

console.log("\n=== PARSE RESULTS ===");
console.log("Total Products:", dataset.products.length);
console.log("Total Accessories:", dataset.accessories.length);
console.log("Total Service Centers:", dataset.service_centers.reduce((a, s) => a + s.centers.length, 0));
console.log("Calendar Entries:", dataset.calendar?.entries.length ?? 0);
console.log("Validation Issues:", dataset.validation.length);

const blocking = dataset.validation.filter((v) => v.blocking);
console.log("Blocking Issues:", blocking.length);
if (blocking.length > 0) {
  console.log("Blocking errors:", blocking);
}

// Brand distribution
const brands: Record<string, number> = {};
for (const p of dataset.products) {
  brands[p.brand] = (brands[p.brand] || 0) + 1;
}
console.log("\nProducts by Brand:");
console.table(brands);

// Sample product
console.log("\nSample Product (Samsung):", dataset.products.find((p) => p.brand === "Samsung"));
