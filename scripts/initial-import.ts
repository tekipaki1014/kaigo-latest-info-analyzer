/**
 * 初期データインポートスクリプト
 *
 * Vol.1121以降の介護保険最新情報を一括取り込みする。
 *
 * 使い方:
 *   npx tsx scripts/initial-import.ts
 *
 * 環境変数が必要:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */

import { config } from "dotenv";
config({ path: ".env" });

import { scrapeLatestInfoPage } from "../src/lib/scraper";
import { ingestDocument } from "../src/lib/ingest";
import { createServiceClient } from "../src/lib/supabase-server";

async function main() {
  console.log("=== 介護保険最新情報 初期インポート ===");
  console.log("対象: Vol.1121 以降\n");

  // Get existing documents
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("documents")
    .select("vol_number");
  const existingVols = new Set(
    (existing || []).map((d: { vol_number: number }) => d.vol_number)
  );
  console.log(`既存データ: ${existingVols.size} 件\n`);

  // Scrape the page
  console.log("厚労省サイトをスキャン中...");
  const items = await scrapeLatestInfoPage();
  console.log(`検出: ${items.length} 件\n`);

  const newItems = items.filter((i) => !existingVols.has(i.vol_number));
  console.log(`新規取り込み対象: ${newItems.length} 件\n`);

  if (newItems.length === 0) {
    console.log("新規データはありません。");
    return;
  }

  // Process in order (oldest first)
  const sorted = newItems.sort((a, b) => a.vol_number - b.vol_number);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    console.log(
      `[${i + 1}/${sorted.length}] Vol.${item.vol_number}: ${item.title.slice(0, 50)}...`
    );

    try {
      await ingestDocument(item, { notify: false });
      success++;
    } catch (e) {
      console.error(`  エラー: ${e}`);
      failed++;
    }

    // Rate limit: wait 3 seconds between items to respect API limits
    if (i < sorted.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
}

main().catch(console.error);
