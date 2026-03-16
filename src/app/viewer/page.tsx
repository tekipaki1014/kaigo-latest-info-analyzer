"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";

interface DocumentDetail {
  id: string;
  vol_number: number;
  title: string;
  summary: string;
  pdf_url: string;
  published_date: string | null;
  content: string;
}

function ViewerContent() {
  const searchParams = useSearchParams();
  const vol = searchParams.get("vol");
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pdf" | "summary" | "text">("pdf");

  useEffect(() => {
    if (!vol) return;
    fetch(`/api/documents/${vol}`)
      .then((r) => r.json())
      .then((data) => setDoc(data.document || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vol]);

  if (!vol) {
    return (
      <div className="text-center py-20 text-gray-400">
        Vol番号を指定してください（例: /viewer?vol=1121）
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  }

  if (!doc) {
    return (
      <div className="text-center py-20 text-gray-400">
        Vol.{vol} のデータが見つかりません
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
              Vol.{doc.vol_number}
            </span>
            {doc.published_date && (
              <span className="text-xs text-gray-400">
                {doc.published_date}
              </span>
            )}
          </div>
          <h1 className="text-sm font-medium text-gray-800">{doc.title}</h1>

          <div className="flex gap-1 mt-3">
            {(["pdf", "summary", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === t
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t === "pdf" ? "PDF" : t === "summary" ? "AI要約" : "テキスト"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4">
        {tab === "pdf" && (
          <iframe
            src={doc.pdf_url}
            className="w-full h-[calc(100vh-220px)] rounded-lg border border-gray-200"
            title={`Vol.${doc.vol_number} PDF`}
          />
        )}
        {tab === "summary" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              AI要約
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {doc.summary}
            </p>
          </div>
        )}
        {tab === "text" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              抽出テキスト
            </h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-[calc(100vh-300px)] overflow-y-auto">
              {doc.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <Suspense
        fallback={
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        }
      >
        <ViewerContent />
      </Suspense>
    </div>
  );
}
