import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GARENT — Sistem Penyewaan Garasi Kendaraan (Garage Rental)",
  description:
    "GARENT (Garage Rental) — Aplikasi operasional penyewaan garasi multi-tipe kendaraan, kalkulasi transparan, verifikasi KTP, dan pelaporan pendapatan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-canvas text-slate-900 selection:bg-steel-100 selection:text-steel-900">
        {children}
      </body>
    </html>
  );
}
