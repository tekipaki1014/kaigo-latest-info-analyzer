import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vol: string }> }
) {
  const { vol } = await params;
  const volNumber = parseInt(vol, 10);

  if (isNaN(volNumber)) {
    return NextResponse.json(
      { error: "Invalid vol number" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, vol_number, title, summary, pdf_url, published_date, content")
    .eq("vol_number", volNumber)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ document: data });
}
