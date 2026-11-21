"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { formatRupiah, formatDate, formatDateTime } from "@/lib/format";
import {
  History,
  PlusCircle,
  FileText,
  Clock,
  Car,
  Bike,
  Zap,
  Eye,
  RefreshCw,
} from "lucide-react";

interface UserProfile {
  id: string;
  namaLengkap: string;
  email: string;
  role: "ADMIN" | "PENYEWA";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
}

interface RentalRecord {
  id: string;
  tipeSewa: "HARIAN" | "BULANAN";
  jumlahHari: number | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  biayaSewa: number;
  biayaListrik: number;
  totalBiaya: number;
  buktiPelunasanUrl: string;
  createdAt: string;
  garasi: {
    kodeGarasi: string;
    tipeGarasi: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
    status: "AVAILABLE" | "USED";
    hargaSewaHarian: number;
  };
  kendaraan: {
    tipeKendaraan: "SEPEDA" | "SEPEDA_MOTOR" | "MOBIL" | "MOBIL_LISTRIK";
    nomorPlat: string | null;
    merekTipe: string;
    kapasitasListrikKwh: number | null;
  };
  perpanjanganList: {
    id: string;
    tanggalSelesaiLama: string;
    tanggalSelesaiBaru: string;
    tambahanHari: number;
    sisaBiaya: number;
    buktiBayarUrl: string;
    createdAt: string;
    admin: {
      namaLengkap: string;
      email: string;
    };
  }[];
}

export default function RiwayatSewaPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load user
      const userRes = await fetch("/api/auth/me");
      if (!userRes.ok) {
        router.push("/login");
        return;
      }
      const userJson = await userRes.json();
      setCurrentUser(userJson.data.user);

      // 2. Load rentals
      const rentRes = await fetch("/api/penyewa/riwayat");
      if (rentRes.ok) {
        const rentJson = await rentRes.json();
        setRentals(rentJson.data.rentals || []);
      }
    } catch (err) {
      console.error("Error loading riwayat:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openProof = (url: string, title: string) => {
    setLightboxUrl(url);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={currentUser || undefined} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>PENYEWA WORKSPACE</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">RIWAYAT SEWA</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daftar Garasi & Riwayat Sewa Saya
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pantau masa aktif garasi, rincian biaya sewa dan listrik, bukti pembayaran, serta riwayat perpanjangan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Segarkan
            </Button>
            <Link href="/penyewa/sewa-baru">
              <Button size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />}>
                Sewa Garasi Baru
              </Button>
            </Link>
          </div>
        </div>

        {/* Rentals List */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <span>Transaksi Sewa Garasi ({rentals.length})</span>
              </div>
            }
            subtitle="Data riwayat penyewaan resmi yang tersimpan di sistem"
          />

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Memuat data riwayat sewa...
              </div>
            ) : rentals.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto stroke-1" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-700">Belum ada transaksi penyewaan garasi.</p>
                  <p className="mt-1">Anda belum pernah menyewa garasi atau data sewa masih kosong.</p>
                </div>
                <Link href="/penyewa/sewa-baru">
                  <Button size="sm">Mulai Sewa Sekarang</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Garasi</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Tipe Sewa</TableHead>
                    <TableHead>Periode Sewa</TableHead>
                    <TableHead>Rincian Biaya</TableHead>
                    <TableHead>Total Bayar</TableHead>
                    <TableHead>Bukti Pelunasan</TableHead>
                    <TableHead>Perpanjangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentals.map((r) => {
                    const today = new Date();
                    const endDate = new Date(r.tanggalSelesai);
                    const isActive = endDate >= today;

                    return (
                      <TableRow key={r.id}>
                        {/* Kode Garasi */}
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-xs text-slate-900 block">
                              {r.garasi.kodeGarasi}
                            </span>
                            <Badge
                              variant={
                                r.garasi.tipeGarasi === "SEPEDA"
                                  ? "sepeda"
                                  : r.garasi.tipeGarasi === "MOBIL"
                                  ? "mobil"
                                  : "mobil_listrik"
                              }
                            >
                              {r.garasi.tipeGarasi}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Kendaraan */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              {r.kendaraan.tipeKendaraan === "SEPEDA" ||
                              r.kendaraan.tipeKendaraan === "SEPEDA_MOTOR" ? (
                                <Bike className="w-3.5 h-3.5 text-slate-500" />
                              ) : r.kendaraan.tipeKendaraan === "MOBIL_LISTRIK" ? (
                                <Zap className="w-3.5 h-3.5 text-teal-600" />
                              ) : (
                                <Car className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              <span>{r.kendaraan.merekTipe}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {r.kendaraan.nomorPlat ? r.kendaraan.nomorPlat : "Tanpa Plat (Sepeda)"}
                            </div>
                            {r.kendaraan.kapasitasListrikKwh && (
                              <div className="text-[10px] text-teal-700 font-mono">
                                Baterai: {r.kendaraan.kapasitasListrikKwh} kWh
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Tipe Sewa */}
                        <TableCell>
                          <Badge variant="neutral">
                            {r.tipeSewa === "HARIAN" ? `Harian (${r.jumlahHari} Hari)` : "Bulanan"}
                          </Badge>
                        </TableCell>

                        {/* Periode Sewa */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="text-slate-600">
                              Mulai: <span className="font-mono font-medium text-slate-900">{formatDate(r.tanggalMulai)}</span>
                            </div>
                            <div className="text-slate-600">
                              Selesai: <span className="font-mono font-medium text-slate-900">{formatDate(r.tanggalSelesai)}</span>
                            </div>
                            <div>
                              <Badge variant={isActive ? "available" : "neutral"}>
                                {isActive ? "Masa Aktif" : "Selesai"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* Rincian Biaya */}
                        <TableCell>
                          <div className="space-y-0.5 text-[11px] font-mono text-slate-600">
                            <div>Sewa: {formatRupiah(r.biayaSewa)}</div>
                            {Number(r.biayaListrik) > 0 && (
                              <div className="text-teal-700">
                                Listrik: {formatRupiah(r.biayaListrik)}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Total Bayar */}
                        <TableCell>
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {formatRupiah(r.totalBiaya)}
                          </span>
                        </TableCell>

                        {/* Bukti Pelunasan */}
                        <TableCell>
                          <button
                            onClick={() =>
                              openProof(
                                r.buktiPelunasanUrl,
                                `Bukti Bayar Sewa — ${r.garasi.kodeGarasi} (${formatDate(r.createdAt)})`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded text-[11px] font-medium text-steel-700 hover:bg-steel-50 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat Bukti</span>
                          </button>
                        </TableCell>

                        {/* Riwayat Perpanjangan */}
                        <TableCell>
                          {r.perpanjanganList.length === 0 ? (
                            <span className="text-slate-400 text-[11px]">-</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-700 block">
                                {r.perpanjanganList.length}x Diperpanjang
                              </span>
                              {r.perpanjanganList.map((ext) => (
                                <div
                                  key={ext.id}
                                  className="text-[10px] p-1.5 bg-slate-50 border border-slate-200 rounded font-mono space-y-0.5"
                                >
                                  <div>+{ext.tambahanHari} hari ({formatRupiah(ext.sisaBiaya)})</div>
                                  <div className="text-slate-400">s/d {formatDate(ext.tanggalSelesaiBaru)}</div>
                                  <button
                                    onClick={() =>
                                      openProof(
                                        ext.buktiBayarUrl,
                                        `Bukti Perpanjangan — ${r.garasi.kodeGarasi}`
                                      )
                                    }
                                    className="text-steel-700 hover:underline flex items-center gap-0.5"
                                  >
                                    <Eye className="w-2.5 h-2.5" /> Bukti Perpanjangan
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxUrl}
        title={lightboxTitle}
      />
    </div>
  );
}
