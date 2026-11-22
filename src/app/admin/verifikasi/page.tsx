"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { formatDateTime } from "@/lib/format";
import {
  FileCheck2,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  Search,
  UserCheck,
  Clock,
  Ban,
} from "lucide-react";

interface ApplicantRecord {
  id: string;
  nik: string | null;
  namaLengkap?: string;
  fullName?: string;
  email: string;
  noTelepon?: string;
  phoneNumber?: string;
  statusVerifikasi?: string;
  verificationStatus?: string;
  verifiedById?: string | null;
  createdAt: string;
  verifiedBy?: {
    id: string;
    namaLengkap?: string;
    fullName?: string;
    email: string;
  } | null;
}

export default function AdminVerifikasiPage() {
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/verifikasi");
      if (res.ok) {
        const json = await res.json();
        setApplicants(json.data.applicants || []);
      }
    } catch (err) {
      console.error("Verifikasi load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Approve or Reject
  const handleAction = async (userId: string, action: "APPROVE" | "REJECT", name: string) => {
    setProcessingId(userId);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/verifikasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: "error", text: json.error || "Gagal memproses verifikasi." });
        setProcessingId(null);
        return;
      }

      setStatusMessage({
        type: "success",
        text: `Akun penyewa "${name}" berhasil ${action === "APPROVE" ? "DISETUJUI" : "DITOLAK"}.`,
      });

      // Reload fresh data to reflect verified_by relation accurately
      await loadData();
    } catch {
      setStatusMessage({ type: "error", text: "Terjadi kesalahan koneksi server." });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered applicants based on tab and search
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const status = (app.statusVerifikasi || app.verificationStatus || "").toUpperCase();
      if (activeTab !== "ALL" && status !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (app.namaLengkap || app.fullName || "").toLowerCase().includes(query);
        const matchNik = (app.nik || "").includes(query);
        const matchEmail = (app.email || "").toLowerCase().includes(query);
        const matchPhone = (app.noTelepon || app.phoneNumber || "").includes(query);
        return matchName || matchNik || matchEmail || matchPhone;
      }
      return true;
    });
  }, [applicants, activeTab, searchQuery]);

  const pendingCount = applicants.filter(
    (a) => (a.statusVerifikasi || a.verificationStatus || "").toUpperCase() === "PENDING"
  ).length;
  const approvedCount = applicants.filter(
    (a) => (a.statusVerifikasi || a.verificationStatus || "").toUpperCase() === "APPROVED"
  ).length;
  const rejectedCount = applicants.filter(
    (a) => (a.statusVerifikasi || a.verificationStatus || "").toUpperCase() === "REJECTED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <span>ADMINISTRATOR</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">VERIFIKASI PENYEWA</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              MILESTONE DAY 1
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Antrean Verifikasi KTP / NIK Pemohon Sewa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Validasi identitas calon penyewa sebelum diberikan hak pemesanan unit garasi.
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

      {statusMessage && (
        <Alert type={statusMessage.type === "success" ? "success" : "error"} title="Status Aksi">
          {statusMessage.text}
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setActiveTab("PENDING")}
          className={`p-3 border rounded-lg cursor-pointer transition-all ${
            activeTab === "PENDING"
              ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-300"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Menunggu Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">{pendingCount} Akun</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Memerlukan persetujuan admin</div>
        </div>

        <div
          onClick={() => setActiveTab("APPROVED")}
          className={`p-3 border rounded-lg cursor-pointer transition-all ${
            activeTab === "APPROVED"
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Disetujui (Approved)</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{approvedCount} Akun</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Siap melakukan penyewaan garasi</div>
        </div>

        <div
          onClick={() => setActiveTab("REJECTED")}
          className={`p-3 border rounded-lg cursor-pointer transition-all ${
            activeTab === "REJECTED"
              ? "bg-red-50/50 border-red-300 ring-1 ring-red-300"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Ditolak (Rejected)</span>
            <Ban className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold font-mono text-red-700 mt-1">{rejectedCount} Akun</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Data KTP tidak valid/duplikat</div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-slate-700" />
              <span>Daftar Pemohon Akun Penyewa</span>
              <span className="text-xs font-mono font-normal text-slate-500">
                ({filteredApplicants.length} akun ditampilkan)
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
                  placeholder="Cari NIK, Nama, Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Status Filter Tab Pills */}
              <div className="flex items-center border border-slate-200 rounded p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("PENDING")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeTab === "PENDING" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("APPROVED")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeTab === "APPROVED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("REJECTED")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeTab === "REJECTED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Rejected ({rejectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Semua ({applicants.length})
                </button>
              </div>
            </div>
          }
        />

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Memuat data antrean verifikasi...
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada data pemohon yang cocok dengan kriteria filter saat ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIK / KTP (16 Digit)</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Kontak Pengguna</TableHead>
                  <TableHead>Waktu Pendaftaran</TableHead>
                  <TableHead>Status Verifikasi</TableHead>
                  <TableHead>Diverifikasi Oleh</TableHead>
                  <TableHead className="text-right">Keputusan Verifikasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplicants.map((app) => {
                  const status = (app.statusVerifikasi || app.verificationStatus || "").toUpperCase();
                  const isPending = status === "PENDING";
                  const isProcessing = processingId === app.id;
                  const name = app.namaLengkap || app.fullName || "Penyewa";
                  const phone = app.noTelepon || app.phoneNumber || "-";

                  return (
                    <TableRow key={app.id}>
                      {/* NIK */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {app.nik || "-"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">16 Digit KTP</span>
                        </div>
                      </TableCell>

                      {/* Nama */}
                      <TableCell>
                        <span className="font-semibold text-xs text-slate-900 block">
                          {name}
                        </span>
                      </TableCell>

                      {/* Kontak */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="text-slate-800">{app.email}</div>
                          <div className="font-mono text-[11px] text-slate-500">{phone}</div>
                        </div>
                      </TableCell>

                      {/* Waktu */}
                      <TableCell>
                        <span className="font-mono text-slate-600 text-xs">
                          {formatDateTime(app.createdAt)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={
                            status === "APPROVED"
                              ? "approved"
                              : status === "REJECTED"
                              ? "rejected"
                              : "pending"
                          }
                        >
                          {status === "APPROVED"
                            ? "Disetujui"
                            : status === "REJECTED"
                            ? "Ditolak"
                            : "Menunggu Review"}
                        </Badge>
                      </TableCell>

                      {/* Diverifikasi Oleh */}
                      <TableCell>
                        {app.verifiedBy ? (
                          <div className="text-xs">
                            <span className="font-medium text-slate-800 block">
                              {app.verifiedBy.namaLengkap || app.verifiedBy.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {app.verifiedBy.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">-</span>
                        )}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              isLoading={isProcessing}
                              onClick={() => handleAction(app.id, "APPROVE", name)}
                              icon={<Check className="w-3.5 h-3.5" />}
                            >
                              Terima
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              isLoading={isProcessing}
                              onClick={() => handleAction(app.id, "REJECT", name)}
                              icon={<X className="w-3.5 h-3.5" />}
                            >
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            Telah diproses
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
    </div>
  );
}
