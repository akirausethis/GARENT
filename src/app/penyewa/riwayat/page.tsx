"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Warehouse,
  Bike,
  Car,
  Zap,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format";

interface ExtensionRecord {
  id: string;
  oldEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalCost: number;
  paymentProofUrl: string;
  createdAt: string;
}

interface RentalRecord {
  id: string;
  vehicleType: "sepeda" | "sepeda_motor" | "mobil" | "mobil_listrik";
  plateNumber: string | null;
  vehicleBrandType: string;
  maxBatteryKwh: number | null;
  currentBatteryKwh: number | null;
  rentalType: "harian" | "bulanan";
  durationDays: number;
  startDate: string;
  endDate: string;
  rentalCost: number;
  electricityCost: number;
  totalCost: number;
  paymentProofUrl?: string | null;
  status: "active" | "extended" | "completed";
  createdAt: string;
  garage: {
    id: string;
    code: string;
    type: "sepeda" | "mobil" | "mobil_listrik";
    dailyPrice: number;
    kwhPrice: number | null;
  };
  extensions: ExtensionRecord[];
}

export default function RiwayatSewaPage() {
  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Proof State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Accordion state for extension details
  const [expandedRentalIds, setExpandedRentalIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRentalIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    async function fetchRentals() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/penyewa/sewa");
        if (res.ok) {
          const json = await res.json();
          setRentals(json.data?.sewa || json.data?.rentals || []);
        } else {
          // fallback to /api/penyewa/riwayat
          const fallbackRes = await fetch("/api/penyewa/riwayat");
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            setRentals(fallbackJson.data?.rentals || []);
          } else {
            setErrorMessage("Gagal memuat riwayat penyewaan.");
          }
        }
      } catch {
        setErrorMessage("Terjadi kesalahan jaringan saat memuat data.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchRentals();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const activeCount = rentals.filter((r) => r.status === "active" || r.status === "extended").length;
  const totalSpent = rentals.reduce((sum, r) => {
    const extSum = r.extensions.reduce((sub, e) => sub + Number(e.additionalCost), 0);
    return sum + Number(r.totalCost) + extSum;
  }, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Riwayat Sewa Garasi Saya
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Daftar seluruh transaksi sewa aktif, riwayat perpanjangan admin, dan arsip bukti pelunasan.
          </p>
        </div>

        <Link href="/penyewa/sewa-baru">
          <Button icon={<Warehouse className="w-4 h-4" />}>
            Sewa Garasi Baru
          </Button>
        </Link>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            GARASI AKTIF DISEWA
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {activeCount} <span className="text-xs font-sans font-normal text-slate-500">unit</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            TOTAL TRANSAKSI
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {rentals.length} <span className="text-xs font-sans font-normal text-slate-500">kali</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            TOTAL BIAYA KELUAR
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalSpent)}
          </div>
        </div>
      </div>

      {/* Main List */}
      <Card>
        <CardHeader
          title="Daftar Sewa Garasi"
          subtitle="Setiap garasi yang sedang atau pernah Anda sewa"
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Memuat data transaksi sewa Anda...
            </div>
          ) : errorMessage ? (
            <div className="p-6 text-center text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          ) : rentals.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Warehouse className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">
                Anda Belum Pernah Menyewa Garasi
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Garasi siap pakai untuk sepeda, sepeda motor, mobil, dan mobil listrik (EV) tersedia hari ini.
              </p>
              <Link href="/penyewa/sewa-baru">
                <Button size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                  Sewa Garasi Pertama Anda
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rentals.map((r) => {
                const isExpanded = !!expandedRentalIds[r.id];
                const hasExtensions = r.extensions && r.extensions.length > 0;
                const garageCode = r.garage?.code || (r as any).garasi?.code || (r as any).garasi?.kodeGarasi || "-";
                const garageType = (r.garage?.type || (r as any).garasi?.type || "").toLowerCase();
                const status = (r.status || "").toLowerCase();

                return (
                  <div key={r.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                    {/* Top Row: Garage Code, Status, Date Range */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-base text-slate-900 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                          {garageCode}
                        </span>
                        <Badge
                          variant={
                            garageType === "sepeda"
                              ? "sepeda"
                              : garageType === "mobil"
                              ? "mobil"
                              : "mobil_listrik"
                          }
                        >
                          {garageType === "sepeda"
                            ? "SEPEDA (S)"
                            : garageType === "mobil"
                            ? "MOBIL (C)"
                            : "EV CHARGE (E)"}
                        </Badge>

                        {status === "active" && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            AKTIF
                          </span>
                        )}
                        {status === "extended" && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            DIPERPANJANG
                          </span>
                        )}
                        {status === "completed" && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            SELESAI
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDate(r.startDate)} &rarr;{" "}
                          <strong className="text-slate-900">{formatDate(r.endDate)}</strong>
                        </span>
                        <span className="text-slate-400">({r.durationDays} hari / {r.rentalType})</span>
                      </div>
                    </div>

                    {/* Middle Row: Vehicle Details & Financial Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {/* Vehicle */}
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">KENDARAAN</div>
                        <div className="font-semibold text-slate-900 mt-0.5">{r.vehicleBrandType}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {r.plateNumber ? `Plat: ${r.plateNumber}` : "Tanpa Plat (Sepeda)"}
                        </div>
                      </div>

                      {/* EV Battery Spec if applicable */}
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">SPESIFIKASI BATERAI</div>
                        {r.maxBatteryKwh ? (
                          <div className="mt-0.5 text-slate-700 font-mono text-[11px]">
                            {r.currentBatteryKwh} kWh &rarr; {r.maxBatteryKwh} kWh (Penuh)
                          </div>
                        ) : (
                          <div className="mt-0.5 text-slate-400 italic">Non-EV</div>
                        )}
                      </div>

                      {/* Costs */}
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">RINCIAN BIAYA</div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          Sewa: <span className="font-mono">{formatRupiah(r.rentalCost)}</span>
                        </div>
                        {Number(r.electricityCost) > 0 && (
                          <div className="text-[11px] text-teal-800">
                            Listrik: <span className="font-mono">{formatRupiah(r.electricityCost)}</span>
                          </div>
                        )}
                      </div>

                      {/* Total & Action */}
                      <div className="flex flex-col justify-between items-start sm:items-end">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase sm:text-right">
                            TOTAL TRANSAKSI
                          </div>
                          <div className="font-mono font-bold text-sm text-slate-900 tabular-nums sm:text-right">
                            {formatRupiah(r.totalCost)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {r.paymentProofUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: r.paymentProofUrl!,
                                  title: `Bukti Pembayaran Awal — Garasi ${r.garage.code}`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-steel-700 hover:text-steel-900 underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Bukti Bayar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
                              Verifikasi Admin
                            </span>
                          )}

                          {hasExtensions && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(r.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded"
                            >
                              <span>{r.extensions.length} Perpanjangan</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Extension Sub-Panel */}
                    {hasExtensions && isExpanded && (
                      <div className="mt-3 pl-4 border-l-2 border-blue-400 space-y-2">
                        <div className="text-[11px] font-mono text-blue-800 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Riwayat Perpanjangan Oleh Admin</span>
                        </div>
                        <div className="space-y-2">
                          {r.extensions.map((ext, idx) => (
                            <div
                              key={ext.id}
                              className="p-2.5 bg-blue-50/50 border border-blue-200 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-semibold text-blue-950">Perpanjangan #{idx + 1}:</span>{" "}
                                <span className="font-mono text-[11px] text-blue-900">
                                  {formatDate(ext.oldEndDate)} &rarr;{" "}
                                  <strong>{formatDate(ext.newEndDate)}</strong> (+{ext.additionalDays} hari)
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-blue-950 tabular-nums">
                                  +{formatRupiah(ext.additionalCost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: ext.paymentProofUrl,
                                      title: `Bukti Perpanjangan #${idx + 1} — Garasi ${r.garage.code}`,
                                    })
                                  }
                                  className="text-[11px] text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Bukti Perpanjangan</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Pratinjau Bukti Bayar */}
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
