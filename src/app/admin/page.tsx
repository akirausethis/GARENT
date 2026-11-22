"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Warehouse,
  KeyRound,
  FileCheck2,
  CalendarClock,
  BarChart3,
  Bike,
  Car,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/format";

interface OverviewData {
  garageStats: {
    sepeda: { available: number; used: number; total: number };
    mobil: { available: number; used: number; total: number };
    mobil_listrik: { available: number; used: number; total: number };
  };
  pendingVerificationsCount: number;
  activeRentalsCount: number;
  totalPenyewaCount: number;
  totalGaragesCount: number;
  totalRevenue: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch("/api/admin/overview");
        if (res.ok) {
          const json = await res.json();
          setData(json.data?.overview || null);
        }
      } catch (err) {
        console.error("Gagal memuat overview:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOverview();
  }, []);

  const totalAvailable = data
    ? data.garageStats.sepeda.available +
      data.garageStats.mobil.available +
      data.garageStats.mobil_listrik.available
    : 0;

  const totalUsed = data
    ? data.garageStats.sepeda.used +
      data.garageStats.mobil.used +
      data.garageStats.mobil_listrik.used
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Ringkasan Operasional GARENT
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Metrik real-time kapasitas garasi, antrean verifikasi KTP, sewa aktif hari ini, dan rekap omzet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/garasi">
            <Button size="sm" icon={<KeyRound className="w-3.5 h-3.5" />}>
              Batch Garasi Baru
            </Button>
          </Link>
          <Link href="/admin/laporan">
            <Button size="sm" variant="secondary" icon={<BarChart3 className="w-3.5 h-3.5" />}>
              Buka Laporan
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending Verifications Banner */}
      {!isLoading && (data?.pendingVerificationsCount || 0) > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Ada {data?.pendingVerificationsCount} calon penyewa menunggu verifikasi KTP/NIK!
              </div>
              <div className="text-[11px] text-amber-700">
                Penyewa baru tidak dapat melakukan pemesanan garasi sebelum Anda menyetujui identitasnya.
              </div>
            </div>
          </div>
          <Link href="/admin/verifikasi">
            <Button size="sm" variant="secondary" className="border-amber-300 text-amber-900 hover:bg-amber-100 whitespace-nowrap">
              Buka Antrean Verifikasi
            </Button>
          </Link>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Kapasitas Garasi */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>TOTAL KAPASITAS GARASI</span>
            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5 tabular-nums">
            {isLoading ? "..." : data?.totalGaragesCount || 0} <span className="text-xs font-sans font-normal text-slate-500">unit</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-emerald-700 font-semibold">{totalAvailable} Siap Pakai</span>
            <span>&bull;</span>
            <span className="text-amber-700 font-semibold">{totalUsed} Terisi</span>
          </div>
        </div>

        {/* Metric 2: Antrean Verifikasi KTP */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>ANTREAN VERIFIKASI KTP</span>
            <FileCheck2 className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1.5 tabular-nums">
            {isLoading ? "..." : data?.pendingVerificationsCount || 0} <span className="text-xs font-sans font-normal text-slate-500">calon</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <Link href="/admin/verifikasi" className="text-steel-700 hover:text-steel-900 font-medium inline-flex items-center gap-1">
              <span>Proses antrean sekarang</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Sewa Aktif Hari Ini */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>SEWA AKTIF HARI INI</span>
            <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-800 mt-1.5 tabular-nums">
            {isLoading ? "..." : data?.activeRentalsCount || 0} <span className="text-xs font-sans font-normal text-slate-500">transaksi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <Link href="/admin/perpanjang" className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1">
              <span>Kelola perpanjangan sewa</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 4: Total Omzet Pendapatan */}
        <div className="p-4 bg-slate-900 text-white rounded-lg shadow-hairline">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>TOTAL PENDAPATAN SISTEM</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5 tabular-nums">
            {isLoading ? "..." : formatRupiah(data?.totalRevenue || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Sewa pokok + Listrik EV + Perpanjangan
          </div>
        </div>
      </div>

      {/* Breakdown Status Garasi Per Kategori */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sepeda */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-600" />
                <span>Garasi Sepeda (S001..S999)</span>
              </div>
            }
            subtitle="Sepeda gowes & sepeda motor"
          />
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Tersedia (AVAILABLE):</span>
              <span className="font-mono font-bold text-emerald-700">
                {data?.garageStats.sepeda.available || 0} unit
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Terisi (USED):</span>
              <span className="font-mono font-bold text-slate-900">
                {data?.garageStats.sepeda.used || 0} unit
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900">
              <span>Total Unit Sepeda:</span>
              <span className="font-mono">{data?.garageStats.sepeda.total || 0} unit</span>
            </div>
          </CardContent>
        </Card>

        {/* Mobil */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span>Garasi Mobil (C001..C999)</span>
              </div>
            }
            subtitle="Mobil bensin & mobil listrik tanpa charger"
          />
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Tersedia (AVAILABLE):</span>
              <span className="font-mono font-bold text-emerald-700">
                {data?.garageStats.mobil.available || 0} unit
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Terisi (USED):</span>
              <span className="font-mono font-bold text-slate-900">
                {data?.garageStats.mobil.used || 0} unit
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900">
              <span>Total Unit Mobil:</span>
              <span className="font-mono">{data?.garageStats.mobil.total || 0} unit</span>
            </div>
          </CardContent>
        </Card>

        {/* Mobil Listrik */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600" />
                <span>Garasi EV (E001..E999)</span>
              </div>
            }
            subtitle="Fasilitas charging bay full-charge"
          />
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Tersedia (AVAILABLE):</span>
              <span className="font-mono font-bold text-emerald-700">
                {data?.garageStats.mobil_listrik.available || 0} unit
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Status Terisi (USED):</span>
              <span className="font-mono font-bold text-slate-900">
                {data?.garageStats.mobil_listrik.used || 0} unit
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900">
              <span>Total Unit Mobil Listrik:</span>
              <span className="font-mono">{data?.garageStats.mobil_listrik.total || 0} unit</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <Card>
        <CardHeader
          title="Akses Cepat Modul Operasional Admin"
          subtitle="Gunakan jalan pintas di bawah ini untuk mengakses setiap modul secara langsung"
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/admin/garasi"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded bg-slate-100 text-slate-800 flex items-center justify-center mb-2">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-900">Inventaris Garasi</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Batch auto-ID kode S, C, E, batas 999 unit per tipe.
                </p>
              </div>
              <div className="text-[10px] font-mono text-steel-700 mt-3 font-medium flex items-center gap-1">
                <span>Buka Form</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            <Link
              href="/admin/verifikasi"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded bg-amber-50 text-amber-800 flex items-center justify-center mb-2">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-900">Verifikasi Pendaftar</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Antrean persetujuan KTP penyewa baru (Terima / Tolak).
                </p>
              </div>
              <div className="text-[10px] font-mono text-amber-700 mt-3 font-medium flex items-center gap-1">
                <span>Lihat Antrean ({data?.pendingVerificationsCount || 0})</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            <Link
              href="/admin/perpanjang"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-800 flex items-center justify-center mb-2">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-900">Perpanjang Sewa</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Perpanjang masa sewa aktif dan hitung sisa biaya otomatis.
                </p>
              </div>
              <div className="text-[10px] font-mono text-blue-700 mt-3 font-medium flex items-center gap-1">
                <span>Kelola Sewa ({data?.activeRentalsCount || 0})</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>

            <Link
              href="/admin/laporan"
              className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded bg-slate-100 text-slate-800 flex items-center justify-center mb-2">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-900">Laporan Sewa Garasi</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rekapitulasi 4 dimensi (Bulan, Hari, Tipe, Penyewa) & PDF.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-700 mt-3 font-medium flex items-center gap-1">
                <span>Eksplor Laporan</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
