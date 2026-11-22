"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LogIn, Key, ShieldAlert, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Gagal melakukan autentikasi.");
        setIsLoading(false);
        return;
      }

      router.push(json.data.redirectTo);
      router.refresh();
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan atau koneksi server terputus.");
      setIsLoading(false);
    }
  };

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-md space-y-4">
        {/* Logo and Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex w-10 h-10 rounded-lg bg-slate-900 text-white items-center justify-center font-mono font-bold text-base shadow-hairline">
            G
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Masuk ke Sistem GARENT
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Operasional GARENT (Garage Rental) & Pengisian Baterai EV
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader
            title="Autentikasi Pengguna"
            subtitle="Gunakan akun terdaftar Anda untuk masuk"
          />

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert type="error" title="Akses Ditolak">
                  {errorMessage}
                </Alert>
              )}

              <Input
                label="Alamat Email"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/register"
                className="text-xs text-steel-700 hover:text-steel-900 font-medium"
              >
                Belum punya akun? Daftar di sini
              </Link>

              <Button
                type="submit"
                isLoading={isLoading}
                icon={<LogIn className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Masuk
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Fast-Fill Box for Assessor Walkthrough */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>Akun Uji Coba Cepat (Demo LSP Assessor):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillCredentials("admin@garasi.com", "admin123")}
              className="px-2 py-1.5 text-left border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-900 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-steel-700" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">admin@garasi.com</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("budi@gmail.com", "penyewa123")}
              className="px-2 py-1.5 text-left border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-900 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span>Penyewa OK</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">budi@gmail.com</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("siti@gmail.com", "pending123")}
              className="px-2 py-1.5 text-left border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-900 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                <span>Pending</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">siti@gmail.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
