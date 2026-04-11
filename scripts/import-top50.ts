/**
 * 最新50件をAI処理なしでインポート
 */
import "dotenv/config";
import { createServiceClient } from "../src/lib/supabase-server";
import { scrapeLatestInfoPage, downloadPdf } from "../src/lib/scraper";
import { extractTextFromPdf } from "../src/lib/pdf-processor";

async function main() {
  console.log("=== 最新50件インポート（AI処理スキップ） ===\n");

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("documents")
    .select("vol_number");
  const existingVols = new Set((existing || []).map((d) => d.vol_number));
  console.log(`既存データ: ${existingVols.size} 件\n`);

  console.log("厚労省サイトをスキャン中...");
  const allItems = await scrapeLatestInfoPage();
  console.log(`検出: ${allItems.length} 件\n`);

  // 最新順（vol_number降順）で、未取得のものから50件取得
  const newItems = allItems
    .filter((item) => !existingVols.has(item.vol_number))
    .sort((a, b) => b.vol_number - a.vol_number)
    .slice(0, 50);

  console.log(`新規取り込み対象: ${newItems.length} 件\n`);

  if (newItems.length === 0) {
    console.log("新規データはありません。");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < newItems.length; i++) {
    const item = newItems[i];
    console.log(
      `[${i + 1}/${newItems.length}] Vol.${item.vol_number}: ${item.title.substring(0, 60)}...`
    );

    try {
      const pdfBuffer = await downloadPdf(item.pdf_url);

      const storagePath = `pdfs/vol_${item.vol_number}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`  Storage warning: ${uploadError.message}`);
      }

      const text = await extractTextFromPdf(pdfBuffer);

      const { error: insertError } = await supabase.from("documents").insert({
        vol_number: item.vol_number,
        title: item.title,
        pdf_url: item.pdf_url,
        storage_path: storagePath,
        published_date: item.published_date,
        content: text,
        summary: null,
        embedding: null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      console.log(`  ✅ 成功（${text.length} 文字）`);
      success++;
    } catch (e) {
      console.error(`  ❌ エラー: ${(e as Error).message}`);
      failed++;
    }

    if (i < newItems.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
}

main().catch(console.error);
