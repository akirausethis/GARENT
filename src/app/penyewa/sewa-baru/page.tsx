"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  Car,
  Bike,
  Zap,
  Calendar,
  CreditCard,
  Upload,
  AlertCircle,
  FileCheck2,
  Receipt,
} from "lucide-react";

interface UserProfile {
  id: string;
  namaLengkap: string;
  email: string;
  role: "ADMIN" | "PENYEWA";
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
}

interface GarageItem {
  id: string;
  kodeGarasi: string;
  tipeGarasi: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
  nomorUrut: number;
  hargaSewaHarian: number;
  hargaListrikPerKwh: number | null;
  status: "AVAILABLE" | "USED";
}

interface RentalQuoteData {
  tanggalMulai: string;
  tanggalSelesai: string;
  durasiHari: number;
  hargaSewaHarian: number;
  biayaSewa: number;
  biayaListrik: number;
  totalBiaya: number;
}

export default function SewaBaruPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Form states
  const [tipeKendaraan, setTipeKendaraan] = useState<"SEPEDA" | "SEPEDA_MOTOR" | "MOBIL" | "MOBIL_LISTRIK">("MOBIL");
  const [nomorPlat, setNomorPlat] = useState("");
  const [merekTipe, setMerekTipe] = useState("");
  const [kapasitasListrikKwh, setKapasitasListrikKwh] = useState<number | "">("");

  const [tipeSewa, setTipeSewa] = useState<"HARIAN" | "BULANAN">("HARIAN");
  const [jumlahHari, setJumlahHari] = useState<number>(7);

  // Garages list & selected garage
  const [availableGarages, setAvailableGarages] = useState<GarageItem[]>([]);
  const [selectedGarasiId, setSelectedGarasiId] = useState<string>("");
  const [isLoadingGarages, setIsLoadingGarages] = useState(false);

  // Quote preview state
  const [quote, setQuote] = useState<RentalQuoteData | null>(null);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch current user session
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        setCurrentUser(json.data.user);
      } catch {
        router.push("/login");
      }
    }
    loadUser();
  }, [router]);

  // 2. Fetch compatible available garages when tipeKendaraan changes
  const fetchAvailableGarages = useCallback(async (vType: string) => {
    setIsLoadingGarages(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/penyewa/garasi-tersedia?tipeKendaraan=${vType}`);
      const json = await res.json();
      if (res.ok) {
        const garages: GarageItem[] = json.data.garages || [];
        setAvailableGarages(garages);
        if (garages.length > 0) {
          setSelectedGarasiId(garages[0].id);
        } else {
          setSelectedGarasiId("");
        }
      } else {
        setAvailableGarages([]);
        setSelectedGarasiId("");
      }
    } catch {
      setAvailableGarages([]);
      setSelectedGarasiId("");
    } finally {
      setIsLoadingGarages(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableGarages(tipeKendaraan);
  }, [tipeKendaraan, fetchAvailableGarages]);

  // 3. Live quote calculation
  const selectedGarage = availableGarages.find((g) => g.id === selectedGarasiId);

  useEffect(() => {
    if (!selectedGarage) {
      setQuote(null);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Hitung kalkulasi quote via API agar 100% konsisten dengan domain
    async function calculateQuote() {
      try {
        const res = await fetch("/api/penyewa/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipeSewa,
            jumlahHari: tipeSewa === "HARIAN" ? Number(jumlahHari) : null,
            tanggalMulai: todayStr,
            hargaSewaHarian: Number(selectedGarage!.hargaSewaHarian),
            tipeGarasi: selectedGarage!.tipeGarasi,
            hargaListrikPerKwh: selectedGarage!.hargaListrikPerKwh ? Number(selectedGarage!.hargaListrikPerKwh) : null,
            vehicle: {
              tipeKendaraan,
              nomorPlat: tipeKendaraan === "SEPEDA" ? null : (nomorPlat || "TEMPORARY"),
              merekTipe: merekTipe || "TEMPORARY",
              kapasitasListrikKwh: tipeKendaraan === "MOBIL_LISTRIK" ? (Number(kapasitasListrikKwh) || 30) : null,
            },
          }),
        });

        const json = await res.json();
        if (res.ok && json.data?.quote) {
          setQuote(json.data.quote);
        }
      } catch (err) {
        console.error("Quote fetch error:", err);
      }
    }

    calculateQuote();
  }, [
    selectedGarage,
    tipeSewa,
    jumlahHari,
    tipeKendaraan,
    nomorPlat,
    merekTipe,
    kapasitasListrikKwh,
  ]);

  // Handle file change
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

  // Submit rental transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedGarasiId) {
      setErrorMessage("Silakan pilih salah satu garasi yang tersedia.");
      return;
    }

    if (tipeKendaraan !== "SEPEDA" && !nomorPlat.trim()) {
      setErrorMessage("Nomor plat kendaraan wajib diisi untuk motor, mobil, dan mobil listrik.");
      return;
    }

    if (!merekTipe.trim()) {
      setErrorMessage("Merek dan tipe kendaraan wajib diisi.");
      return;
    }

    if (tipeKendaraan === "MOBIL_LISTRIK" && (!kapasitasListrikKwh || kapasitasListrikKwh <= 0)) {
      setErrorMessage("Kapasitas listrik baterai (kWh) wajib diisi lebih dari 0 untuk mobil listrik.");
      return;
    }

    if (tipeSewa === "HARIAN" && (jumlahHari < 1 || jumlahHari > 30)) {
      setErrorMessage("Durasi sewa harian harus berada pada rentang 1 hingga 30 hari.");
      return;
    }

    if (!file) {
      setErrorMessage("Wajib mengunggah bukti pelunasan biaya sewa (gambar JPG, PNG, atau WEBP).");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("garasiId", selectedGarasiId);
      formData.append("tipeSewa", tipeSewa);
      if (tipeSewa === "HARIAN") {
        formData.append("jumlahHari", String(jumlahHari));
      }
      formData.append("tipeKendaraan", tipeKendaraan);
      if (nomorPlat) formData.append("nomorPlat", nomorPlat.trim().toUpperCase());
      formData.append("merekTipe", merekTipe.trim());
      if (kapasitasListrikKwh) {
        formData.append("kapasitasListrikKwh", String(kapasitasListrikKwh));
      }
      formData.append("buktiBayar", file);

      const res = await fetch("/api/penyewa/sewa-baru", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal memproses transaksi sewa.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        "Penyewaan garasi berhasil dikonfirmasi! Kode garasi dan bukti pembayaran telah tersimpan."
      );

      setTimeout(() => {
        router.push("/penyewa/riwayat");
      }, 1500);
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan atau server tidak merespons.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={currentUser || undefined} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <span>OPERATIONAL CHECKOUT</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">SEWA BARU</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Formulir Penyewaan Garasi Kendaraan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pilih kendaraan, durasi sewa, alokasi garasi yang kompatibel, dan unggah bukti pelunasan biaya.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6">
            <Alert type="error" title="Perhatian">
              {errorMessage}
            </Alert>
          </div>
        )}

        {successMessage && (
          <div className="mb-6">
            <Alert type="success" title="Transaksi Berhasil">
              {successMessage}
            </Alert>
          </div>
        )}

        {/* Two-Column Checkout Layout */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Details (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Section 1: Detail Kendaraan */}
              <Card>
                <CardHeader
                  title="1. Spesifikasi Kendaraan"
                  subtitle="Tipe kendaraan menentukan ketersediaan garasi yang kompatibel"
                />
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Tipe Kendaraan <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { type: "SEPEDA", label: "Sepeda Gowes", icon: <Bike className="w-4 h-4" /> },
                        { type: "SEPEDA_MOTOR", label: "Sepeda Motor", icon: <Bike className="w-4 h-4" /> },
                        { type: "MOBIL", label: "Mobil Bensin", icon: <Car className="w-4 h-4" /> },
                        { type: "MOBIL_LISTRIK", label: "Mobil Listrik (EV)", icon: <Zap className="w-4 h-4" /> },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setTipeKendaraan(item.type as typeof tipeKendaraan)}
                          className={`p-3 text-left border rounded-lg transition-all flex flex-col justify-between h-20 ${
                            tipeKendaraan === item.type
                              ? "border-slate-900 bg-slate-900 text-white shadow-hairline"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="shrink-0">{item.icon}</div>
                          <span className="text-xs font-medium leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Merek & Tipe Kendaraan"
                      required
                      placeholder="Contoh: Honda HR-V / Polygon Strattos"
                      value={merekTipe}
                      onChange={(e) => setMerekTipe(e.target.value)}
                    />

                    {tipeKendaraan !== "SEPEDA" ? (
                      <Input
                        label="Nomor Plat Kendaraan"
                        required
                        placeholder="Contoh: B 1234 ABC"
                        value={nomorPlat}
                        onChange={(e) => setNomorPlat(e.target.value.toUpperCase())}
                        helperText="Wajib untuk motor, mobil, dan mobil listrik"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center text-xs text-slate-500">
                        <span>Sepeda gowes tidak memerlukan nomor plat resmi.</span>
                      </div>
                    )}
                  </div>

                  {/* EV Capacity Field */}
                  {tipeKendaraan === "MOBIL_LISTRIK" && (
                    <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
                        <Zap className="w-4 h-4 text-teal-700" />
                        <span>Kapasitas Baterai Mobil Listrik (Mandatory EV Full Charge)</span>
                      </div>
                      <p className="text-[11px] text-teal-800 leading-relaxed">
                        Jika memilih Garasi Mobil Listrik (E), sistem secara otomatis menerapkan aturan
                        pengisian daya hingga kapasitas penuh baterai.
                      </p>
                      <Input
                        label="Kapasitas Baterai (kWh)"
                        type="number"
                        step="0.1"
                        min="1"
                        required
                        placeholder="Contoh: 58.0"
                        value={kapasitasListrikKwh}
                        onChange={(e) => setKapasitasListrikKwh(e.target.value ? parseFloat(e.target.value) : "")}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Durasi Sewa & Alokasi Garasi */}
              <Card>
                <CardHeader
                  title="2. Skema Sewa & Pilihan Garasi"
                  subtitle="Tanggal mulai berlaku per hari ini; tanggal selesai dikalkulasi otomatis"
                />
                <CardContent className="space-y-4">
                  {/* Tipe Sewa Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Tipe Sewa <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTipeSewa("HARIAN")}
                          className={`py-2 px-3 border rounded text-xs font-medium transition-colors ${
                            tipeSewa === "HARIAN"
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Harian (1..30 Hari)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipeSewa("BULANAN")}
                          className={`py-2 px-3 border rounded text-xs font-medium transition-colors ${
                            tipeSewa === "BULANAN"
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Bulanan (25x Harian)
                        </button>
                      </div>
                    </div>

                    {tipeSewa === "HARIAN" ? (
                      <Input
                        label="Jumlah Hari Sewa (1 s/d 30 Hari)"
                        type="number"
                        min="1"
                        max="30"
                        required
                        value={jumlahHari}
                        onChange={(e) => setJumlahHari(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        helperText="Maksimal sewa harian adalah 30 hari"
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700">Durasi Bulanan</label>
                        <div className="p-2 border border-slate-200 bg-slate-50 rounded text-xs text-slate-700">
                          Sewa bulanan terhitung <strong>30 hari kalender</strong> (Tarif hemat 25x tarif harian).
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates Preview (Read-only) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Tanggal Mulai (Hari Ini):</span>
                      <span className="text-xs font-mono font-medium text-slate-900">
                        {formatDate(new Date())}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Estimasi Tanggal Selesai:</span>
                      <span className="text-xs font-mono font-medium text-slate-900">
                        {quote ? formatDate(quote.tanggalSelesai) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Garage Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Pilih Garasi Tersedia (Status: AVAILABLE) <span className="text-red-500">*</span>
                    </label>

                    {isLoadingGarages ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Memuat inventaris garasi yang kompatibel...
                      </div>
                    ) : availableGarages.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>Tidak ada garasi tersedia saat ini.</strong>
                          <p className="mt-0.5">
                            Semua garasi yang cocok dengan kendaraan ini sedang berstatus USED.
                            Silakan hubungi operator garasi atau coba tipe kendaraan lain.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                        {availableGarages.map((garage) => {
                          const isSelected = selectedGarasiId === garage.id;
                          return (
                            <button
                              key={garage.id}
                              type="button"
                              onClick={() => setSelectedGarasiId(garage.id)}
                              className={`p-3 text-left border rounded transition-all flex items-center justify-between ${
                                isSelected
                                  ? "border-steel-700 bg-white ring-2 ring-steel-700/20 shadow-hairline"
                                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs text-slate-900">
                                    {garage.kodeGarasi}
                                  </span>
                                  <Badge
                                    variant={
                                      garage.tipeGarasi === "SEPEDA"
                                        ? "sepeda"
                                        : garage.tipeGarasi === "MOBIL"
                                        ? "mobil"
                                        : "mobil_listrik"
                                    }
                                  >
                                    {garage.tipeGarasi}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Harian: <span className="font-mono">{formatRupiah(garage.hargaSewaHarian)}</span>
                                </div>
                                {garage.hargaListrikPerKwh && (
                                  <div className="text-[10px] text-teal-700 font-mono">
                                    Listrik: {formatRupiah(garage.hargaListrikPerKwh)}/kWh
                                  </div>
                                )}
                              </div>
                              <Badge variant="available">Tersedia</Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Upload Bukti Bayar */}
              <Card>
                <CardHeader
                  title="3. Unggah Bukti Pelunasan Biaya Sewa"
                  subtitle="Format yang didukung: JPG, PNG, WEBP (Maksimal 5 MB)"
                />
                <CardContent className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:bg-slate-50/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-steel-700">Klik untuk memilih berkas</span> atau tarik file ke sini
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {file ? `Terpilih: ${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "Struk transfer bank, bukti kasir, atau pelunasan"}
                      </p>
                    </div>
                  </div>

                  {filePreview && (
                    <div className="p-2 border border-slate-200 rounded bg-white flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                      <div className="text-xs">
                        <span className="font-medium text-slate-800 block truncate max-w-xs">{file?.name}</span>
                        <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3" /> Berkas siap diunggah
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Sticky Summary Receipt (4 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 space-y-4">
              <Card className="border-slate-900/10">
                <CardHeader
                  title={
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-slate-700" />
                      <span>Rincian Kutipan Transaksi</span>
                    </div>
                  }
                  subtitle="Kalkulasi transparan server-side"
                />

                <CardContent className="space-y-4">
                  {/* Selected garage tag */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Kode Garasi Terpilih</span>
                      <span className="text-sm font-mono font-bold text-slate-900">
                        {selectedGarage ? selectedGarage.kodeGarasi : "-"}
                      </span>
                    </div>
                    {selectedGarage && (
                      <Badge variant="steel">{selectedGarage.tipeGarasi}</Badge>
                    )}
                  </div>

                  {/* Itemized pricing list */}
                  <div className="space-y-2 text-xs border-b border-slate-100 pb-4">
                    <div className="flex justify-between text-slate-600">
                      <span>Skema Sewa:</span>
                      <span className="font-medium text-slate-900 font-mono">
                        {tipeSewa === "HARIAN" ? `Harian (${jumlahHari} Hari)` : "Bulanan (30 Hari)"}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Tarif Harian Dasar:</span>
                      <span className="font-medium text-slate-900 font-mono">
                        {selectedGarage ? formatRupiah(selectedGarage.hargaSewaHarian) : "Rp 0"}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Biaya Sewa Garasi:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {quote ? formatRupiah(quote.biayaSewa) : "Rp 0"}
                      </span>
                    </div>

                    {/* EV Electricity line item */}
                    <div className="flex justify-between text-slate-600">
                      <span>Biaya Pengisian Listrik (EV):</span>
                      <span className={`font-semibold font-mono ${quote && quote.biayaListrik > 0 ? "text-teal-700" : "text-slate-400"}`}>
                        {quote ? formatRupiah(quote.biayaListrik) : "Rp 0"}
                      </span>
                    </div>
                    {quote && quote.biayaListrik > 0 && (
                      <p className="text-[10px] text-teal-600 font-mono">
                        ({kapasitasListrikKwh} kWh × {formatRupiah(selectedGarage?.hargaListrikPerKwh)}/kWh)
                      </p>
                    )}
                  </div>

                  {/* Grand Total */}
                  <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-mono">
                      Total Biaya Pelunasan
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {quote ? formatRupiah(quote.totalBiaya) : "Rp 0"}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Tanpa biaya tersembunyi atau mark-up tambahan.
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mulai: <strong className="font-mono">{formatDate(new Date())}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Jatuh tempo: <strong className="font-mono">{quote ? formatDate(quote.tanggalSelesai) : "-"}</strong></span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    disabled={!selectedGarasiId || availableGarages.length === 0}
                    className="w-full"
                    icon={<FileCheck2 className="w-4 h-4" />}
                  >
                    Konfirmasi & Simpan Sewa
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
