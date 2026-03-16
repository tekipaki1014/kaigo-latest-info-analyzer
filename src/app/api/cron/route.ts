import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { scrapeLatestInfoPage } from "@/lib/scraper";
import { ingestDocument } from "@/lib/ingest";

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Get existing vol numbers
    const { data: existing } = await supabase
      .from("documents")
      .select("vol_number");

    const existingVols = new Set(
      (existing || []).map((d: { vol_number: number }) => d.vol_number)
    );

    // Scrape the page
    const items = await scrapeLatestInfoPage();
    const newItems = items.filter(
      (item) => !existingVols.has(item.vol_number)
    );

    if (newItems.length === 0) {
      return NextResponse.json({
        message: "No new documents found",
        checked: items.length,
      });
    }

    // Process new items (with notification)
    const results = [];
    for (const item of newItems) {
      try {
        const result = await ingestDocument(item, { notify: true });
        results.push(result);
        // Rate limit: wait between API calls
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Failed to ingest Vol.${item.vol_number}:`, e);
        results.push({ vol_number: item.vol_number, error: String(e) });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} new documents`,
      results,
    });
  } catch (e) {
    console.error("Cron error:", e);
    return NextResponse.json(
      { error: "Cron job failed", details: String(e) },
      { status: 500 }
    );
  }
}
