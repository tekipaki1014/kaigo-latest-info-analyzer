import "dotenv/config";
import * as cheerio from "cheerio";

async function main() {
  const res = await fetch(
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/index_00010.html",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const html = await res.text();
  const $ = cheerio.load(html);

  const volData: Record<number, { count: number; hrefs: string[] }> = {};

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.endsWith(".pdf")) return;
    const parentText = $(el).parent().text() || "";
    const linkText = $(el).text() || "";
    const fullText = parentText + " " + linkText;
    const volMatch = fullText.match(/[Vv][Oo][Ll][.．]\s*([0-9０-９]+)/);
    if (volMatch) {
      const volStr = volMatch[1].replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      );
      const v = parseInt(volStr, 10);
      if (!volData[v]) volData[v] = { count: 0, hrefs: [] };
      volData[v].count++;
      if (volData[v].hrefs.length < 2) volData[v].hrefs.push(href.slice(-50));
    }
  });

  const vols = Object.keys(volData)
    .map(Number)
    .sort((a, b) => a - b);
  console.log("ユニークVol数:", vols.length);
  console.log("最小:", vols[0], "最大:", vols[vols.length - 1]);

  // Top 10 by PDF count
  const sorted = Object.entries(volData)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  console.log("\n最多PDF数のVol:");
  for (const [v, d] of sorted) {
    console.log(`  Vol.${v}: ${d.count}件 (例: ${d.hrefs[0]})`);
  }

  // Show all vols >= 908
  const recent = vols.filter((v) => v >= 908);
  console.log(`\nVol.908以降: ${recent.length}件`);
  console.log(recent.join(", "));
}

main().catch(console.error);
