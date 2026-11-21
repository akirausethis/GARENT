"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
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
} from "lucide-react";

interface ApplicantRecord {
  id: string;
  nik: string | null;
  namaLengkap: string;
  email: string;
  noTelepon: string;
  statusVerifikasi: "PENDING" | "APPROVED" | "REJECTED";
  verifiedById: string | null;
  createdAt: string;
  verifiedBy?: {
    id: string;
    namaLengkap: string;
    email: string;
  } | null;
}

export default function AdminVerifikasiPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; namaLengkap: string; email: string; role: "ADMIN" } | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Approve or Reject
  const handleAction = async (userId: string, action: "APPROVE" | "REJECT", name: string) => {
    setProcessingId(userId);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/verifikasi", {
        method: "POST",
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

      // Update state locally
      setApplicants((prev) =>
        prev.map((app) =>
          app.id === userId
            ? {
                ...app,
                statusVerifikasi: action === "APPROVE" ? "APPROVED" : "REJECTED",
                verifiedById: currentUser?.id || null,
                verifiedBy: currentUser
                  ? { id: currentUser.id, namaLengkap: currentUser.namaLengkap, email: currentUser.email }
                  : null,
              }
            : app
        )
      );
    } catch {
      setStatusMessage({ type: "error", text: "Terjadi kesalahan koneksi server." });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered applicants
  const filteredApplicants = applicants.filter((app) => {
    if (activeTab !== "ALL" && app.statusVerifikasi !== activeTab) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = app.namaLengkap.toLowerCase().includes(query);
      const matchNik = app.nik?.includes(query);
      const matchEmail = app.email.toLowerCase().includes(query);
      const matchPhone = app.noTelepon.includes(query);
      return matchName || matchNik || matchEmail || matchPhone;
    }
    return true;
  });

  const pendingCount = applicants.filter((a) => a.statusVerifikasi === "PENDING").length;
  const approvedCount = applicants.filter((a) => a.statusVerifikasi === "APPROVED").length;
  const rejectedCount = applicants.filter((a) => a.statusVerifikasi === "REJECTED").length;

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
              <span className="text-slate-900 font-semibold">VERIFIKASI IDENTITAS</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Antrean Verifikasi KTP / NIK Penyewa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Validasi kecocokan nomor identitas KTP 16-digit sebelum menyetujui hak akses penyewaan garasi.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan Antrean
          </Button>
        </div>

        {statusMessage && (
          <Alert type={statusMessage.type} title={statusMessage.type === "success" ? "Verifikasi Berhasil" : "Perhatian"}>
            {statusMessage.text}
          </Alert>
        )}

        {/* Tab Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="inline-flex p-1 bg-slate-200/60 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "PENDING"
                  ? "bg-white text-slate-900 shadow-hairline font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Menunggu ({pendingCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "APPROVED"
                  ? "bg-white text-slate-900 shadow-hairline font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Disetujui ({approvedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("REJECTED")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "REJECTED"
                  ? "bg-white text-slate-900 shadow-hairline font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Ditolak ({rejectedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-hairline font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({applicants.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIK, nama, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-steel-700/20 focus:border-steel-700"
            />
          </div>
        </div>

        {/* Applicants Queue Table */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-slate-700" />
                <span>
                  Daftar Pendaftar — Status: {activeTab === "ALL" ? "Semua Status" : activeTab} ({filteredApplicants.length})
                </span>
              </div>
            }
            subtitle="Klarifikasi data sebelum menyetujui akses penyewaan garasi"
          />

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Memuat antrean verifikasi...
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <UserCheck className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold text-slate-700">Tidak ada pendaftar dalam kategori ini.</p>
                <p className="text-[11px]">Semua pendaftaran telah diproses atau tidak cocok dengan pencarian.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIK (Nomor KTP)</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Kontak (Email / Telp)</TableHead>
                    <TableHead>Waktu Pendaftaran</TableHead>
                    <TableHead>Status Verifikasi</TableHead>
                    <TableHead>Diverifikasi Oleh</TableHead>
                    <TableHead className="text-right">Aksi Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.map((app) => {
                    const isPending = app.statusVerifikasi === "PENDING";
                    const isProcessing = processingId === app.id;

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
                            {app.namaLengkap}
                          </span>
                        </TableCell>

                        {/* Kontak */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="text-slate-800">{app.email}</div>
                            <div className="font-mono text-[11px] text-slate-500">{app.noTelepon}</div>
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
                              app.statusVerifikasi === "APPROVED"
                                ? "approved"
                                : app.statusVerifikasi === "REJECTED"
                                ? "rejected"
                                : "pending"
                            }
                          >
                            {app.statusVerifikasi === "APPROVED"
                              ? "Disetujui"
                              : app.statusVerifikasi === "REJECTED"
                              ? "Ditolak"
                              : "Menunggu Review"}
                          </Badge>
                        </TableCell>

                        {/* Diverifikasi Oleh */}
                        <TableCell>
                          {app.verifiedBy ? (
                            <div className="text-xs">
                              <span className="font-medium text-slate-800 block">
                                {app.verifiedBy.namaLengkap}
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
                                onClick={() => handleAction(app.id, "APPROVE", app.namaLengkap)}
                                icon={<Check className="w-3.5 h-3.5" />}
                              >
                                Terima
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                isLoading={isProcessing}
                                onClick={() => handleAction(app.id, "REJECT", app.namaLengkap)}
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
      </main>
    </div>
  );
}
