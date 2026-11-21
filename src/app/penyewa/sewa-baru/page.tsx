"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Warehouse,
  Car,
  Bike,
  Zap,
  Calendar,
  CreditCard,
  Upload,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatRupiah } from "@/lib/format";

type VehicleType = "sepeda" | "sepeda_motor" | "mobil" | "mobil_listrik";
type RentalType = "harian" | "bulanan";

interface AvailableGarage {
  id: string;
  code: string;
  type: "sepeda" | "mobil" | "mobil_listrik";
  dailyPrice: number;
  kwhPrice: number | null;
  status: "available" | "used";
}

interface QuoteResult {
  rentalType: RentalType;
  durationDays: number;
  startDate: string;
  endDate: string;
  rentalCost: number;
  electricityCost: number;
  energyKwhCharged: number;
  totalCost: number;
}

export default function SewaBaruPage() {
  const router = useRouter();

  // 1. Vehicle State
  const [vehicleType, setVehicleType] = useState<VehicleType>("mobil");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleBrandType, setVehicleBrandType] = useState("");
  const [maxBatteryKwh, setMaxBatteryKwh] = useState<number | "">("");
  const [currentBatteryKwh, setCurrentBatteryKwh] = useState<number | "">("");

  // 2. Garages State
  const [availableGarages, setAvailableGarages] = useState<AvailableGarage[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>("");
  const [isLoadingGarages, setIsLoadingGarages] = useState(false);

  // 3. Rental Duration State
  const [rentalType, setRentalType] = useState<RentalType>("harian");
  const [durationDays, setDurationDays] = useState<number>(7);

  // 4. Payment Proof File
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);

  // 5. Real-time Quote State
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // 6. Submission & Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tentukan tipe garasi yang kompatibel dengan tipe kendaraan yang dipilih
  const getCompatibleGarageTypes = (vType: VehicleType): string[] => {
    switch (vType) {
      case "sepeda":
      case "sepeda_motor":
        return ["sepeda"];
      case "mobil":
        return ["mobil"];
      case "mobil_listrik":
        return ["mobil", "mobil_listrik"];
      default:
        return [];
    }
  };

  // Fetch garasi yang tersedia untuk tipe kendaraan yang dipilih
  const fetchGarages = useCallback(async () => {
    setIsLoadingGarages(true);
    setSelectedGarageId("");
    setQuote(null);
    try {
      // Ambil semua garasi available
      const res = await fetch("/api/penyewa/garasi-tersedia");
      if (res.ok) {
        const json = await res.json();
        const allAvailable: AvailableGarage[] = json.data?.garages || [];
        const compatibleTypes = getCompatibleGarageTypes(vehicleType);
        const filtered = allAvailable.filter((g) => compatibleTypes.includes(g.type));
        setAvailableGarages(filtered);
        if (filtered.length > 0) {
          setSelectedGarageId(filtered[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data garasi:", err);
    } finally {
      setIsLoadingGarages(false);
    }
  }, [vehicleType]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Handle preview file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        setSubmitError("Format gambar harus JPEG, PNG, atau WEBP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError("Ukuran gambar maksimal 5 MB.");
        return;
      }
      setPaymentProofFile(file);
      setPaymentProofPreview(URL.createObjectURL(file));
      setSubmitError(null);
    }
  };

  const selectedGarage = availableGarages.find((g) => g.id === selectedGarageId);

  // Recalculate quote whenever inputs change
  useEffect(() => {
    let isCancelled = false;

    async function updateQuote() {
      if (!selectedGarage) {
        setQuote(null);
        return;
      }

      // Validasi battery jika mobil_listrik
      if (vehicleType === "mobil_listrik") {
        if (maxBatteryKwh === "" || currentBatteryKwh === "") {
          setQuote(null);
          setQuoteError("Kapasitas baterai max dan current wajib diisi untuk mobil listrik.");
          return;
        }
        if (Number(currentBatteryKwh) > Number(maxBatteryKwh)) {
          setQuote(null);
          setQuoteError("Baterai saat ini tidak boleh melebihi kapasitas maksimum.");
          return;
        }
      }

      setQuoteError(null);
      setIsQuoting(true);

      try {
        const payload = {
          rentalType,
          durationDays: rentalType === "harian" ? Number(durationDays) : null,
          dailyPrice: Number(selectedGarage.dailyPrice),
          garageType: selectedGarage.type,
          kwhPrice: selectedGarage.kwhPrice ? Number(selectedGarage.kwhPrice) : null,
          vehicle: {
            vehicleType,
            plateNumber: vehicleType === "sepeda" ? null : plateNumber || "B 1234 XYZ",
            vehicleBrandType: vehicleBrandType || "Default",
            maxBatteryKwh: vehicleType === "mobil_listrik" ? Number(maxBatteryKwh) : null,
            currentBatteryKwh: vehicleType === "mobil_listrik" ? Number(currentBatteryKwh) : null,
          },
        };

        const res = await fetch("/api/penyewa/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (!isCancelled) {
            setQuote(json.data.quote);
          }
        } else {
          const json = await res.json();
          if (!isCancelled) {
            setQuote(null);
            setQuoteError(json.error || "Gagal menghitung tarif sewa.");
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setQuote(null);
          setQuoteError("Gagal menghubungi server kalkulator tarif.");
        }
      } finally {
        if (!isCancelled) setIsQuoting(false);
      }
    }

    updateQuote();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedGarage,
    rentalType,
    durationDays,
    vehicleType,
    plateNumber,
    vehicleBrandType,
    maxBatteryKwh,
    currentBatteryKwh,
  ]);

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedGarageId) {
      setSubmitError("Silakan pilih unit garasi yang tersedia terlebih dahulu.");
      return;
    }

    if (!vehicleBrandType.trim()) {
      setSubmitError("Merek dan tipe kendaraan wajib diisi.");
      return;
    }

    if (vehicleType !== "sepeda" && !plateNumber.trim()) {
      setSubmitError("Nomor plat kendaraan wajib diisi.");
      return;
    }

    if (vehicleType === "mobil_listrik") {
      if (maxBatteryKwh === "" || Number(maxBatteryKwh) <= 0) {
        setSubmitError("Kapasitas baterai maksimum wajib lebih dari 0.");
        return;
      }
      if (currentBatteryKwh === "" || Number(currentBatteryKwh) < 0) {
        setSubmitError("Baterai saat ini wajib diisi minimal 0.");
        return;
      }
      if (Number(currentBatteryKwh) > Number(maxBatteryKwh)) {
        setSubmitError("Baterai saat ini tidak boleh melebihi kapasitas maksimum.");
        return;
      }
    }

    if (rentalType === "harian" && (durationDays < 1 || durationDays > 29)) {
      setSubmitError("Durasi sewa harian harus antara 1 sampai 29 hari.");
      return;
    }

    if (!paymentProofFile) {
      setSubmitError("Unggah bukti pelunasan biaya sewa (gambar JPG/PNG/WEBP) sebelum mengajukan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("garageId", selectedGarageId);
      formData.append("vehicleType", vehicleType);
      if (vehicleType !== "sepeda") {
        formData.append("plateNumber", plateNumber.trim().toUpperCase());
      }
      formData.append("vehicleBrandType", vehicleBrandType.trim());
      if (vehicleType === "mobil_listrik") {
        formData.append("maxBatteryKwh", String(maxBatteryKwh));
        formData.append("currentBatteryKwh", String(currentBatteryKwh));
      }
      formData.append("rentalType", rentalType);
      if (rentalType === "harian") {
        formData.append("durationDays", String(durationDays));
      }
      formData.append("paymentProof", paymentProofFile);

      const res = await fetch("/api/penyewa/sewa-baru", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error || "Gagal memproses penyewaan garasi.");
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(
        `Transaksi berhasil! Garasi ${selectedGarage?.code} telah aktif disewa. Anda dapat melihat bukti di Riwayat Sewa.`
      );
      setIsSubmitting(false);

      // Refresh list garasi
      fetchGarages();
    } catch (err) {
      setSubmitError("Terjadi kesalahan jaringan saat mengirim data transaksi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Warehouse className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sewa Baru Garasi Kendaraan
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Pilih kendaraan, unit garasi yang tersedia hari ini, tentukan durasi, dan konfirmasi pelunasan biaya.
        </p>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-emerald-900">Penyewaan Berhasil Disimpan</h3>
              <p className="text-xs text-emerald-700 mt-0.5">{submitSuccess}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => router.push("/penyewa/riwayat")}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Buka Riwayat Sewa Saya
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSubmitSuccess(null);
                setVehicleBrandType("");
                setPlateNumber("");
                setMaxBatteryKwh("");
                setCurrentBatteryKwh("");
                setPaymentProofFile(null);
                setPaymentProofPreview(null);
              }}
            >
              Sewa Garasi Lainnya
            </Button>
          </div>
        </div>
      )}

      {submitError && (
        <Alert type="error" title="Gagal Memproses Penyewaan">
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Columns (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Data Kendaraan */}
          <Card>
            <CardHeader
              title="1. Informasi Kendaraan"
              subtitle="Pilih kategori kendaraan dan isi detail spesifikasinya"
            />
            <CardContent className="space-y-4">
              {/* Tipe Kendaraan */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tipe Kendaraan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: "sepeda", label: "Sepeda", icon: Bike, desc: "Garasi Sepeda (S)" },
                    { type: "sepeda_motor", label: "Motor", icon: Bike, desc: "Garasi Sepeda (S)" },
                    { type: "mobil", label: "Mobil Bensin", icon: Car, desc: "Garasi Mobil (C)" },
                    { type: "mobil_listrik", label: "Mobil EV", icon: Zap, desc: "Garasi C / E" },
                  ].map((item) => {
                    const isSelected = vehicleType === item.type;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setVehicleType(item.type as VehicleType);
                          if (item.type === "sepeda") setPlateNumber("");
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-hairline"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? "text-white" : "text-slate-500"}`} />
                        <div className="text-xs font-semibold truncate">{item.label}</div>
                        <div
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Merek & Tipe */}
              <Input
                label="Merek & Tipe Kendaraan"
                placeholder={
                  vehicleType === "sepeda"
                    ? "Contoh: Polygon Strattos S3"
                    : vehicleType === "sepeda_motor"
                    ? "Contoh: Honda Vario 160"
                    : vehicleType === "mobil"
                    ? "Contoh: Toyota Avanza 1.5G"
                    : "Contoh: Hyundai Ioniq 5 Signature"
                }
                value={vehicleBrandType}
                onChange={(e) => setVehicleBrandType(e.target.value)}
                required
              />

              {/* Nomor Plat (Kecuali Sepeda) */}
              {vehicleType !== "sepeda" ? (
                <Input
                  label="Nomor Plat Kendaraan"
                  placeholder="Contoh: B 1234 ABC"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  required
                  helperText="Format nomor polisi resmi kendaraan."
                />
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Sepeda gowes tidak menggunakan nomor plat kendaraan.</span>
                </div>
              )}

              {/* Input Tambahan Khusus Mobil Listrik */}
              {vehicleType === "mobil_listrik" && (
                <div className="p-3.5 bg-teal-50/50 border border-teal-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
                    <Zap className="w-4 h-4 text-teal-600" />
                    <span>Spesifikasi Baterai Mobil Listrik (Wajib)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Kapasitas Baterai Maks (max_battery_kwh)"
                      type="number"
                      step="0.1"
                      min="1"
                      placeholder="Contoh: 72.6"
                      value={maxBatteryKwh}
                      onChange={(e) =>
                        setMaxBatteryKwh(e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      required
                      helperText="Total kapasitas charge baterai (kWh)."
                    />

                    <Input
                      label="Baterai Saat Ini (current_battery_kwh)"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Contoh: 20.0"
                      value={currentBatteryKwh}
                      onChange={(e) =>
                        setCurrentBatteryKwh(e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      required
                      helperText="Baterai saat kendaraan masuk (kWh)."
                    />
                  </div>

                  {maxBatteryKwh !== "" &&
                    currentBatteryKwh !== "" &&
                    Number(currentBatteryKwh) > Number(maxBatteryKwh) && (
                      <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Baterai saat ini ({currentBatteryKwh} kWh) tidak boleh melebihi kapasitas maksimum ({maxBatteryKwh} kWh).
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Pemilihan Garasi Tersedia */}
          <Card>
            <CardHeader
              title="2. Pilih Unit Garasi Tersedia"
              subtitle="Menampilkan unit garasi yang cocok dengan jenis kendaraan dan berstatus available hari ini"
            />
            <CardContent className="space-y-4">
              {isLoadingGarages ? (
                <div className="p-6 text-center text-xs text-slate-400 font-mono">
                  Mencari unit garasi yang tersedia...
                </div>
              ) : availableGarages.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="text-xs font-semibold text-slate-800">
                    Tidak Ada Garasi Tersedia Hari Ini
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Seluruh garasi yang cocok dengan tipe kendaraan ini sedang terisi (used). Silakan cek tipe kendaraan lain atau hubungi Admin.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                    {availableGarages.map((g) => {
                      const isSelected = selectedGarageId === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGarageId(g.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-hairline"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-sm">{g.code}</span>
                            <Badge
                              variant={
                                g.type === "sepeda"
                                  ? "sepeda"
                                  : g.type === "mobil"
                                  ? "mobil"
                                  : "mobil_listrik"
                              }
                            >
                              {g.type === "sepeda"
                                ? "SEPEDA (S)"
                                : g.type === "mobil"
                                ? "MOBIL (C)"
                                : "EV CHARGE (E)"}
                            </Badge>
                          </div>
                          <div
                            className={`text-xs font-mono tabular-nums ${
                              isSelected ? "text-slate-200" : "text-slate-600"
                            }`}
                          >
                            {formatRupiah(g.dailyPrice)} / hari
                          </div>
                          {g.type === "mobil_listrik" && g.kwhPrice && (
                            <div
                              className={`text-[10px] font-mono mt-0.5 flex items-center gap-1 ${
                                isSelected ? "text-teal-300" : "text-teal-700"
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              <span>Tarif Listrik: {formatRupiah(g.kwhPrice)}/kWh</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Periode Sewa & Bukti Pelunasan */}
          <Card>
            <CardHeader
              title="3. Durasi Sewa & Bukti Pelunasan"
              subtitle="Tentukan opsi harian (1-29 hari) atau bulanan (25x harian), lalu lampirkan bukti pembayaran"
            />
            <CardContent className="space-y-4">
              {/* Opsi Sewa: Harian vs Bulanan */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tipe Sewa <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRentalType("harian")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rentalType === "harian"
                        ? "bg-slate-900 text-white border-slate-900 shadow-hairline"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Sewa Harian</div>
                    <div
                      className={`text-[10px] font-mono mt-0.5 ${
                        rentalType === "harian" ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      1 s/d 29 hari (durasi &times; tarif harian)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRentalType("bulanan")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rentalType === "bulanan"
                        ? "bg-slate-900 text-white border-slate-900 shadow-hairline"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Sewa Bulanan (Promo 25&times;)</div>
                    <div
                      className={`text-[10px] font-mono mt-0.5 ${
                        rentalType === "bulanan" ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      30 hari (tarif 25 hari, hemat 5 hari)
                    </div>
                  </button>
                </div>
              </div>

              {/* Input Durasi Hari (Jika Harian) */}
              {rentalType === "harian" ? (
                <div>
                  <Input
                    label="Jumlah Hari Sewa (1 s/d 29 Hari)"
                    type="number"
                    min={1}
                    max={29}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                    required
                    helperText="Aturan bisnis: Sewa harian maksimal 29 hari (kurang dari 1 bulan). Untuk 30 hari pilih Sewa Bulanan."
                  />
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ketentuan Sewa Bulanan</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sewa bulanan berlangsung tepat 1 bulan kalender (misal mulai hari ini, berakhir pada tanggal yang sama di bulan berikutnya).
                    Biaya dihitung otomatis setara <strong>25 &times; tarif harian</strong>. Jika ingin menyewa lebih dari 1 bulan, silakan ajukan sewa baru kembali di akhir periode.
                  </p>
                </div>
              )}

              {/* Upload Bukti Pembayaran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Bukti Pelunasan Biaya <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    required
                  />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <div className="text-xs font-medium text-slate-700">
                    {paymentProofFile ? paymentProofFile.name : "Klik atau seret file struk / bukti transfer ke sini"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Format JPG, PNG, atau WEBP. Maksimal 5 MB. Disimpan di Supabase Storage.
                  </p>
                </div>

                {paymentProofPreview && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentProofPreview}
                      alt="Pratinjau Bukti Bayar"
                      className="w-16 h-16 object-cover rounded border border-slate-200"
                    />
                    <div className="text-xs">
                      <div className="font-medium text-slate-900">{paymentProofFile?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {(paymentProofFile!.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary & Live Real-Time Quote (1 Col) */}
        <div className="space-y-6">
          <Card className="sticky top-20 border-slate-300 shadow-sm">
            <CardHeader
              title="Ringkasan & Total Biaya"
              subtitle="Kalkulasi otomatis secara real-time"
            />
            <CardContent className="space-y-4">
              {/* Unit Garasi Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  GARASI TERPILIH
                </div>
                {selectedGarage ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-base text-slate-900">
                        {selectedGarage.code}
                      </div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        Tipe: {selectedGarage.type.replace("_", " ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatRupiah(selectedGarage.dailyPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">per hari</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Belum ada garasi yang dipilih</div>
                )}
              </div>

              {quoteError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{quoteError}</span>
                </div>
              )}

              {/* Rincian Perhitungan */}
              {quote ? (
                <div className="space-y-2.5 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Periode Mulai:</span>
                    <span className="font-mono font-medium text-slate-900">{quote.startDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Periode Selesai:</span>
                    <span className="font-mono font-medium text-slate-900">{quote.endDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Durasi:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {quote.durationDays} hari ({quote.rentalType})
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Biaya Sewa Pokok:</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {formatRupiah(quote.rentalCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1">
                        <span>Biaya Listrik EV:</span>
                        {quote.energyKwhCharged > 0 && (
                          <span className="text-[10px] font-mono text-teal-700">
                            ({quote.energyKwhCharged} kWh)
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-teal-800">
                        {formatRupiah(quote.electricityCost)}
                      </span>
                    </div>

                    {selectedGarage?.type === "mobil_listrik" && vehicleType === "mobil_listrik" && (
                      <p className="text-[10px] text-teal-700 bg-teal-50 p-2 rounded border border-teal-200 leading-tight">
                        Wajib isi penuh di Garasi E: ({maxBatteryKwh} - {currentBatteryKwh}) kWh &times; {formatRupiah(selectedGarage.kwhPrice || 0)}
                      </p>
                    )}

                    {selectedGarage?.type === "mobil" && vehicleType === "mobil_listrik" && (
                      <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 leading-tight">
                        Mobil Listrik di Garasi C tidak dikenakan biaya listrik (tanpa charger).
                      </p>
                    )}
                  </div>

                  {/* Grand Total */}
                  <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        TOTAL PELUNASAN
                      </div>
                      <div className="text-[10px] text-slate-400">Termasuk pajak & fasilitas</div>
                    </div>
                    <div className="font-mono font-bold text-lg text-slate-900 tabular-nums">
                      {formatRupiah(quote.totalCost)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  {isQuoting ? "Menghitung kutipan harga..." : "Lengkapi data untuk melihat rincian biaya"}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isSubmitting}
                disabled={!selectedGarageId || !quote || isSubmitting}
                icon={<CreditCard className="w-4 h-4" />}
              >
                Bayar & Sewa Garasi
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
