"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function Header() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/", label: "ダッシュボード" },
    { href: "/chat", label: "AI対話" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-indigo-600">
              介護保険最新情報
            </Link>
            <nav className="hidden sm:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
