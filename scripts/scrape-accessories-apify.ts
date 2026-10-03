import fs from "fs";
import path from "path";
import https from "https";

const APIFY_TOKEN = process.env.APIFY_TOKEN || "apify_api_hS6MBUqeYqRkgtS7scVDG7bPXQQsvk42XThx";
const OUTPUT_FILE = path.join(process.cwd(), "public", "data", "accessory_images.json");
const CURRENT_DATASET = path.join(process.cwd(), "data", "current.json");

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

function buildCleanQuery(productName: string, category: string | null): string {
  const cat = (category || "").toUpperCase().trim();
  let cleanName = productName
    .replace(/[_–\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip leading brand name if repeated
  if (cat === "INSTA 360") {
    cleanName = cleanName.replace(/^INSTA\s*360\s*/i, "").replace(/^INSTA\s*/i, "");
    return `Insta360 ${cleanName} official product`;
  }
  if (cat === "DJI") {
    cleanName = cleanName.replace(/^DJI\s*/i, "");
    return `DJI ${cleanName} official product`;
  }
  if (cat === "ZOOOK") {
    return `Zoook ${cleanName} party speaker official product`;
  }
  if (cat === "BOAT") {
    return `boAt ${cleanName} party speaker official product`;
  }
  if (cat === "JBL") {
    return `JBL PartyBox ${cleanName} speaker official product`;
  }
  if (cat === "ZEBRONICS") {
    return `Zebronics ${cleanName} speaker official product`;
  }
  if (cat === "MARSHALL") {
    return `Marshall ${cleanName} Bluetooth speaker official product`;
  }
  if (cat === "BEETEL") {
    return `Beetel ${cleanName} landline phone official product`;
  }
  if (cat === "GIZMORE") {
    return `Gizmore ${cleanName} speaker official product`;
  }

  // ACC. 2 Protectors and laminations
  if (cleanName.includes("TEMPERED") || cleanName.includes("GLASS")) {
    return `mobile phone ${cleanName} tempered glass screen guard`;
  }
  if (cleanName.includes("MEMBRANE")) {
    return `mobile phone ${cleanName} screen guard film`;
  }
  if (cleanName.includes("LAMINATION") || cleanName.includes("SKIN")) {
    return `laptop phone ${cleanName} protective skin wrap`;
  }
  if (cleanName.includes("TALK TALK")) {
    return `keypad feature mobile phone handset`;
  }

  return `${cleanName} mobile phone accessory`;
}

async function main() {
  console.log("=== Accessory & Gadget Image Scraper (Apify Google Images) ===");

  if (!fs.existsSync(CURRENT_DATASET)) {
    console.error("current.json not found in data/!");
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(CURRENT_DATASET, "utf8"));
  const accessories: any[] = dataset.accessories || [];
  console.log(`Found ${accessories.length} accessories in current dataset.`);

  let imageMap: Record<string, { imageUrl: string; thumbnailUrl: string; title: string }> = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      imageMap = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      console.log(`Loaded ${Object.keys(imageMap).length} existing accessory images.`);
    } catch {
      imageMap = {};
    }
  }

  // Build target list
  const targets: { id: string; nameKey: string; query: string }[] = [];

  for (const acc of accessories) {
    const idKey = acc.id.toLowerCase().trim();
    const nameKey = acc.product_name.toLowerCase().trim();

    if (!imageMap[idKey] && !imageMap[nameKey]) {
      const query = buildCleanQuery(acc.product_name, acc.category);
      targets.push({ id: idKey, nameKey, query });
    }
  }

  console.log(`${targets.length} accessories need images to be scraped.`);

  if (targets.length === 0) {
    console.log("All accessories already have images!");
    return;
  }

  // Run in chunks of 25
  const BATCH_SIZE = 25;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    const queries = chunk.map((c) => c.query);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

    console.log(`\nStarting Batch ${batchNum}/${totalBatches} (${queries.length} queries)...`);

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
      console.log(`Run ${runId} finished. Fetching results from ${datasetId}...`);

      const res = await getJson(`https://api.apify.com/v2/datasets/${datasetId}/items?limit=100`);
      const items: any[] = res.data || [];

      for (const item of items) {
        const itemQuery = (item.query || "").trim().toLowerCase();
        const matched = chunk.find((c) => c.query.toLowerCase() === itemQuery);

        if (matched && (item.imageUrl || item.image || item.thumbnailUrl)) {
          const imgObj = {
            imageUrl: item.imageUrl || item.image || item.thumbnailUrl,
            thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.image,
            title: item.title || matched.query,
          };
          imageMap[matched.id] = imgObj;
          imageMap[matched.nameKey] = imgObj;
          console.log(`✓ Mapped: [${matched.nameKey}] -> ${imgObj.imageUrl.slice(0, 70)}...`);
        }
      }

      // Save progress after each batch
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(imageMap, null, 2), "utf8");
      console.log(`Saved progress: ${Object.keys(imageMap).length} total accessory mappings in ${OUTPUT_FILE}`);
    } catch (err: any) {
      console.error(`Batch ${batchNum} error:`, err.message);
    }
  }

  console.log("\n=== Scraping Completed Successfully ===");
}

main().catch(console.error);
