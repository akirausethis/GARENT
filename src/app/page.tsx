import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Zap, Bike, Car, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    if (session.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/penyewa/sewa-baru");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20 flex flex-col justify-center">
        {/* Anti-AI-slop Header */}
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            STANDAR BNSP LSP PEMROGRAM (FR.IA.04A)
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            Sistem Penyewaan Garasi Kendaraan & Pengisian EV Terverifikasi
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Platform operasional penyewaan garasi multi-tipe (Sepeda/Motor, Mobil Bensin, Mobil Listrik).
            Kalkulasi tarif harian dan bulanan 25x akurat, pengisian penuh baterai EV transparan, verifikasi KTP,
            dan pelaporan pendapatan terintegrasi.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg" icon={<ArrowRight className="w-4 h-4" />}>
                Masuk ke Sistem
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Daftar Akun Penyewa
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-8">
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <Bike className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Garasi Sepeda (S001..S999)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Khusus sepeda gowes dan sepeda motor. Tarif transparan harian dan bulanan 25x lipat.
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <Car className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Garasi Mobil (C001..C999)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Garasi mobil bensin dan mobil listrik (tanpa fasilitas charging bay).
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Garasi EV (E001..E999)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fasilitas pengisian daya listrik penuh (Mandatory Full Charging: kWh × Tarif per kWh).
            </p>
          </div>
        </div>

        {/* Operational Security Promise */}
        <div className="mt-6 p-4 bg-slate-100/60 border border-slate-200 rounded-lg flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-steel-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              Prinsip Operasional: Verify Identity → Match Bay → Calculate Transparently → Commit Atomically.
            </span>
            <p className="mt-0.5">
              Setiap transaksi diamankan dengan HTTP-only signed JWT session, hashing bcryptjs, upload bukti bayar Supabase, dan transaksi atomik database.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        GARASIKU &copy; 2026. Uji Sertifikasi BNSP / LSP Pemrogram — FR.IA.04A.
      </footer>
    </div>
  );
}
