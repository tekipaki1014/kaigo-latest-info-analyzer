import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function generateSummary(text: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `以下は厚生労働省の介護保険最新情報の内容です。日本語で簡潔に要約してください（300文字程度）。
重要なポイント、対象者、施行日、主な変更点を含めてください。

---
${text.slice(0, 15000)}
---

要約:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text.slice(0, 8000));
  return result.embedding.values;
}

export async function chatWithContext(
  question: string,
  contexts: { vol_number: number; title: string; content: string }[]
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextText = contexts
    .map(
      (c) =>
        `【Vol.${c.vol_number} - ${c.title}】\n${c.content.slice(0, 3000)}`
    )
    .join("\n\n---\n\n");

  const prompt = `あなたは介護保険制度の専門アシスタントです。以下の厚生労働省の介護保険最新情報を参考に、質問に正確に回答してください。
回答には必ず参照元のVol番号を明記してください。情報が見つからない場合はその旨を伝えてください。

【参考資料】
${contextText}

【質問】
${question}

【回答】`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
