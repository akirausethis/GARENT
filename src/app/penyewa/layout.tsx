"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Warehouse,
  History,
  LogOut,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import clsx from "clsx";

interface PenyewaUser {
  id: string;
  fullName: string;
  namaLengkap?: string;
  email: string;
  nik?: string;
  role: string;
  statusVerifikasi?: string;
  verificationStatus?: string;
}

export default function PenyewaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PenyewaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          const u = json.data?.user;
          if (!u) {
            router.push("/login");
            return;
          }
          if (u.role?.toLowerCase() === "admin") {
            router.push("/admin/garasi");
            return;
          }
          setUser(u);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
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

  const navLinks = [
    {
      href: "/penyewa/sewa-baru",
      label: "Sewa Baru Garasi",
      icon: Warehouse,
      desc: "Pilih garasi & kalkulasi biaya",
    },
    {
      href: "/penyewa/riwayat",
      label: "Riwayat Sewa",
      icon: History,
      desc: "Garasi aktif & bukti pelunasan",
    },
  ];

  const verificationStatus = (
    user?.verificationStatus ||
    user?.statusVerifikasi ||
    "pending"
  ).toLowerCase();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/penyewa/sewa-baru" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-hairline">
                  G
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                    <span>GARENT</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-steel-100 text-steel-800 rounded">
                      PENYEWA
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">Garage Rental</div>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={clsx(
                        "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors",
                        isActive
                          ? "bg-slate-900 text-white shadow-hairline"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <Icon className={clsx("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: User Profile & Actions */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-3 border-r border-slate-200 pr-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900">
                      {user.namaLengkap || user.fullName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      NIK: {user.nik || "-"}
                    </div>
                  </div>

                  {verificationStatus === "approved" && (
                    <Badge variant="approved">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Terverifikasi</span>
                    </Badge>
                  )}
                  {verificationStatus === "pending" && (
                    <Badge variant="pending">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Menunggu Approval</span>
                    </Badge>
                  )}
                  {verificationStatus === "rejected" && (
                    <Badge variant="rejected">
                      <AlertCircle className="w-3 h-3 text-red-600" />
                      <span>Ditolak</span>
                    </Badge>
                  )}
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors"
                title="Keluar dari sistem"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Mobile Nav Links */}
          <div className="md:hidden py-2 border-t border-slate-100 flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded",
                    isActive ? "bg-slate-900 text-white" : "text-slate-600 bg-slate-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Memuat data sesi pengguna...
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        GARENT (Garage Rental) &copy; 2026. Portal Penyewa Kendaraan.
      </footer>
    </div>
  );
}
