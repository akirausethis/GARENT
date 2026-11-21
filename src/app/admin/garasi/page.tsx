"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  KeyRound,
  Plus,
  Filter,
  Zap,
  Car,
  Bike,
  Sparkles,
  Layers,
  RefreshCw,
} from "lucide-react";

interface GarageRecord {
  id: string;
  kodeGarasi: string;
  tipeGarasi: "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
  nomorUrut: number;
  hargaSewaHarian: number;
  hargaListrikPerKwh: number | null;
  status: "AVAILABLE" | "USED";
  createdAt: string;
  _count: {
    transaksiSewa: number;
  };
}

export default function AdminGarasiPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; namaLengkap: string; email: string; role: "ADMIN" } | null>(null);
  const [garages, setGarages] = useState<GarageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for batch generation
  const [tipeGarasi, setTipeGarasi] = useState<"SEPEDA" | "MOBIL" | "MOBIL_LISTRIK">("MOBIL");
  const [quantity, setQuantity] = useState<number>(5);
  const [hargaSewaHarian, setHargaSewaHarian] = useState<number>(50000);
  const [hargaListrikPerKwh, setHargaListrikPerKwh] = useState<number>(2500);

  // Filter states
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

      const res = await fetch("/api/admin/garasi");
      if (res.ok) {
        const json = await res.json();
        setGarages(json.data.garages || []);
      }
    } catch (err) {
      console.error("Garasi load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate live preview of generated codes
  const codePreview = useMemo(() => {
    const existingTypeGarages = garages.filter((g) => g.tipeGarasi === tipeGarasi);
    const currentMax = existingTypeGarages.length > 0 ? Math.max(...existingTypeGarages.map((g) => g.nomorUrut)) : 0;
    const prefix = tipeGarasi === "SEPEDA" ? "S" : tipeGarasi === "MOBIL" ? "C" : "E";

    const startNum = currentMax + 1;
    const endNum = currentMax + quantity;
    const isExceeded = endNum > 999;

    const startPadded = String(startNum).padStart(3, "0");
    const endPadded = String(endNum).padStart(3, "0");

    return {
      currentMax,
      startCode: `${prefix}${startPadded}`,
      endCode: `${prefix}${endPadded}`,
      isExceeded,
      targetTotal: endNum,
    };
  }, [garages, tipeGarasi, quantity]);

  // Handle batch create submit
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (quantity <= 0) {
      setErrorMessage("Jumlah garasi harus minimal 1 unit.");
      return;
    }

    if (codePreview.isExceeded) {
      setErrorMessage(`Total garasi tipe ${tipeGarasi} tidak boleh melebihi batas 999 unit.`);
      return;
    }

    if (hargaSewaHarian <= 0) {
      setErrorMessage("Harga sewa harian harus lebih dari 0.");
      return;
    }

    if (tipeGarasi === "MOBIL_LISTRIK" && (!hargaListrikPerKwh || hargaListrikPerKwh <= 0)) {
      setErrorMessage("Harga listrik per kWh wajib diisi lebih dari 0 untuk garasi mobil listrik.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/garasi/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipeGarasi,
          quantity: Number(quantity),
          hargaSewaHarian: Number(hargaSewaHarian),
          hargaListrikPerKwh: tipeGarasi === "MOBIL_LISTRIK" ? Number(hargaListrikPerKwh) : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal membuat batch garasi.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(json.data.message);
      setIsSubmitting(false);
      loadData();
    } catch {
      setErrorMessage("Terjadi kegagalan komunikasi dengan server.");
      setIsSubmitting(false);
    }
  };

  // Filtered garages
  const filteredGarages = useMemo(() => {
    return garages.filter((g) => {
      if (filterType !== "ALL" && g.tipeGarasi !== filterType) return false;
      if (filterStatus !== "ALL" && g.status !== filterStatus) return false;
      return true;
    });
  }, [garages, filterType, filterStatus]);

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
              <span className="text-slate-900 font-semibold">INVENTARIS GARASI</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Kelola & Buat Garasi Berkelompok
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pembuatan inventaris garasi secara batch dengan penomoran otomatis sekuensial (S001, C010, E001).
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan Inventaris
          </Button>
        </div>

        {errorMessage && (
          <Alert type="error" title="Gagal Menyimpan">
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert type="success" title="Batch Berhasil Dibuat">
            {successMessage}
          </Alert>
        )}

        {/* Top Grid: Batch Generator Form (Left) & Preview Details (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-700" />
                    <span>Formulir Batch Generator Garasi</span>
                  </div>
                }
                subtitle="Buat beberapa garasi sekaligus dengan kode unik terurut"
              />

              <form onSubmit={handleBatchSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tipe Garasi */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Tipe Garasi <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={tipeGarasi}
                        onChange={(e) => setTipeGarasi(e.target.value as typeof tipeGarasi)}
                      >
                        <option value="SEPEDA">SEPEDA (Prefix S — Sepeda & Motor)</option>
                        <option value="MOBIL">MOBIL (Prefix C — Mobil Bensin)</option>
                        <option value="MOBIL_LISTRIK">MOBIL_LISTRIK (Prefix E — EV Charging)</option>
                      </Select>
                    </div>

                    {/* Jumlah Garasi */}
                    <div>
                      <Input
                        label="Jumlah Garasi Dibuat (Unit)"
                        type="number"
                        min="1"
                        max="999"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        helperText="Maksimal akumulasi 999 unit per tipe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Harga Sewa Harian */}
                    <div>
                      <Input
                        label="Harga Sewa Harian (Rp)"
                        type="number"
                        min="1000"
                        step="1000"
                        required
                        value={hargaSewaHarian}
                        onChange={(e) => setHargaSewaHarian(parseInt(e.target.value) || 0)}
                        helperText="Tarif bulanan otomatis = 25 × tarif harian"
                      />
                    </div>

                    {/* Harga Listrik per kWh (Conditional) */}
                    {tipeGarasi === "MOBIL_LISTRIK" ? (
                      <div>
                        <Input
                          label="Harga Isi Listrik per kWh (Rp)"
                          type="number"
                          min="100"
                          step="100"
                          required
                          value={hargaListrikPerKwh}
                          onChange={(e) => setHargaListrikPerKwh(parseInt(e.target.value) || 0)}
                          helperText="Dikenakan saat mobil listrik menyewa garasi ini"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 flex items-center">
                        <span>Fasilitas pengisian daya listrik hanya berlaku untuk Garasi Mobil Listrik (E).</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-mono">
                    Target penomoran: <strong>{codePreview.startCode}</strong> s/d <strong>{codePreview.endCode}</strong>
                  </div>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={codePreview.isExceeded}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Simpan Batch Garasi
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Right Info Box */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-900/10">
              <CardHeader
                title={
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-steel-700" />
                    <span>Live Preview Batch</span>
                  </div>
                }
                subtitle="Verifikasi sekuensial kode garasi"
              />
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Eksisting {tipeGarasi}:</span>
                    <span className="font-mono font-medium text-slate-900">{codePreview.currentMax} unit</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Penambahan Batch:</span>
                    <span className="font-mono font-medium text-steel-700">+{quantity} unit</span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                    <span>Total Setelah Batch:</span>
                    <span className="font-mono font-bold text-slate-900">{codePreview.targetTotal} / 999</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Kode Auto-Generated:</span>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {codePreview.startCode} s/d {codePreview.endCode}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 border border-slate-100 p-2.5 rounded bg-white">
                  <div className="font-semibold text-slate-800">Rumus Baku LSP:</div>
                  <div>• Harian: {formatRupiah(hargaSewaHarian)}/hari</div>
                  <div>• Bulanan (25x): <span className="font-mono font-medium text-slate-900">{formatRupiah(25 * hargaSewaHarian)}</span></div>
                  {tipeGarasi === "MOBIL_LISTRIK" && (
                    <div>• Listrik: <span className="font-mono font-medium text-teal-700">{formatRupiah(hargaListrikPerKwh)}/kWh</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Inventory Table with Filters */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <span>Daftar Inventaris Garasi ({filteredGarages.length} Unit)</span>
              </div>
            }
            subtitle="Inventaris operasional seluruh garasi fasilitas"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter Tipe:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800"
                  >
                    <option value="ALL">Semua Tipe</option>
                    <option value="SEPEDA">SEPEDA</option>
                    <option value="MOBIL">MOBIL</option>
                    <option value="MOBIL_LISTRIK">MOBIL_LISTRIK</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="USED">USED</option>
                  </select>
                </div>
              </div>
            }
          />

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Memuat data inventaris...
              </div>
            ) : filteredGarages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Tidak ada garasi yang sesuai dengan kriteria filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Garasi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>No. Urut</TableHead>
                    <TableHead>Tarif Harian</TableHead>
                    <TableHead>Tarif Bulanan (25x)</TableHead>
                    <TableHead>Tarif Listrik/kWh</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Disewa</TableHead>
                    <TableHead>Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGarages.map((garage) => (
                    <TableRow key={garage.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {garage.kodeGarasi}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {garage.tipeGarasi === "SEPEDA" ? (
                            <Bike className="w-3.5 h-3.5 text-emerald-600" />
                          ) : garage.tipeGarasi === "MOBIL_LISTRIK" ? (
                            <Zap className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <Car className="w-3.5 h-3.5 text-blue-600" />
                          )}
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
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-slate-600">#{garage.nomorUrut}</span>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono font-medium text-slate-900">
                          {formatRupiah(garage.hargaSewaHarian)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono font-medium text-slate-700">
                          {formatRupiah(25 * Number(garage.hargaSewaHarian))}
                        </span>
                      </TableCell>

                      <TableCell>
                        {garage.hargaListrikPerKwh ? (
                          <span className="font-mono text-teal-700">
                            {formatRupiah(garage.hargaListrikPerKwh)}/kWh
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={garage.status === "AVAILABLE" ? "available" : "used"}>
                          {garage.status === "AVAILABLE" ? "Tersedia" : "Terpakai"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-slate-600">
                          {garage._count?.transaksiSewa || 0}x
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {formatDate(garage.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
