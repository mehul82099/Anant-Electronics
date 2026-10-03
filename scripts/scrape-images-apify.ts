import fs from "fs";
import path from "path";
import http from "http";
import https from "https";

const APIFY_TOKEN = process.env.APIFY_TOKEN || "apify_api_hS6MBUqeYqRkgtS7scVDG7bPXQQsvk42XThx";
const OUTPUT_FILE = path.join(process.cwd(), "public", "data", "model_images.json");
const OUTPUT_DIR = path.dirname(OUTPUT_FILE);

function postJson(url: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APIFY_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Authorization: `Bearer ${APIFY_TOKEN}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRun(runId: string, maxWaitSec = 180): Promise<any> {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < maxWaitSec) {
    const res = await getJson(`https://api.apify.com/v2/actor-runs/${runId}`);
    const status = res.data?.data?.status;
    if (status === "SUCCEEDED") {
      return res.data?.data;
    }
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Run ${runId} ended with status: ${status}`);
    }
    await sleep(4000);
  }
  throw new Error(`Run ${runId} timed out after ${maxWaitSec}s`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load existing images if any
  let existingImages: Record<string, { imageUrl: string; thumbnailUrl: string; title: string }> = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingImages = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      console.log(`Loaded ${Object.keys(existingImages).length} existing model image mappings.`);
    } catch {
      existingImages = {};
    }
  }

  // Fetch live dataset products
  const datasetRes = await new Promise<any>((resolve, reject) => {
    http.get("http://localhost:3000/api/dataset", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });

  const products: any[] = datasetRes.products || [];
  console.log(`Loaded ${products.length} catalog products.`);

  // Group unique models
  const modelMap = new Map<string, { brand: string; model_base: string; query: string; keys: string[] }>();

  products.forEach((p) => {
    let base = (p.model_base || p.model || "").trim();
    // Normalize variant suffixes
    base = base.replace(/\s*\(\d+[\/\+]\d+\)/gi, "");
    base = base.replace(/\s*\(\d+\)/gi, "");
    base = base.replace(/\s*\b\d+GB\b/gi, "");
    base = base.replace(/\s*\b\d+TB\b/gi, "");
    base = base.trim();

    let brandPrefix = p.brand;
    if (brandPrefix === "Xiaomi / Redmi / Poco") brandPrefix = "Xiaomi";
    if (brandPrefix === "Google Pixel") brandPrefix = "Google Pixel";
    if (brandPrefix === "Vivo / iQOO") brandPrefix = "Vivo";
    if (brandPrefix === "Nokia / HMD") brandPrefix = "Nokia";
    if (brandPrefix === "KEYPAD - ACE 2 HEERA") brandPrefix = "ACE";

    let cleanModelName = base;
    if (brandPrefix === "Apple" && !cleanModelName.toLowerCase().includes("iphone") && !cleanModelName.toLowerCase().includes("ipad")) {
      cleanModelName = "iPhone " + cleanModelName;
    }

    const query = `${brandPrefix} ${cleanModelName} official mobile phone`.replace(/\s+/g, " ").trim();
    const primaryKey = `${p.brand}|||${base}`.toLowerCase();
    const fallbackKey = `${p.model}`.toLowerCase();
    const baseKey = base.toLowerCase();

    if (!modelMap.has(primaryKey)) {
      modelMap.set(primaryKey, {
        brand: p.brand,
        model_base: base,
        query,
        keys: [primaryKey, fallbackKey, baseKey],
      });
    } else {
      const entry = modelMap.get(primaryKey)!;
      if (!entry.keys.includes(fallbackKey)) entry.keys.push(fallbackKey);
    }
  });

  console.log(`Found ${modelMap.size} unique model targets.`);

  // Filter models that already have images
  const toScrape: { primaryKey: string; query: string; keys: string[] }[] = [];
  for (const [key, item] of modelMap.entries()) {
    if (!existingImages[key]) {
      toScrape.push({ primaryKey: key, query: item.query, keys: item.keys });
    }
  }

  console.log(`${toScrape.length} models need image scraping.`);

  if (toScrape.length === 0) {
    console.log("All models already have images scraped!");
    return;
  }

  // Batch into chunks of 25 to respect run limits and progress saving
  const BATCH_SIZE = 25;
  for (let i = 0; i < toScrape.length; i += BATCH_SIZE) {
    const chunk = toScrape.slice(i, i + BATCH_SIZE);
    const queries = chunk.map((c) => c.query);
    console.log(`\nStarting Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toScrape.length / BATCH_SIZE)} (${queries.length} queries)...`);

    try {
      const runRes = await postJson("https://api.apify.com/v2/acts/hooli~google-images-scraper/runs", {
        queries,
        maxResultsPerQuery: 1,
      });

      const runId = runRes.data?.data?.id;
      if (!runId) {
        console.error("Failed to start Apify run:", runRes);
        continue;
      }

      console.log(`Apify run started: ${runId}. Waiting for completion...`);
      const finishedRun = await waitForRun(runId, 240);
      const datasetId = finishedRun.defaultDatasetId;
      console.log(`Run ${runId} finished. Fetching dataset: ${datasetId}...`);

      const datasetRes = await getJson(`https://api.apify.com/v2/datasets/${datasetId}/items?limit=100`);
      const items: any[] = datasetRes.data || [];

      // Map query results back to our model keys
      for (const item of items) {
        const itemQuery = (item.query || "").trim();
        const matched = chunk.find((c) => c.query.toLowerCase() === itemQuery.toLowerCase());
        const imageUrl = item.imageUrl || item.thumbnailUrl;
        const thumbnailUrl = item.thumbnailUrl || item.imageUrl;

        if (matched && imageUrl) {
          const imgData = {
            imageUrl,
            thumbnailUrl,
            title: item.title || itemQuery,
          };
          // Save under all alias keys for instant lookup
          matched.keys.forEach((k) => {
            existingImages[k] = imgData;
          });
          existingImages[matched.primaryKey] = imgData;
        }
      }

      // Save progress to disk after each batch
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingImages, null, 2), "utf8");
      console.log(`Batch finished. Saved current progress (${Object.keys(existingImages).length} entries in ${OUTPUT_FILE}).`);
    } catch (err: any) {
      console.error(`Error in batch ${i / BATCH_SIZE + 1}:`, err.message);
    }
  }

  console.log("\nImage scraping completed successfully!");
}

main().catch(console.error);
