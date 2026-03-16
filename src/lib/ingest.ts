import { createServiceClient } from "./supabase-server";
import { downloadPdf } from "./scraper";
import { extractTextFromPdf } from "./pdf-processor";
import { generateSummary, generateEmbedding } from "./gemini";
import { sendNewInfoNotification } from "./email";
import type { ScrapedItem } from "./scraper";

export async function ingestDocument(
  item: ScrapedItem,
  options: { notify?: boolean } = {}
) {
  const supabase = createServiceClient();

  // Check if already exists
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("vol_number", item.vol_number)
    .single();

  if (existing) {
    console.log(`Vol.${item.vol_number} already exists, skipping`);
    return { skipped: true };
  }

  console.log(`Processing Vol.${item.vol_number}...`);

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
    console.error(`Storage upload error for Vol.${item.vol_number}:`, uploadError);
  }

  // Extract text
  const text = await extractTextFromPdf(pdfBuffer);

  // Generate summary
  const summary = await generateSummary(text);

  // Generate embedding
  const embedding = await generateEmbedding(text);

  // Insert into database
  const { error: insertError } = await supabase.from("documents").insert({
    vol_number: item.vol_number,
    title: item.title,
    pdf_url: item.pdf_url,
    storage_path: storagePath,
    published_date: item.published_date,
    content: text,
    summary,
    embedding: JSON.stringify(embedding),
  });

  if (insertError) {
    throw new Error(
      `Failed to insert Vol.${item.vol_number}: ${insertError.message}`
    );
  }

  // Send notification if requested
  if (options.notify) {
    try {
      await sendNewInfoNotification({
        volNumber: item.vol_number,
        title: item.title,
        summary,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      });
    } catch (e) {
      console.error(`Email notification failed for Vol.${item.vol_number}:`, e);
    }
  }

  console.log(`Vol.${item.vol_number} ingested successfully`);
  return { skipped: false, vol_number: item.vol_number };
}
