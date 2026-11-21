"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { UserPlus, CheckCircle2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [nik, setNik] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    // Client-side format sanity check
    if (!/^\d{16}$/.test(nik)) {
      setErrorMessage("Nomor KTP (NIK) harus terdiri dari tepat 16 digit angka.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik,
          namaLengkap,
          noTelepon,
          email,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal melakukan pendaftaran.");
        setIsLoading(false);
        return;
      }

      setSuccessInfo(
        "Pendaftaran berhasil! Akun Anda telah tersimpan dengan status PENDING. Operator/Admin garasi akan meninjau dan memverifikasi kesesuaian data NIK/KTP Anda sebelum hak sewa diaktifkan."
      );
      setIsLoading(false);
    } catch {
      setErrorMessage("Terjadi gangguan koneksi pada server saat mendaftar.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex w-10 h-10 rounded-lg bg-slate-900 text-white items-center justify-center font-mono font-bold text-base shadow-hairline">
            G
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Pendaftaran Penyewa Garasi
          </h1>
          <p className="text-xs text-slate-500">
            Lengkapi data identitas KTP/NIK untuk verifikasi akun penyewa
          </p>
        </div>

        <Card>
          <CardHeader
            title="Formulir Identitas Penyewa"
            subtitle="Data NIK dilindungi dan hanya dapat diakses oleh Admin berwenang"
          />

          {successInfo ? (
            <CardContent className="space-y-4 py-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-semibold text-emerald-900">
                  Pendaftaran Telah Diterima
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">{successInfo}</p>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Kembali ke Halaman Login
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-3.5">
                {errorMessage && (
                  <Alert type="error" title="Validasi Gagal">
                    {errorMessage}
                  </Alert>
                )}

                <Input
                  label="Nomor Induk Kependudukan (NIK / KTP)"
                  type="text"
                  required
                  maxLength={16}
                  placeholder="Contoh: 3171012345670001 (16 digit angka)"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  helperText="Wajib 16 digit angka sesuai e-KTP fisik Anda"
                />

                <Input
                  label="Nama Lengkap"
                  type="text"
                  required
                  placeholder="Sesuai kartu identitas"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                />

                <Input
                  label="Nomor Telepon / WhatsApp"
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={noTelepon}
                  onChange={(e) => setNoTelepon(e.target.value)}
                />

                <Input
                  label="Alamat Email (Username)"
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Kata Sandi"
                  type="password"
                  required
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-steel-700 shrink-0" />
                  <span>
                    Akun baru otomatis berstatus <strong>PENDING</strong> sampai diverifikasi Admin.
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/login"
                  className="text-xs text-steel-700 hover:text-steel-900 font-medium"
                >
                  Sudah memiliki akun? Masuk
                </Link>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  icon={<UserPlus className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Daftar Sekarang
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
