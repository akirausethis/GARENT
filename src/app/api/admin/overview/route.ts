import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // 1. Hitung status garasi per tipe (AVAILABLE vs USED)
    const garageStats = await prisma.garasi.groupBy({
      by: ["tipeGarasi", "status"],
      _count: { id: true },
    });

    // 2. Hitung jumlah pendaftaran penyewa berstatus PENDING
    const pendingVerificationCount = await prisma.user.count({
      where: {
        role: "PENYEWA",
        statusVerifikasi: "PENDING",
      },
    });

    // 3. Hitung jumlah sewa aktif hari ini (tanggalSelesai >= hari ini)
    const activeRentalsCount = await prisma.transaksiSewa.count({
      where: {
        tanggalSelesai: { gte: startOfToday },
        garasi: { status: "USED" },
      },
    });

    // 4. Hitung akumulasi total penerimaan pendapatan
    const revenueAggregate = await prisma.transaksiSewa.aggregate({
      _sum: {
        biayaSewa: true,
        biayaListrik: true,
        totalBiaya: true,
      },
    });

    const extensionRevenue = await prisma.perpanjanganSewa.aggregate({
      _sum: {
        sisaBiaya: true,
      },
    });

    const totalBiayaSewa = Number(revenueAggregate._sum.biayaSewa || 0);
    const totalBiayaListrik = Number(revenueAggregate._sum.biayaListrik || 0);
    const totalBiayaPerpanjangan = Number(extensionRevenue._sum.sisaBiaya || 0);
    const grandTotalRevenue = totalBiayaSewa + totalBiayaListrik + totalBiayaPerpanjangan;

    return successResponse({
      overview: {
        garageStats,
        pendingVerificationCount,
        activeRentalsCount,
        revenue: {
          totalBiayaSewa,
          totalBiayaListrik,
          totalBiayaPerpanjangan,
          grandTotalRevenue,
        },
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
