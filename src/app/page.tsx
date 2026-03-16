"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";

interface Document {
  id: string;
  vol_number: number;
  title: string;
  summary: string;
  published_date: string | null;
  pdf_url: string;
  created_at: string;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="キーワードで検索..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            全 {total} 件の介護保険最新情報（Vol.1121〜）
          </p>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() =>
                  setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
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
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
                      {doc.title}
                    </h3>

                    {selectedDoc?.id === doc.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {doc.summary}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            PDF を開く
                          </a>
                          <a
                            href={`/viewer?vol=${doc.vol_number}`}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ビューアーで表示
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              前へ
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              次へ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
