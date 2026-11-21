"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Alert } from "@/components/ui/Alert";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  CalendarClock,
  Car,
  Bike,
  Zap,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Upload,
  Eye,
  Calendar,
} from "lucide-react";

interface ActiveRental {
  id: string;
  tipeSewa: "HARIAN" | "BULANAN";
  jumlahHari: number | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  biayaSewa: number;
  biayaListrik: number;
  totalBiaya: number;
  buktiPelunasanUrl: string;
  garasi: {
    id: string;
    kodeGarasi: string;
    tipeGarasi: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
    hargaSewaHarian: number;
    status: "AVAILABLE" | "USED";
  };
  kendaraan: {
    tipeKendaraan: "SEPEDA" | "SEPEDA_MOTOR" | "MOBIL" | "MOBIL_LISTRIK";
    nomorPlat: string | null;
    merekTipe: string;
    kapasitasListrikKwh: number | null;
  };
  penyewa: {
    id: string;
    nik: string | null;
    namaLengkap: string;
    email: string;
    noTelepon: string;
  };
  perpanjanganList: {
    id: string;
    tanggalSelesaiLama: string;
    tanggalSelesaiBaru: string;
    tambahanHari: number;
    sisaBiaya: number;
    buktiBayarUrl: string;
    createdAt: string;
  }[];
}

export default function AdminPerpanjangPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; namaLengkap: string; email: string; role: "ADMIN" } | null>(null);
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected rental for extension modal
  const [selectedRental, setSelectedRental] = useState<ActiveRental | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tanggalSelesaiBaru, setTanggalSelesaiBaru] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");

  const loadData = React.useCallback(async () => {
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

      const res = await fetch("/api/admin/perpanjang/active");
      if (res.ok) {
        const json = await res.json();
        setActiveRentals(json.data.activeRentals || []);
      }
    } catch (err) {
      console.error("Load active rentals error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open extension modal for a selected rental
  const openExtensionModal = (rental: ActiveRental) => {
    setSelectedRental(rental);
    // Set default extension to current end + 7 days
    const currentEnd = new Date(rental.tanggalSelesai);
    const defaultNewEnd = new Date(currentEnd);
    defaultNewEnd.setDate(defaultNewEnd.getDate() + 7);
    setTanggalSelesaiBaru(defaultNewEnd.toISOString().split("T")[0]);
    setFile(null);
    setFilePreview(null);
    setErrorMessage(null);
    setModalOpen(true);
  };

  // Calculate live extension diff and balance
  const extensionCalculation = React.useMemo(() => {
    if (!selectedRental || !tanggalSelesaiBaru) {
      return { diffDays: 0, sisaBiaya: 0, isValid: false };
    }

    const oldEnd = new Date(selectedRental.tanggalSelesai);
    const newEnd = new Date(tanggalSelesaiBaru);

    if (isNaN(newEnd.getTime())) {
      return { diffDays: 0, sisaBiaya: 0, isValid: false };
    }

    const oldUtc = Date.UTC(oldEnd.getUTCFullYear(), oldEnd.getUTCMonth(), oldEnd.getUTCDate());
    const newUtc = Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate());

    const diffMs = newUtc - oldUtc;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const isValid = diffDays > 0;
    const dailyRate = Number(selectedRental.garasi.hargaSewaHarian);
    const sisaBiaya = isValid ? diffDays * dailyRate : 0;

    return {
      diffDays,
      sisaBiaya,
      isValid,
    };
  }, [selectedRental, tanggalSelesaiBaru]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setErrorMessage("Ukuran berkas melebihi batas 5 MB.");
        return;
      }
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
      setErrorMessage(null);
    }
  };

  // Submit extension
  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRental) return;

    if (!extensionCalculation.isValid) {
      setErrorMessage("Tanggal selesai perpanjangan baru harus lebih besar dari tanggal selesai saat ini.");
      return;
    }

    if (!file) {
      setErrorMessage("Wajib mengunggah bukti pembayaran pelunasan perpanjangan sewa.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("transaksiSewaId", selectedRental.id);
      formData.append("tanggalSelesaiBaru", tanggalSelesaiBaru);
      formData.append("buktiBayar", file);

      const res = await fetch("/api/admin/perpanjang", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal memproses perpanjangan sewa.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `Perpanjangan garasi ${selectedRental.garasi.kodeGarasi} (+${extensionCalculation.diffDays} hari) berhasil disimpan!`
      );
      setModalOpen(false);
      setIsSubmitting(false);
      loadData();
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan atau server tidak merespons.");
      setIsSubmitting(false);
    }
  };

  const openProof = (url: string, title: string) => {
    setLightboxUrl(url);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

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
              <span className="text-slate-900 font-semibold">PERPANJANGAN STATUS GARASI</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Kelola Perpanjangan Garasi Aktif
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Daftar seluruh garasi yang sedang disewa hari ini (status: USED). Perpanjang masa sewa dengan kalkulasi sisa biaya otomatis.
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

        {successMessage && (
          <Alert type="success" title="Perpanjangan Berhasil">
            {successMessage}
          </Alert>
        )}

        {/* Active Rentals Table */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-slate-700" />
                <span>Garasi Sedang Disewa Hari Ini ({activeRentals.length} Unit)</span>
              </div>
            }
            subtitle="Pilih salah satu baris garasi untuk memproses perpanjangan masa sewa"
          />

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Memuat data sewa aktif...
              </div>
            ) : activeRentals.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <CalendarClock className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold text-slate-700">Tidak ada garasi aktif yang sedang disewa.</p>
                <p className="text-[11px]">Semua garasi saat ini berstatus AVAILABLE.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Garasi</TableHead>
                    <TableHead>Penyewa (NIK / Nama)</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Jatuh Tempo Saat Ini</TableHead>
                    <TableHead>Total Biaya Berjalan</TableHead>
                    <TableHead>Bukti Bayar Awal</TableHead>
                    <TableHead>Riwayat Perpanjangan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRentals.map((r) => (
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

                      {/* Penyewa */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <span className="font-semibold text-slate-900 block">{r.penyewa.namaLengkap}</span>
                          <span className="font-mono text-[11px] text-slate-500 block">NIK: {r.penyewa.nik || "-"}</span>
                          <span className="text-[11px] text-slate-400">{r.penyewa.noTelepon}</span>
                        </div>
                      </TableCell>

                      {/* Kendaraan */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            {r.kendaraan.tipeKendaraan === "MOBIL_LISTRIK" ? (
                              <Zap className="w-3.5 h-3.5 text-teal-600" />
                            ) : r.kendaraan.tipeKendaraan === "SEPEDA" || r.kendaraan.tipeKendaraan === "SEPEDA_MOTOR" ? (
                              <Bike className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>{r.kendaraan.merekTipe}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {r.kendaraan.nomorPlat || "Tanpa Plat"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Jatuh Tempo */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-semibold text-xs text-slate-900 block">
                            {formatDate(r.tanggalSelesai)}
                          </span>
                          <Badge variant="used">Sedang Berjalan</Badge>
                        </div>
                      </TableCell>

                      {/* Total Biaya */}
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-slate-900 block">
                          {formatRupiah(r.totalBiaya)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Tarif: {formatRupiah(r.garasi.hargaSewaHarian)}/hr)
                        </span>
                      </TableCell>

                      {/* Bukti Bayar Awal */}
                      <TableCell>
                        <button
                          onClick={() =>
                            openProof(
                              r.buktiPelunasanUrl,
                              `Bukti Bayar Awal — ${r.garasi.kodeGarasi}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded text-[11px] font-medium text-steel-700 hover:bg-steel-50 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Bukti Awal</span>
                        </button>
                      </TableCell>

                      {/* Riwayat Perpanjangan */}
                      <TableCell>
                        {r.perpanjanganList.length === 0 ? (
                          <span className="text-slate-400 text-xs">Belum pernah</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-800">
                              {r.perpanjanganList.length}x Perpanjangan
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Total: +{r.perpanjanganList.reduce((acc, c) => acc + c.tambahanHari, 0)} hari
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Aksi Perpanjang */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openExtensionModal(r)}
                          icon={<PlusCircle className="w-3.5 h-3.5" />}
                        >
                          Perpanjang
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Extension Modal Dialog */}
      {selectedRental && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Perpanjang Masa Sewa Garasi — ${selectedRental.garasi.kodeGarasi}`}
          subtitle={`Penyewa: ${selectedRental.penyewa.namaLengkap} (${selectedRental.kendaraan.merekTipe})`}
          maxWidth="lg"
        >
          <form onSubmit={handleExtensionSubmit} className="space-y-4">
            {errorMessage && (
              <Alert type="error" title="Validasi Gagal">
                {errorMessage}
              </Alert>
            )}

            {/* Current Dates & Rates */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-slate-500 block">Jatuh Tempo Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatDate(selectedRental.tanggalSelesai)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tarif Sewa Harian:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(selectedRental.garasi.hargaSewaHarian)}
                </span>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <Input
                label="Tanggal Selesai Baru (Harus Lebih Besar dari Tanggal Saat Ini)"
                type="date"
                required
                value={tanggalSelesaiBaru}
                onChange={(e) => setTanggalSelesaiBaru(e.target.value)}
                min={new Date(new Date(selectedRental.tanggalSelesai).getTime() + 86400000)
                  .toISOString()
                  .split("T")[0]}
              />
            </div>

            {/* Live Calculation Result */}
            <div className="p-3.5 bg-slate-900 text-white rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                <span>Tambahan Durasi:</span>
                <span className="text-white font-bold">
                  {extensionCalculation.isValid ? `+${extensionCalculation.diffDays} Hari` : "Tanggal tidak valid"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                <span className="text-slate-300 font-medium">Sisa Biaya Perpanjangan (Wajib &gt; 0):</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {formatRupiah(extensionCalculation.sisaBiaya)}
                </span>
              </div>
            </div>

            {/* Proof of Payment Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Unggah Bukti Bayar Perpanjangan <span className="text-red-500">*</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5 text-xs">
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="font-semibold text-steel-700">Pilih berkas bukti bayar</span>
                  <span className="text-[11px] text-slate-400">
                    {file ? file.name : "Format JPG, PNG, WEBP (maks. 5 MB)"}
                  </span>
                </div>
              </div>

              {filePreview && (
                <div className="p-2 border border-slate-200 rounded flex items-center gap-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded border" />
                  <div className="text-xs truncate font-medium text-slate-800">{file?.name}</div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                disabled={!extensionCalculation.isValid || !file}
                icon={<FileCheck2 className="w-4 h-4" />}
              >
                Konfirmasi Perpanjangan
              </Button>
            </div>
          </form>
        </Modal>
      )}

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
