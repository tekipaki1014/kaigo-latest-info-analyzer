/**
 * AI処理(要約・ベクトル)をスキップして、
 * スクレイピング → PDFダウンロード → テキスト抽出 → DB保存のみ行うスクリプト
 *
 * 使い方: npx tsx scripts/import-without-ai.ts
 * 後からAI処理を追加: npx tsx scripts/backfill-ai.ts (別途作成)
 */
import "dotenv/config";
import { createServiceClient } from "../src/lib/supabase-server";
import { scrapeLatestInfoPage, downloadPdf } from "../src/lib/scraper";
import { extractTextFromPdf } from "../src/lib/pdf-processor";

async function main() {
  console.log("=== 介護保険最新情報 インポート（AI処理スキップ） ===");
  console.log("対象: Vol.1121 以降\n");

  const supabase = createServiceClient();

  // Check existing
  const { data: existing } = await supabase
    .from("documents")
    .select("vol_number");
  const existingVols = new Set((existing || []).map((d) => d.vol_number));
  console.log(`既存データ: ${existingVols.size} 件\n`);

  // Scrape
  console.log("厚労省サイトをスキャン中...");
  const items = await scrapeLatestInfoPage();
  console.log(`検出: ${items.length} 件\n`);

  const newItems = items.filter((item) => !existingVols.has(item.vol_number));
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
      // Download PDF
      const pdfBuffer = await downloadPdf(item.pdf_url);

      // Upload PDF to Supabase Storage
      const storagePath = `pdfs/vol_${item.vol_number}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`  Storage upload warning: ${uploadError.message}`);
      }

      // Extract text from PDF
      const text = await extractTextFromPdf(pdfBuffer);

      // Insert into database (summary=null, embedding=null)
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

      console.log(`  ✅ 成功（テキスト: ${text.length} 文字）`);
      success++;
    } catch (e) {
      console.error(`  ❌ エラー: ${(e as Error).message}`);
      failed++;
    }

    // Rate limit: 少し待つ（厚労省サーバーへの負荷対策）
    if (i < newItems.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
  console.log(`\n※ AI要約・ベクトルは後から追加できます`);
}

main().catch(console.error);
