import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { generateEmbedding, chatWithContext } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "質問を入力してください" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Search for similar documents using pgvector
    const { data: documents, error } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: JSON.stringify(questionEmbedding),
        match_threshold: 0.3,
        match_count: 5,
      }
    );

    if (error) {
      console.error("Vector search error:", error);
      return NextResponse.json(
        { error: "検索中にエラーが発生しました" },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer: "関連する介護保険最新情報が見つかりませんでした。質問を変えてお試しください。",
        sources: [],
      });
    }

    // Generate answer using Gemini with context
    const answer = await chatWithContext(question, documents);

    const sources = documents.map(
      (doc: { vol_number: number; title: string; similarity: number }) => ({
        vol_number: doc.vol_number,
        title: doc.title,
        similarity: doc.similarity,
      })
    );

    return NextResponse.json({ answer, sources });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json(
      { error: "回答の生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
