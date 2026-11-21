"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Filter,
  Calendar,
  Warehouse,
  User,
  Zap,
  ExternalLink,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format";

interface PenyewaOption {
  id: string;
  fullName: string;
  email: string;
  nik: string | null;
}

interface ExtensionRecord {
  id: string;
  oldEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalCost: number;
  paymentProofUrl: string;
  createdAt: string;
}

interface ReportRentalRecord {
  id: string;
  userId: string;
  garageId: string;
  vehicleType: string;
  plateNumber: string | null;
  vehicleBrandType: string;
  maxBatteryKwh: number | null;
  currentBatteryKwh: number | null;
  rentalType: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  rentalCost: number;
  electricityCost: number;
  totalCost: number;
  paymentProofUrl: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    nik: string | null;
  };
  garage: {
    id: string;
    code: string;
    type: "sepeda" | "mobil" | "mobil_listrik";
    dailyPrice: number;
    kwhPrice: number | null;
  };
  extensions: ExtensionRecord[];
}

interface ReportData {
  totalCount: number;
  revenue: {
    totalRentalCost: number;
    totalElectricityCost: number;
    totalBaseRevenue: number;
    totalExtensionRevenue: number;
    grandTotalRevenue: number;
  };
  records: ReportRentalRecord[];
}

export default function LaporanSewaPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 4 Filter Dimensions
  const [filterMode, setFilterMode] = useState<"month" | "date">("month");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [specificDate, setSpecificDate] = useState<string>("");
  const [selectedGarageType, setSelectedGarageType] = useState<string>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");

  // Penyewa options for dropdown
  const [penyewaList, setPenyewaList] = useState<PenyewaOption[]>([]);

  // Report Data
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Proof Preview
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Expanded rows for extensions
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // 1. Fetch Penyewa Users for Filter
  useEffect(() => {
    async function fetchPenyewa() {
      try {
        const res = await fetch("/api/admin/verifikasi");
        if (res.ok) {
          const json = await res.json();
          const applicants = json.data?.applicants || [];
          setPenyewaList(
            applicants.map((a: any) => ({
              id: a.id,
              fullName: a.fullName,
              email: a.email,
              nik: a.nik,
            }))
          );
        }
      } catch (err) {
        console.error("Gagal memuat daftar penyewa:", err);
      }
    }
    fetchPenyewa();
  }, []);

  // 2. Fetch Report with 4 Dimensions
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();

      if (filterMode === "month") {
        params.append("year", String(selectedYear));
        params.append("month", String(selectedMonth));
      } else if (filterMode === "date" && specificDate) {
        params.append("specificDate", specificDate);
      }

      if (selectedGarageType !== "ALL") {
        params.append("garageType", selectedGarageType);
      }

      if (selectedUserId !== "ALL") {
        params.append("userId", selectedUserId);
      }

      const res = await fetch(`/api/admin/laporan?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.data?.report || null);
      } else {
        setErrorMessage("Gagal mengambil data laporan sewa garasi.");
      }
    } catch {
      setErrorMessage("Terjadi gangguan jaringan saat memuat laporan.");
    } finally {
      setIsLoading(false);
    }
  }, [
    filterMode,
    selectedYear,
    selectedMonth,
    specificDate,
    selectedGarageType,
    selectedUserId,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleResetFilters = () => {
    setFilterMode("month");
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setSpecificDate("");
    setSelectedGarageType("ALL");
    setSelectedUserId("ALL");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Laporan Sewa Garasi Kendaraan
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Rekapitulasi data transaksi persewaan, agregat finansial, dan audit operasional dengan 4 dimensi filter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Filter
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Cetak / Ekspor PDF
          </Button>
        </div>
      </div>

      {/* 4-Dimension Filter Card */}
      <Card className="print:hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span>4 Filter Laporan Persewaan</span>
            </div>
          }
          subtitle="Saring data berdasarkan Waktu (Bulan/Hari), Tipe Garasi, dan Profil Penyewa"
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter 1 & 2: Waktu (Per Bulan vs Per Hari) */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Dimensi Waktu (Filter 1 & 2)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterMode("month")}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      filterMode === "month"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    1. Per Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("date")}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      filterMode === "date"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    2. Per Hari Spesifik
                  </button>
                </div>
              </div>

              {filterMode === "month" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Bulan: {name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <option key={y} value={y}>
                        Tahun: {y}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  placeholder="Pilih tanggal transaksi"
                  helperText="Filter transaksi persewaan pada hari tertentu dalam bulan."
                />
              )}
            </div>

            {/* Filter 3: Tipe Garasi */}
            <div>
              <Select
                label="Filter 3: Tipe Garasi"
                value={selectedGarageType}
                onChange={(e) => setSelectedGarageType(e.target.value)}
              >
                <option value="ALL">Semua Tipe Garasi (S, C, E)</option>
                <option value="sepeda">Garasi Sepeda (S)</option>
                <option value="mobil">Garasi Mobil (C)</option>
                <option value="mobil_listrik">Garasi Mobil Listrik (E)</option>
              </Select>
            </div>

            {/* Filter 4: Penyewa */}
            <div>
              <Select
                label="Filter 4: Penyewa"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="ALL">Semua Calon & Penyewa Terdaftar</option>
                {penyewaList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.nik || p.email})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Aggregation Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              TOTAL TRANSAKSI
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {reportData.totalCount} <span className="text-xs font-sans font-normal text-slate-500">sewa</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sesuai filter kriteria</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              PENDAPATAN SEWA POKOK
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {formatRupiah(reportData.revenue.totalRentalCost)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tarif harian & bulanan 25x</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
            <div className="text-[10px] font-mono text-teal-700 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>PENDAPATAN LISTRIK EV</span>
            </div>
            <div className="text-xl font-bold font-mono text-teal-800 mt-1 tabular-nums">
              {formatRupiah(reportData.revenue.totalElectricityCost)}
            </div>
            <div className="text-[10px] text-teal-600 mt-0.5">Full-charge Garasi E</div>
          </div>

          <div className="p-3.5 bg-slate-900 text-white rounded-lg shadow-hairline">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>GRAND TOTAL OMZET</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
              {formatRupiah(reportData.revenue.grandTotalRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              +Ext: {formatRupiah(reportData.revenue.totalExtensionRevenue)}
            </div>
          </div>
        </div>
      )}

      {/* Main Report Table */}
      <Card className="print:border-none print:shadow-none">
        <CardHeader
          title="Rincian Transaksi Sewa Garasi"
          subtitle={
            filterMode === "month"
              ? `Laporan Periode: ${monthNames[selectedMonth - 1]} ${selectedYear}`
              : `Laporan Tanggal Spesifik: ${specificDate || "Hari Ini"}`
          }
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Memproses kalkulasi laporan sewa garasi...
            </div>
          ) : errorMessage ? (
            <div className="p-6 text-center text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          ) : !reportData || reportData.records.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Warehouse className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">
                Tidak Ada Transaksi Sesuai Kriteria Filter
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Coba sesuaikan bulan, tanggal spesifik, tipe garasi, atau pilih Semua Penyewa.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-mono uppercase text-slate-500">
                    <th className="py-2.5 px-3.5 font-semibold">TGL TRANSAKSI</th>
                    <th className="py-2.5 px-3.5 font-semibold">KODE & TIPE</th>
                    <th className="py-2.5 px-3.5 font-semibold">PENYEWA</th>
                    <th className="py-2.5 px-3.5 font-semibold">KENDARAAN</th>
                    <th className="py-2.5 px-3.5 font-semibold">PERIODE SEWA</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">SEWA POKOK</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">LISTRIK EV</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">TOTAL</th>
                    <th className="py-2.5 px-3.5 font-semibold text-center print:hidden">BUKTI / EXT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.records.map((r) => {
                    const hasExtensions = r.extensions && r.extensions.length > 0;
                    const isExpanded = !!expandedIds[r.id];
                    const extSum = r.extensions.reduce((acc, e) => acc + Number(e.additionalCost), 0);

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          {/* Tanggal Transaksi */}
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            {formatDate(r.createdAt)}
                          </td>

                          {/* Kode Garasi */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                                {r.garage.code}
                              </span>
                              <Badge
                                variant={
                                  r.garage.type === "sepeda"
                                    ? "sepeda"
                                    : r.garage.type === "mobil"
                                    ? "mobil"
                                    : "mobil_listrik"
                                }
                              >
                                {r.garage.type === "sepeda"
                                  ? "S"
                                  : r.garage.type === "mobil"
                                  ? "C"
                                  : "E"}
                              </Badge>
                            </div>
                          </td>

                          {/* Penyewa */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900">{r.user.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.user.nik ? `NIK: ${r.user.nik}` : r.user.email}
                            </div>
                          </td>

                          {/* Kendaraan */}
                          <td className="py-3 px-3.5">
                            <div className="text-slate-800 font-medium">{r.vehicleBrandType}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.plateNumber ? r.plateNumber : "Sepeda"}
                            </div>
                          </td>

                          {/* Periode */}
                          <td className="py-3 px-3.5 font-mono text-[11px]">
                            <div className="text-slate-700">
                              {formatDate(r.startDate)} &rarr; {formatDate(r.endDate)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {r.durationDays} hari ({r.rentalType})
                            </div>
                          </td>

                          {/* Biaya Sewa Pokok */}
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-900">
                            {formatRupiah(r.rentalCost)}
                          </td>

                          {/* Biaya Listrik EV */}
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums text-teal-800">
                            {Number(r.electricityCost) > 0 ? formatRupiah(r.electricityCost) : "-"}
                          </td>

                          {/* Total Biaya */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold tabular-nums text-slate-900">
                            {formatRupiah(Number(r.totalCost) + extSum)}
                          </td>

                          {/* Aksi & Status */}
                          <td className="py-3 px-3.5 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: r.paymentProofUrl,
                                    title: `Bukti Bayar — Garasi ${r.garage.code} (${r.user.fullName})`,
                                  })
                                }
                                title="Lihat Bukti Bayar"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {hasExtensions && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(r.id)}
                                  title="Lihat Riwayat Perpanjangan"
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-0.5"
                                >
                                  <span>+{r.extensions.length} Ext</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-2.5 h-2.5" />
                                  ) : (
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Extended Details Dropdown */}
                        {hasExtensions && isExpanded && (
                          <tr className="bg-blue-50/40">
                            <td colSpan={9} className="py-2.5 px-6">
                              <div className="text-[11px] space-y-1.5">
                                <div className="font-semibold text-blue-900 font-mono">
                                  RIWAYAT PERPANJANGAN ADMIN (TOTAL: +{formatRupiah(extSum)})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {r.extensions.map((ext, idx) => (
                                    <div
                                      key={ext.id}
                                      className="p-2 bg-white border border-blue-200 rounded flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <span className="font-medium">#{idx + 1}:</span>{" "}
                                        <span className="font-mono text-[11px]">
                                          {formatDate(ext.oldEndDate)} &rarr; {formatDate(ext.newEndDate)} (+{ext.additionalDays} hari)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-blue-900">
                                          +{formatRupiah(ext.additionalCost)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewImage({
                                              url: ext.paymentProofUrl,
                                              title: `Bukti Perpanjangan #${idx + 1} — ${r.garage.code}`,
                                            })
                                          }
                                          className="text-blue-700 hover:text-blue-900"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Preview Bukti Bayar */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title || "Bukti Pembayaran"}
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center min-h-[300px]">
            {previewImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[500px] w-auto object-contain mx-auto"
              />
            ) : (
              <div className="text-xs text-slate-400">Berkas gambar tidak ditemukan</div>
            )}
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setPreviewImage(null)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
