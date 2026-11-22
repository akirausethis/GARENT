"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Warehouse,
  User,
  Calendar,
  CreditCard,
  Upload,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format";

interface ActiveRental {
  id: string;
  userId: string;
  garageId: string;
  vehicleType: string;
  plateNumber: string | null;
  vehicleBrandType: string;
  startDate: string;
  endDate: string;
  rentalCost: number;
  totalCost: number;
  paymentProofUrl?: string | null;
  status: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    nik: string;
  };
  garage: {
    id: string;
    code: string;
    type: "sepeda" | "mobil" | "mobil_listrik";
    dailyPrice: number;
    kwhPrice: number | null;
    status: string;
  };
}

export default function PerpanjangSewaPage() {
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Extend State
  const [selectedRental, setSelectedRental] = useState<ActiveRental | null>(null);
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function fetchActiveRentals() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/perpanjang");
      if (res.ok) {
        const json = await res.json();
        setActiveRentals(json.data?.activeRentals || json.data?.rentals || []);
      } else {
        const fallback = await fetch("/api/admin/perpanjang/active");
        if (fallback.ok) {
          const json = await fallback.json();
          setActiveRentals(json.data?.activeRentals || []);
        } else {
          setErrorMessage("Gagal memuat daftar sewa garasi aktif.");
        }
      }
    } catch {
      setErrorMessage("Terjadi gangguan jaringan saat memuat data garasi aktif.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getIsoDateString = (dateStr: string) => {
    return new Date(dateStr).toISOString().split("T")[0];
  };

  // Kalkulasi selisih hari & biaya tambahan
  const calculateAdditionalCost = () => {
    if (!selectedRental || !newEndDate) return { additionalDays: 0, additionalCost: 0 };

    const oldDateStr = getIsoDateString(selectedRental.endDate);
    const oldUTC = new Date(oldDateStr);
    const newUTC = new Date(newEndDate);

    const diffMs = newUTC.getTime() - oldUTC.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { additionalDays: 0, additionalCost: 0, isInvalid: true };
    }

    const daily = Number(selectedRental.garage.dailyPrice);
    let additionalCost = 0;

    if (diffDays < 30) {
      // < 30 hari = tarif harian
      additionalCost = diffDays * daily;
    } else if (diffDays === 30) {
      // = 30 hari = tarif 1 bulan flat (25x harian)
      additionalCost = 25 * daily;
    } else {
      // > 30 hari = dihitung per bulan penuh (Math.ceil(diffDays / 30) * 25 * daily)
      const months = Math.ceil(diffDays / 30);
      additionalCost = months * 25 * daily;
    }

    return { additionalDays: diffDays, additionalCost, isInvalid: false };
  };

  // State Modal Upload Bukti Bayar (Admin)
  const [proofRental, setProofRental] = useState<ActiveRental | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  const handleOpenProofModal = (rental: ActiveRental) => {
    setProofRental(rental);
    setProofError(null);
    setProofFile(null);
    setProofPreview(null);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        setProofError("Format bukti bayar harus JPEG, PNG, atau WEBP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setProofError("Ukuran berkas gambar maksimal 5 MB.");
        return;
      }
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
      setProofError(null);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofRental || !proofFile) {
      setProofError("Pilih file gambar bukti bayar terlebih dahulu.");
      return;
    }

    setIsUploadingProof(true);
    setProofError(null);

    try {
      const formData = new FormData();
      formData.append("rentalId", proofRental.id);
      formData.append("paymentProof", proofFile);

      const res = await fetch("/api/admin/sewa/upload-bukti", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setProofError(json.error || "Gagal mengunggah bukti bayar.");
        setIsUploadingProof(false);
        return;
      }

      setSuccessMessage(`Bukti pelunasan untuk garasi ${proofRental.garage.code} berhasil diunggah.`);
      setProofRental(null);
      await fetchActiveRentals();
    } catch {
      setProofError("Terjadi kesalahan jaringan saat mengunggah bukti bayar.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleOpenExtendModal = (rental: ActiveRental) => {
    setSelectedRental(rental);
    setModalError(null);
    setPaymentProofFile(null);
    setPaymentProofPreview(null);

    // Default: besok dari tanggal selesai lama
    const oldDate = new Date(rental.endDate);
    oldDate.setDate(oldDate.getDate() + 7); // saran 7 hari
    setNewEndDate(oldDate.toISOString().split("T")[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        setModalError("Format bukti bayar harus JPEG, PNG, atau WEBP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setModalError("Ukuran berkas gambar maksimal 5 MB.");
        return;
      }
      setPaymentProofFile(file);
      setPaymentProofPreview(URL.createObjectURL(file));
      setModalError(null);
    }
  };

  const handleSubmitExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRental) return;

    const { additionalDays, isInvalid } = calculateAdditionalCost();
    if (isInvalid || additionalDays <= 0) {
      setModalError("Tanggal selesai baru harus lebih besar dari tanggal selesai sewa saat ini.");
      return;
    }

    if (!paymentProofFile) {
      setModalError("Bukti bayar perpanjangan sewa wajib diunggah.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const formData = new FormData();
      formData.append("rentalId", selectedRental.id);
      formData.append("newEndDate", newEndDate);
      formData.append("paymentProof", paymentProofFile);

      const res = await fetch("/api/admin/perpanjang", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setModalError(json.error || "Gagal memperpanjang masa sewa garasi.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `Perpanjangan sewa garasi ${selectedRental.garage.code} berhasil diproses (+${additionalDays} hari)!`
      );
      setSelectedRental(null);
      setIsSubmitting(false);

      // Refresh data
      fetchActiveRentals();
    } catch {
      setModalError("Terjadi kesalahan jaringan saat memproses perpanjangan.");
      setIsSubmitting(false);
    }
  };

  const filteredRentals = activeRentals.filter((r) => {
    const q = searchQuery.toLowerCase();
    const gCode = (r.garage?.code || (r as any).garasi?.code || "").toLowerCase();
    const uName = (r.user?.fullName || (r as any).penyewa?.fullName || (r as any).penyewa?.namaLengkap || "").toLowerCase();
    const plate = (r.plateNumber || "").toLowerCase();
    const brand = (r.vehicleBrandType || "").toLowerCase();
    return gCode.includes(q) || uName.includes(q) || plate.includes(q) || brand.includes(q);
  });

  const { additionalDays, additionalCost, isInvalid } = calculateAdditionalCost();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Perpanjang Status Sewa Garasi (Admin Extension)
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Ubah tanggal selesai sewa garasi yang sedang aktif, hitung selisih biaya tambahan otomatis, dan lampirkan bukti pembayaran.
        </p>
      </div>

      {successMessage && (
        <Alert
          type="info"
          title="Perpanjangan Sukses"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert type="error" title="Gagal Memuat Data">
          {errorMessage}
        </Alert>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title="Daftar Garasi Sedang Aktif Disewa Hari Ini"
          subtitle={`Total: ${activeRentals.length} unit garasi dalam masa aktif sewa`}
          action={
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari garasi, plat, atau penyewa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
              />
            </div>
          }
        />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              Memuat data sewa garasi aktif...
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-1">
              <Warehouse className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-700">Tidak Ada Garasi Aktif yang Sesuai</div>
              <p className="text-slate-400">
                {searchQuery
                  ? "Coba gunakan kata kunci pencarian yang berbeda."
                  : "Saat ini belum ada garasi yang sedang aktif disewa oleh penyewa."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-mono uppercase text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">KODE & TIPE</th>
                    <th className="py-2.5 px-4 font-semibold">PENYEWA</th>
                    <th className="py-2.5 px-4 font-semibold">KENDARAAN</th>
                    <th className="py-2.5 px-4 font-semibold">PERIODE SEWA AKTIF</th>
                    <th className="py-2.5 px-4 font-semibold text-right">TARIF / HARI</th>
                    <th className="py-2.5 px-4 font-semibold text-center">BUKTI BAYAR</th>
                    <th className="py-2.5 px-4 font-semibold text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRentals.map((rental) => {
                    const garageCode = rental.garage?.code || (rental as any).garasi?.code || "-";
                    const garageType = ((rental.garage?.type || (rental as any).garasi?.type || "") as string).toLowerCase();
                    const userName = rental.user?.fullName || (rental as any).penyewa?.fullName || (rental as any).penyewa?.namaLengkap || "-";
                    const userEmail = rental.user?.email || (rental as any).penyewa?.email || "";
                    const userPhone = rental.user?.phoneNumber || (rental as any).penyewa?.phoneNumber || (rental as any).penyewa?.noTelepon || "";
                    const dailyPrice = Number(rental.garage?.dailyPrice || (rental as any).garasi?.dailyPrice || (rental as any).garasi?.hargaSewaHarian || 0);

                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Kode Garasi */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
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
                              {garageType ? garageType.replace("_", " ").toUpperCase() : "GARASI"}
                            </Badge>
                          </div>
                        </td>

                        {/* Penyewa */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {userEmail} {userPhone ? `• ${userPhone}` : ""}
                          </div>
                        </td>

                        {/* Kendaraan */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{rental.vehicleBrandType}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {rental.plateNumber ? `Plat: ${rental.plateNumber}` : "Sepeda Gowes"}
                          </div>
                        </td>

                        {/* Periode Sewa */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="text-slate-500">
                            Mulai: {formatDate(rental.startDate)}
                          </div>
                          <div className="text-slate-900 font-bold flex items-center gap-1">
                            <span>Selesai: {formatDate(rental.endDate)}</span>
                          </div>
                        </td>

                        {/* Tarif Harian */}
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {formatRupiah(dailyPrice)}
                        </td>

                      {/* Bukti Bayar Status / Upload */}
                      <td className="py-3 px-4 text-center">
                        {rental.paymentProofUrl ? (
                          <a
                            href={rental.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lihat Bukti</span>
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenProofModal(rental)}
                            icon={<Upload className="w-3 h-3 text-amber-600" />}
                            className="text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 text-[11px] py-1"
                          >
                            Upload Bukti
                          </Button>
                        )}
                      </td>

                      {/* Aksi Extend */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenExtendModal(rental)}
                          icon={<CalendarClock className="w-3.5 h-3.5" />}
                        >
                          Perpanjang
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Form Perpanjangan */}
      <Modal
        isOpen={!!selectedRental}
        onClose={() => setSelectedRental(null)}
        title={
          selectedRental ? (
            <div className="flex items-center gap-2">
              <span>Perpanjang Garasi</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                {selectedRental.garage.code}
              </span>
            </div>
          ) : (
            "Perpanjang Sewa"
          )
        }
        subtitle="Admin dapat bebas mengubah Tanggal Selesai Sewa. Sisa biaya dihitung otomatis."
        maxWidth="lg"
      >
        {selectedRental && (
          <form onSubmit={handleSubmitExtend} className="space-y-4">
            {modalError && (
              <Alert type="error" title="Gagal Validasi">
                {modalError}
              </Alert>
            )}

            {/* Info Box */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">PENYEWA</span>
                <div className="font-semibold text-slate-900">{selectedRental.user.fullName}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedRental.vehicleBrandType} ({selectedRental.plateNumber || "Sepeda"})
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">TARIF HARIAN</span>
                <div className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatRupiah(selectedRental.garage.dailyPrice)} / hari
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Selesai Lama: {formatDate(selectedRental.endDate)}
                </div>
              </div>
            </div>

            {/* Input Tanggal Selesai Baru */}
            <div>
              <Input
                label="Tanggal Selesai Sewa Baru"
                type="date"
                required
                value={newEndDate}
                min={getIsoDateString(selectedRental.endDate)}
                onChange={(e) => setNewEndDate(e.target.value)}
                helperText="Pilih tanggal selesai baru yang lebih besar dari tanggal selesai saat ini."
              />
            </div>

            {/* Live Calculation Box */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 text-xs">
              <div className="font-semibold text-blue-900 flex items-center justify-between">
                <span>Kalkulasi Otomatis Sisa Biaya:</span>
                <span className="font-mono text-blue-700">
                  {additionalDays > 0 ? `+${additionalDays} Hari Tambahan` : "0 Hari"}
                </span>
              </div>

              <div className="flex items-center justify-between text-blue-950 font-mono pt-1 border-t border-blue-200/60">
                <span>Rumus Biaya:</span>
                <span>
                  {additionalDays} hari &times; {formatRupiah(selectedRental.garage.dailyPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-blue-300 font-bold text-sm text-blue-950">
                <span>SISA BIAYA PERPANJANGAN:</span>
                <span className="font-mono tabular-nums text-base">
                  {formatRupiah(additionalCost)}
                </span>
              </div>
            </div>

            {/* Upload Bukti Pembayaran Perpanjangan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Unggah Bukti Bayar Perpanjangan <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xs font-medium text-slate-700">
                  {paymentProofFile ? paymentProofFile.name : "Klik atau pilih file bukti transfer / kwitansi"}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Format JPG, PNG, WEBP (maks. 5 MB). Disimpan di tabel rental_extensions.
                </p>
              </div>

              {paymentProofPreview && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-2 text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentProofPreview}
                    alt="Pratinjau Bukti Bayar"
                    className="w-12 h-12 object-cover rounded border border-slate-200"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{paymentProofFile?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {(paymentProofFile!.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedRental(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                disabled={isInvalid || additionalDays <= 0 || !paymentProofFile || isSubmitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Simpan Perpanjangan & Update Status
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Upload Bukti Pelunasan Sewa (Admin) */}
      <Modal
        isOpen={!!proofRental}
        onClose={() => setProofRental(null)}
        title="Upload Bukti Pelunasan Sewa (Admin)"
      >
        {proofRental && (
          <form onSubmit={handleSubmitProof} className="space-y-4">
            {proofError && (
              <Alert type="error" title="Gagal Upload Bukti">
                {proofError}
              </Alert>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Unit Garasi</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {proofRental.garage.code} ({proofRental.garage.type.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Penyewa</span>
                <span className="font-medium text-slate-900">{proofRental.user.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Biaya Sewa</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatRupiah(proofRental.totalCost)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Pilih Berkas Bukti Pembayaran <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProofFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-xs font-medium text-slate-700">
                  {proofFile ? proofFile.name : "Klik atau pilih file bukti transfer / kwitansi"}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Format JPG, PNG, WEBP (maks. 5 MB). Diunggah ke Supabase Storage (bukti-bayar).
                </p>
              </div>

              {proofPreview && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-2 text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview}
                    alt="Pratinjau Bukti Bayar"
                    className="w-12 h-12 object-cover rounded border border-slate-200"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{proofFile?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {(proofFile!.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setProofRental(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isUploadingProof}
                disabled={!proofFile || isUploadingProof}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Simpan & Verifikasi Bukti
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
