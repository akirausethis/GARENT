"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Badge } from "./Badge";
import {
  Warehouse,
  KeyRound,
  FileCheck2,
  CalendarClock,
  BarChart3,
  LogOut,
  History,
  PlusCircle,
  Menu,
  X,
} from "lucide-react";

interface NavbarProps {
  user?: {
    id: string;
    namaLengkap: string;
    email: string;
    role: "ADMIN" | "PENYEWA";
    statusVerifikasi?: "PENDING" | "APPROVED" | "REJECTED";
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  };

  const adminLinks = [
    { href: "/admin", label: "Ringkasan", icon: <Warehouse className="w-4 h-4" /> },
    { href: "/admin/garasi", label: "Kelola Garasi", icon: <KeyRound className="w-4 h-4" /> },
    { href: "/admin/verifikasi", label: "Verifikasi KTP", icon: <FileCheck2 className="w-4 h-4" /> },
    { href: "/admin/perpanjang", label: "Perpanjangan", icon: <CalendarClock className="w-4 h-4" /> },
    { href: "/admin/laporan", label: "Laporan Pendapatan", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const penyewaLinks = [
    { href: "/penyewa/sewa-baru", label: "Sewa Baru", icon: <PlusCircle className="w-4 h-4" /> },
    { href: "/penyewa/riwayat", label: "Riwayat Sewa", icon: <History className="w-4 h-4" /> },
  ];

  const links = user?.role === "ADMIN" ? adminLinks : penyewaLinks;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href={user?.role === "ADMIN" ? "/admin" : "/penyewa/sewa-baru"}
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs tracking-wider shadow-hairline">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-slate-900 leading-none">
                  GARASIKU
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider leading-tight mt-0.5">
                  OPERATIONAL HUB
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-slate-900 leading-none">
                      {user.namaLengkap}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                      {user.email}
                    </span>
                  </div>
                  <Badge variant={user.role === "ADMIN" ? "neutral" : "steel"}>
                    {user.role}
                  </Badge>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Keluar dari sistem"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>

                {/* Mobile hamburger button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800"
                >
                  Daftar Penyewa
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {user && mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded text-xs font-medium",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
