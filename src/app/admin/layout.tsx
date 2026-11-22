"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  FileCheck2,
  CalendarClock,
  BarChart3,
  LogOut,
  Warehouse,
} from "lucide-react";

interface AdminUser {
  id: string;
  namaLengkap: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.data?.user?.role?.toLowerCase() === "admin") {
            setUser(json.data.user);
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    }
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    {
      label: "Ringkasan Operasional",
      href: "/admin",
      icon: LayoutDashboard,
      desc: "Overview & metrik sistem",
    },
    {
      label: "Inventaris Garasi",
      href: "/admin/garasi",
      icon: KeyRound,
      desc: "Batch auto-ID S, C, E",
    },
    {
      label: "Verifikasi Pendaftar",
      href: "/admin/verifikasi",
      icon: FileCheck2,
      desc: "Antrean KTP calon penyewa",
    },
    {
      label: "Perpanjang Sewa",
      href: "/admin/perpanjang",
      icon: CalendarClock,
      desc: "Extend sewa aktif & biaya",
    },
    {
      label: "Laporan Sewa Garasi",
      href: "/admin/laporan",
      icon: BarChart3,
      desc: "Rekapitulasi 4 dimensi",
    },
  ];

  return (
    <div className="min-h-screen flex bg-canvas text-slate-900">
      {/* 240px Operational Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex min-h-screen fixed left-0 top-0 bottom-0 z-30">
        <div>
          {/* Header Brand */}
          <div className="p-4 border-b border-slate-100">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-hairline">
                G
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>GARENT</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                    PRO
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Garage Rental</div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="p-3 space-y-4">
            <div>
              <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                <span>MENU OPERASIONAL ADMIN</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-slate-900 text-white shadow-hairline"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isActive ? "text-white" : "text-slate-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.label}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isActive ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-steel-50 border border-steel-200 text-steel-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                A
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user?.namaLengkap || "Administrator"}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {user?.email || "admin@garasi.com"}
                </div>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
              ADMIN
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        {/* Mobile Topbar */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
              G
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">GARENT Admin</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/admin"
              className={`text-xs px-2 py-1 rounded font-medium ${
                pathname === "/admin" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Overview
            </Link>
            <Link
              href="/admin/garasi"
              className={`text-xs px-2 py-1 rounded font-medium ${
                pathname === "/admin/garasi" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Garasi
            </Link>
            <Link
              href="/admin/verifikasi"
              className={`text-xs px-2 py-1 rounded font-medium ${
                pathname === "/admin/verifikasi" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Verifikasi
            </Link>
            <Link
              href="/admin/perpanjang"
              className={`text-xs px-2 py-1 rounded font-medium ${
                pathname === "/admin/perpanjang" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Perpanjang
            </Link>
            <Link
              href="/admin/laporan"
              className={`text-xs px-2 py-1 rounded font-medium ${
                pathname === "/admin/laporan" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Laporan
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-red-600 p-1 hover:bg-red-50 rounded"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
