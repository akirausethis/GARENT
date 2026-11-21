"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  BarChart3,
  Calendar,
  Layers,
  Users,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from "lucide-react";

interface ReportSummary {
  totalTransaksi: number;
  totalBiayaSewa: number;
  totalBiayaListrik: number;
  totalBiayaPerpanjangan: number;
  grandTotal: number;
}

interface ReportTransaction {
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
  };
  kendaraan: {
    tipeKendaraan: string;
    nomorPlat: string | null;
    merekTipe: string;
  };
  penyewa: {
    id: string;
    namaLengkap: string;
    email: string;
    nik: string | null;
  };
  perpanjanganList: {
    id: string;
    tambahanHari: number;
    sisaBiaya: number;
  }[];
}

export default function AdminLaporanPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; namaLengkap: string; email: string; role: "ADMIN" } | null>(null);

  // Filter modes: 'bulan' | 'hari' | 'tipe' | 'penyewa'
  const [mode, setMode] = useState<"bulan" | "hari" | "tipe" | "penyewa">("bulan");
  const [tahun, setTahun] = useState<number>(2026);
  const [bulan, setBulan] = useState<number>(11); // 1-12
  const [tipeGarasi, setTipeGarasi] = useState<string>("MOBIL");
  const [penyewaList, setPenyewaList] = useState<{ id: string; namaLengkap: string; email: string }[]>([]);
  const [selectedPenyewaId, setSelectedPenyewaId] = useState<string>("");

  const [summary, setSummary] = useState<ReportSummary>({
    totalTransaksi: 0,
    totalBiayaSewa: 0,
    totalBiayaListrik: 0,
    totalBiayaPerpanjangan: 0,
    grandTotal: 0,
  });
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");

  // Load applicants for penyewa dropdown
  useEffect(() => {
    async function loadPenyewaDropdown() {
      try {
        const res = await fetch("/api/admin/verifikasi");
        if (res.ok) {
          const json = await res.json();
          const list = json.data.applicants || [];
          setPenyewaList(list);
          if (list.length > 0) {
            setSelectedPenyewaId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Dropdown load error:", err);
      }
    }
    loadPenyewaDropdown();
  }, []);

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    setIsLoading(true);
    try {
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

      // Build query params
      const params = new URLSearchParams();
      params.set("mode", mode);
      params.set("tahun", String(tahun));

      if (mode === "hari") {
        params.set("bulan", String(bulan));
      } else if (mode === "tipe") {
        params.set("tipeGarasi", tipeGarasi);
      } else if (mode === "penyewa") {
        if (selectedPenyewaId) {
          params.set("penyewaId", selectedPenyewaId);
        }
      }

      const res = await fetch(`/api/admin/laporan?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data.summary);
        setTransactions(json.data.transactions || []);
      }
    } catch (err) {
      console.error("Fetch report error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router, mode, tahun, bulan, tipeGarasi, selectedPenyewaId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const openProof = (url: string, title: string) => {
    setLightboxUrl(url);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

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
              <span className="text-slate-900 font-semibold">LAPORAN OPERASIONAL</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Eksplorasi Laporan Pendapatan Garasi
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Laporan terverifikasi 4 dimensi: Per Bulan dalam Tahun, Per Hari dalam Bulan, Per Tipe Garasi, dan Per Penyewa.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReport}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan Laporan
          </Button>
        </div>

        {/* 4 Reporting Mode Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              id: "bulan",
              label: "Per Bulan dalam Tahun",
              desc: "Agregasi transaksi per tahun",
              icon: <Calendar className="w-4 h-4" />,
            },
            {
              id: "hari",
              label: "Per Hari dalam Bulan",
              desc: "Rincian harian bulan terpilih",
              icon: <BarChart3 className="w-4 h-4" />,
            },
            {
              id: "tipe",
              label: "Per Tipe Garasi",
              desc: "Sepeda, Mobil, atau EV",
              icon: <Layers className="w-4 h-4" />,
            },
            {
              id: "penyewa",
              label: "Per Penyewa",
              desc: "Akumulasi per nama penyewa",
              icon: <Users className="w-4 h-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as typeof mode)}
              className={`p-3 text-left border rounded-lg transition-all ${
                mode === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-hairline"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={mode === tab.id ? "text-emerald-400" : "text-slate-500"}>
                  {tab.icon}
                </span>
                <span className="text-xs font-bold leading-tight">{tab.label}</span>
              </div>
              <p className={`text-[11px] truncate ${mode === tab.id ? "text-slate-300" : "text-slate-400"}`}>
                {tab.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Dimension Filter Bar */}
        <Card className="bg-white">
          <CardContent className="p-4 flex flex-wrap items-center gap-4 text-xs">
            {/* Filter Tahun */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Tahun:</span>
              <select
                value={tahun}
                onChange={(e) => setTahun(parseInt(e.target.value))}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-mono font-medium"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Bulan (if mode === 'hari') */}
            {mode === "hari" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Bulan:</span>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(parseInt(e.target.value))}
                  className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-medium"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Tipe Garasi (if mode === 'tipe') */}
            {mode === "tipe" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Tipe Garasi:</span>
                <select
                  value={tipeGarasi}
                  onChange={(e) => setTipeGarasi(e.target.value)}
                  className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-medium"
                >
                  <option value="SEPEDA">SEPEDA (S001..S999)</option>
                  <option value="MOBIL">MOBIL (C001..C999)</option>
                  <option value="MOBIL_LISTRIK">MOBIL_LISTRIK (E001..E999)</option>
                </select>
              </div>
            )}

            {/* Filter Penyewa (if mode === 'penyewa') */}
            {mode === "penyewa" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Penyewa:</span>
                <select
                  value={selectedPenyewaId}
                  onChange={(e) => setSelectedPenyewaId(e.target.value)}
                  className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-medium max-w-xs truncate"
                >
                  {penyewaList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.namaLengkap} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-slate-400 text-xs ml-auto">
              Mode aktif: <strong>{mode.toUpperCase()}</strong>
            </div>
          </CardContent>
        </Card>

        {/* 4 Summary Cards (Tabular Nums Guaranteed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-slate-500">Total Transaksi</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {summary.totalTransaksi} <span className="text-xs font-normal text-slate-400">transaksi</span>
              </div>
              <p className="text-[11px] text-slate-400">Sesuai kriteria filter saat ini</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-slate-500">Total Biaya Sewa Pokok</span>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatRupiah(summary.totalBiayaSewa)}
              </div>
              <p className="text-[11px] text-slate-400">Penerimaan sewa dasar garasi</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-slate-500">Total Biaya Listrik (EV)</span>
              <div className="text-xl font-bold font-mono text-teal-700">
                {formatRupiah(summary.totalBiayaListrik)}
              </div>
              <p className="text-[11px] text-teal-600">Pengisian daya mobil listrik</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-900">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-slate-400 font-mono uppercase">Grand Total Pendapatan</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {formatRupiah(summary.grandTotal)}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Termasuk perpanjangan: +{formatRupiah(summary.totalBiayaPerpanjangan)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Records Table */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-700" />
                <span>Rincian Transaksi ({transactions.length} Baris)</span>
              </div>
            }
            subtitle="Data audit transaksi sewa dan perpanjangan yang terverifikasi"
          />

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Mengkalkulasi laporan operasional...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <BarChart3 className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold text-slate-700">Tidak ada transaksi ditemukan pada periode ini.</p>
                <p className="text-[11px]">Silakan pilih tahun, bulan, atau kriteria lain.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Garasi</TableHead>
                    <TableHead>Penyewa</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Tipe Sewa</TableHead>
                    <TableHead>Periode Sewa</TableHead>
                    <TableHead>Biaya Sewa</TableHead>
                    <TableHead>Biaya Listrik (EV)</TableHead>
                    <TableHead>Perpanjangan</TableHead>
                    <TableHead>Total Penerimaan</TableHead>
                    <TableHead>Bukti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((trx) => {
                    const extSum = trx.perpanjanganList.reduce((acc, c) => acc + Number(c.sisaBiaya), 0);
                    const netTotal = Number(trx.totalBiaya);

                    return (
                      <TableRow key={trx.id}>
                        {/* Kode Garasi */}
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-xs text-slate-900 block">
                              {trx.garasi.kodeGarasi}
                            </span>
                            <Badge
                              variant={
                                trx.garasi.tipeGarasi === "SEPEDA"
                                  ? "sepeda"
                                  : trx.garasi.tipeGarasi === "MOBIL"
                                  ? "mobil"
                                  : "mobil_listrik"
                              }
                            >
                              {trx.garasi.tipeGarasi}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Penyewa */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <span className="font-semibold text-slate-900 block">{trx.penyewa.namaLengkap}</span>
                            <span className="font-mono text-[11px] text-slate-400">NIK: {trx.penyewa.nik || "-"}</span>
                          </div>
                        </TableCell>

                        {/* Kendaraan */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <span className="font-medium text-slate-800 block">{trx.kendaraan.merekTipe}</span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {trx.kendaraan.nomorPlat || "Tanpa Plat"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Tipe Sewa */}
                        <TableCell>
                          <Badge variant="neutral">
                            {trx.tipeSewa === "HARIAN" ? `Harian (${trx.jumlahHari} hr)` : "Bulanan"}
                          </Badge>
                        </TableCell>

                        {/* Periode Sewa */}
                        <TableCell>
                          <div className="space-y-0.5 text-[11px] font-mono text-slate-600">
                            <div>{formatDate(trx.tanggalMulai)}</div>
                            <div className="text-slate-400">s/d {formatDate(trx.tanggalSelesai)}</div>
                          </div>
                        </TableCell>

                        {/* Biaya Sewa */}
                        <TableCell>
                          <span className="font-mono text-xs text-slate-800">
                            {formatRupiah(trx.biayaSewa)}
                          </span>
                        </TableCell>

                        {/* Biaya Listrik */}
                        <TableCell>
                          {Number(trx.biayaListrik) > 0 ? (
                            <span className="font-mono text-xs text-teal-700 font-semibold">
                              {formatRupiah(trx.biayaListrik)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Perpanjangan */}
                        <TableCell>
                          {extSum > 0 ? (
                            <span className="font-mono text-xs text-steel-700">
                              +{formatRupiah(extSum)} ({trx.perpanjanganList.length}x)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Net Total */}
                        <TableCell>
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {formatRupiah(netTotal)}
                          </span>
                        </TableCell>

                        {/* Bukti */}
                        <TableCell>
                          <button
                            onClick={() =>
                              openProof(
                                trx.buktiPelunasanUrl,
                                `Bukti Transaksi — ${trx.garasi.kodeGarasi} (${trx.penyewa.namaLengkap})`
                              )
                            }
                            className="p-1.5 hover:bg-slate-100 rounded text-steel-700 transition-colors"
                            title="Lihat Bukti Bayar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* Lightbox for inspecting receipts */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxUrl}
        title={lightboxTitle}
      />
    </div>
  );
}
