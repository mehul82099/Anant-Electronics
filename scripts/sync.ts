import { runSync } from "../src/lib/sync/service";

async function main() {
  console.log("Starting sync with Google Sheets / local workbook...");
  const result = await runSync({ trigger: "cli", force: true });
  console.log(`\nResult: [${result.status.toUpperCase()}] ${result.message}`);
  if (result.dataset) {
    console.log(`Active Dataset Version: v${result.dataset.version}`);
    console.log(`Total Products: ${result.dataset.products.length}`);
    console.log(`Total Accessories: ${result.dataset.accessories.length}`);
    console.log(`Total Service Centers: ${result.dataset.service_centers.reduce((a, s) => a + s.centers.length, 0)}`);
  }
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
