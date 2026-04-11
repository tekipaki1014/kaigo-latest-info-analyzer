import "dotenv/config";
import { scrapeLatestInfoPage } from "../src/lib/scraper";

async function main() {
  const items = await scrapeLatestInfoPage();
  const vols = items.map(i => i.vol_number).sort((a,b) => a-b);
  console.log("件数:", items.length);
  console.log("最小 Vol:", vols[0]);
  console.log("最大 Vol:", vols[vols.length-1]);
  console.log("全Vol:", vols.join(", "));
}

main().catch(console.error);
