"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { formatRupiah } from "@/lib/format";
import {
  Warehouse,
  KeyRound,
  FileCheck2,
  CalendarClock,
  BarChart3,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Car,
  Bike,
  Zap,
} from "lucide-react";

interface OverviewData {
  garageStats: {
    tipeGarasi: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
    status: "AVAILABLE" | "USED";
    _count: { id: number };
  }[];
  pendingVerificationCount: number;
  activeRentalsCount: number;
  revenue: {
    totalBiayaSewa: number;
    totalBiayaListrik: number;
    totalBiayaPerpanjangan: number;
    grandTotalRevenue: number;
  };
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    namaLengkap: string;
    email: string;
    role: "ADMIN";
  } | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load user session
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) {
        router.push("/login");
        return;
      }
      const userJson = await userRes.json();
      if (userJson.data.user.role !== "ADMIN") {
        router.push("/penyewa/sewa-baru");
        return;
      }
      setCurrentUser(userJson.data.user);

      // 2. Load overview stats
      const overRes = await fetch("/api/admin/overview");
      if (overRes.ok) {
        const overJson = await overRes.json();
        setData(overJson.data.overview);
      }
    } catch (err) {
      console.error("Overview error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate garage bay counts per type
  const getBayCounts = (type: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK") => {
    if (!data) return { available: 0, used: 0, total: 0 };
    const avail =
      data.garageStats.find((s) => s.tipeGarasi === type && s.status === "AVAILABLE")?._count.id || 0;
    const used =
      data.garageStats.find((s) => s.tipeGarasi === type && s.status === "USED")?._count.id || 0;
    return { available: avail, used, total: avail + used };
  };

  const sepedaCounts = getBayCounts("SEPEDA");
  const mobilCounts = getBayCounts("MOBIL");
  const evCounts = getBayCounts("MOBIL_LISTRIK");

  const totalAllBays = sepedaCounts.total + mobilCounts.total + evCounts.total;
  const totalAvailableBays = sepedaCounts.available + mobilCounts.available + evCounts.available;
  const totalUsedBays = sepedaCounts.used + mobilCounts.used + evCounts.used;

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={currentUser ? { ...currentUser, role: "ADMIN" } : undefined} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>ADMINISTRATOR WORKSPACE</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">OVERVIEW</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pusat Kendali Operasional Garasi
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan ketersediaan bay garasi real-time, verifikasi identitas, dan pendapatan operasional.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan Data
          </Button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Bay Garasi */}
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Kapasitas Garasi</span>
                <Warehouse className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {totalAllBays} <span className="text-xs font-normal text-slate-400">unit</span>
              </div>
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="text-emerald-700 font-medium font-mono">{totalAvailableBays} Tersedia</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-medium font-mono">{totalUsedBays} Terpakai</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pending KTP */}
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Antrean Verifikasi KTP</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {data ? data.pendingVerificationCount : 0}
              </div>
              <Link
                href="/admin/verifikasi"
                className="text-xs text-steel-700 hover:text-steel-900 font-medium inline-flex items-center gap-1 pt-1"
              >
                <span>Tinjau antrean</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Card 3: Sewa Aktif Hari Ini */}
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Garasi Terpakai Hari Ini</span>
                <CalendarClock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {data ? data.activeRentalsCount : 0} <span className="text-xs font-normal text-slate-400">sewa</span>
              </div>
              <Link
                href="/admin/perpanjang"
                className="text-xs text-steel-700 hover:text-steel-900 font-medium inline-flex items-center gap-1 pt-1"
              >
                <span>Kelola perpanjangan</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Card 4: Total Pendapatan Operasional */}
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Grand Total Pendapatan</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {data ? formatRupiah(data.revenue.grandTotalRevenue) : "Rp 0"}
              </div>
              <Link
                href="/admin/laporan"
                className="text-xs text-steel-700 hover:text-steel-900 font-medium inline-flex items-center gap-1 pt-1"
              >
                <span>Buka laporan lengkap</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Bay Inventory Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                title="Status Okupansi Garasi per Kategori"
                subtitle="Data ketersediaan bay terdistribusi berdasarkan tipe kendaraan"
              />
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipe Garasi</TableHead>
                      <TableHead>Prefix Kode</TableHead>
                      <TableHead>Tersedia (AVAILABLE)</TableHead>
                      <TableHead>Terpakai (USED)</TableHead>
                      <TableHead>Total Kapasitas</TableHead>
                      <TableHead>Tingkat Okupansi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* SEPEDA */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-900">SEPEDA</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-slate-700">S001..S999</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="available">{sepedaCounts.available} Bay</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sepedaCounts.used > 0 ? "used" : "neutral"}>
                          {sepedaCounts.used} Bay
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{sepedaCounts.total} / 999</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {sepedaCounts.total > 0
                            ? `${Math.round((sepedaCounts.used / sepedaCounts.total) * 100)}%`
                            : "0%"}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* MOBIL */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-900">MOBIL</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-slate-700">C001..C999</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="available">{mobilCounts.available} Bay</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mobilCounts.used > 0 ? "used" : "neutral"}>
                          {mobilCounts.used} Bay
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{mobilCounts.total} / 999</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {mobilCounts.total > 0
                            ? `${Math.round((mobilCounts.used / mobilCounts.total) * 100)}%`
                            : "0%"}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* MOBIL_LISTRIK */}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-teal-600" />
                          <span className="font-semibold text-slate-900">MOBIL_LISTRIK</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-slate-700">E001..E999</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="available">{evCounts.available} Bay</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={evCounts.used > 0 ? "used" : "neutral"}>
                          {evCounts.used} Bay
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{evCounts.total} / 999</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {evCounts.total > 0
                            ? `${Math.round((evCounts.used / evCounts.total) * 100)}%`
                            : "0%"}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Quick Operational Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Aksi Cepat Admin" subtitle="Navigasi langsung modul operasional" />
              <CardContent className="space-y-2.5">
                <Link
                  href="/admin/garasi"
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Buat Garasi Batch</div>
                      <div className="text-[11px] text-slate-400">Generate kode S, C, E otomatis</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/admin/verifikasi"
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Verifikasi NIK/KTP</div>
                      <div className="text-[11px] text-slate-400">
                        {data?.pendingVerificationCount || 0} akun menunggu peninjauan
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/admin/perpanjang"
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarClock className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Perpanjang Sewa Garasi</div>
                      <div className="text-[11px] text-slate-400">Kalkulasi sisa biaya & upload bukti</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/admin/laporan"
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Eksplorasi Laporan</div>
                      <div className="text-[11px] text-slate-400">4 mode: Bulan, Hari, Tipe, Penyewa</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
