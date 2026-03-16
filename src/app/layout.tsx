import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "介護保険最新情報 解析ツール",
  description:
    "厚生労働省の介護保険最新情報を自動収集・解析し、AIによる対話・検索が可能なツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
