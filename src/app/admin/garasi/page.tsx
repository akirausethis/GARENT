"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
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
  Zap,
  Car,
  Bike,
  Sparkles,
  Layers,
  RefreshCw,
  Search,
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
  _count?: {
    transaksiSewa: number;
  };
}

export default function AdminGarasiPage() {
  const [garages, setGarages] = useState<GarageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for batch generation
  const [tipeGarasi, setTipeGarasi] = useState<"SEPEDA" | "MOBIL" | "MOBIL_LISTRIK">("MOBIL");
  const [quantity, setQuantity] = useState<number>(5);
  const [hargaSewaHarian, setHargaSewaHarian] = useState<number>(50000);
  const [hargaListrikPerKwh, setHargaListrikPerKwh] = useState<number>(2500);

  // Filter & Search states
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Adjust defaults when changing garage type
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value as "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";
    setTipeGarasi(nextType);
    if (nextType === "SEPEDA") {
      setHargaSewaHarian(10000);
    } else if (nextType === "MOBIL") {
      setHargaSewaHarian(50000);
    } else if (nextType === "MOBIL_LISTRIK") {
      setHargaSewaHarian(75000);
      setHargaListrikPerKwh(2500);
    }
  };

  // Live preview calculation of sequential garage IDs
  const codePreview = useMemo(() => {
    const existingTypeGarages = garages.filter((g) => g.tipeGarasi === tipeGarasi);
    const currentMax =
      existingTypeGarages.length > 0
        ? Math.max(...existingTypeGarages.map((g) => g.nomorUrut))
        : 0;
    const prefix = tipeGarasi === "SEPEDA" ? "S" : tipeGarasi === "MOBIL" ? "C" : "E";

    const qty = Number(quantity) || 0;
    const startNum = currentMax + 1;
    const endNum = currentMax + qty;
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

  // Live preview calculation of 25x monthly rate
  const monthlyRatePreview = useMemo(() => {
    const daily = Number(hargaSewaHarian) || 0;
    return 25 * daily;
  }, [hargaSewaHarian]);

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
      const res = await fetch("/api/admin/garasi", {
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
        setErrorMessage(json.error || "Gagal membuat unit garasi baru.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(json.data.message);
      await loadData();
    } catch {
      setErrorMessage("Terjadi kesalahan komunikasi dengan server basis data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered and searched inventory
  const filteredGarages = useMemo(() => {
    return garages.filter((g) => {
      if (filterType !== "ALL" && g.tipeGarasi !== filterType) return false;
      if (filterStatus !== "ALL" && g.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchCode = g.kodeGarasi.toLowerCase().includes(query);
        const matchType = g.tipeGarasi.toLowerCase().includes(query);
        return matchCode || matchType;
      }
      return true;
    });
  }, [garages, filterType, filterStatus, searchQuery]);

  // Inventory summary counts
  const sepedaCount = garages.filter((g) => g.tipeGarasi === "SEPEDA").length;
  const mobilCount = garages.filter((g) => g.tipeGarasi === "MOBIL").length;
  const evCount = garages.filter((g) => g.tipeGarasi === "MOBIL_LISTRIK").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <span>ADMINISTRATOR</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">INVENTARIS GARASI</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              MILESTONE DAY 1
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pengelolaan Inventaris & Batch Auto-ID Garasi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Penomoran otomatis sekuensial (S001..S999, C001..C999, E001..E999) dengan rumus baku 25x tarif bulanan.
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

      {/* Top 3 Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Garasi Sepeda (S)</div>
              <div className="text-sm font-bold font-mono text-slate-900">{sepedaCount} / 999 Bay</div>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">S001..S999</span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Garasi Mobil (C)</div>
              <div className="text-sm font-bold font-mono text-slate-900">{mobilCount} / 999 Bay</div>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">C001..C999</span>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Garasi Mobil Listrik (E)</div>
              <div className="text-sm font-bold font-mono text-slate-900">{evCount} / 999 Bay</div>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">E001..E999</span>
        </div>
      </div>

      {/* Batch Creation Form Card */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-700" />
              <span>Formulir Batch Pembuatan Garasi Baru</span>
            </div>
          }
          subtitle="Gunakan Generator Auto-ID sekuensial berintegritas tinggi dengan validasi kuantitas <= 999"
        />

        <form onSubmit={handleBatchSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert type="error" title="Gagal Memproses Batch">
                {errorMessage}
              </Alert>
            )}

            {successMessage && (
              <Alert type="success" title="Batch Berhasil Dibuat">
                {successMessage}
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Field 1: Tipe Garasi */}
              <Select
                label="Kategori Garasi"
                required
                value={tipeGarasi}
                onChange={handleTypeChange}
              >
                <option value="SEPEDA">SEPEDA (Awalan S)</option>
                <option value="MOBIL">MOBIL (Awalan C)</option>
                <option value="MOBIL_LISTRIK">MOBIL_LISTRIK (Awalan E)</option>
              </Select>

              {/* Field 2: Kuantitas Batch */}
              <Input
                label="Jumlah Unit yang Dibuat"
                type="number"
                min={1}
                max={999}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                helperText="Maksimum 999 total unit per kategori"
              />

              {/* Field 3: Harga Sewa Harian */}
              <Input
                label="Tarif Sewa Harian (Rp)"
                type="number"
                min={1000}
                step={1000}
                required
                value={hargaSewaHarian}
                onChange={(e) => setHargaSewaHarian(parseInt(e.target.value) || 0)}
                helperText={`Format: ${formatRupiah(hargaSewaHarian)} / hari`}
              />

              {/* Field 4: Harga Listrik per kWh (Hanya Mobil Listrik) */}
              <Input
                label="Tarif Listrik / kWh (Rp)"
                type="number"
                min={500}
                step={100}
                required={tipeGarasi === "MOBIL_LISTRIK"}
                disabled={tipeGarasi !== "MOBIL_LISTRIK"}
                value={tipeGarasi === "MOBIL_LISTRIK" ? hargaListrikPerKwh : 0}
                onChange={(e) => setHargaListrikPerKwh(parseInt(e.target.value) || 0)}
                helperText={
                  tipeGarasi === "MOBIL_LISTRIK"
                    ? `Format: ${formatRupiah(hargaListrikPerKwh)} / kWh`
                    : "Hanya untuk garasi EV"
                }
              />
            </div>

            {/* Live Previews Panel: Auto-ID & 25x Monthly Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {/* Preview 1: Sequential Auto-ID Range */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-steel-700" />
                    <span>Live Preview Auto-ID Sekuensial:</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Nomor terakhir saat ini: <strong className="font-mono">#{codePreview.currentMax}</strong>
                  </div>
                </div>

                <div className="text-right">
                  {codePreview.isExceeded ? (
                    <span className="text-xs font-bold text-red-600 font-mono">
                      Kapasitas Melebihi Batas 999 ({codePreview.targetTotal})
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 shadow-hairline">
                      <span>{codePreview.startCode}</span>
                      <span className="text-slate-400">→</span>
                      <span>{codePreview.endCode}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({quantity} unit)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview 2: 25x Monthly Rate Calculation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tarif Bulanan Otomatis (Rumus 25x):</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    25 × {formatRupiah(hargaSewaHarian)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    {formatRupiah(monthlyRatePreview)}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">per 30 hari sewa</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={codePreview.isExceeded}
                icon={<Plus className="w-4 h-4" />}
              >
                Buat {quantity} Unit Garasi ({codePreview.startCode}..{codePreview.endCode})
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Filterable Inventory Table */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <span>Daftar Seluruh Garasi Terdaftar</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                ({filteredGarages.length} dari {garages.length} bay)
              </span>
            </div>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari kode (S001, C010)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Filter Kategori */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="SEPEDA">SEPEDA (S)</option>
                <option value="MOBIL">MOBIL (C)</option>
                <option value="MOBIL_LISTRIK">MOBIL_LISTRIK (E)</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
                <option value="USED">USED (Terpakai)</option>
              </select>
            </div>
          }
        />

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Memuat data inventaris garasi...
            </div>
          ) : filteredGarages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada data garasi yang sesuai dengan kriteria filter.
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
                  <TableHead>Status Ketersediaan</TableHead>
                  <TableHead>Total Disewa</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
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
    </div>
  );
}
