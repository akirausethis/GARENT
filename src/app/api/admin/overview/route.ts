import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * GET /api/admin/overview
 * Mengambil ringkasan data operasional real-time dari database untuk dashboard overview Admin.
 */
export async function GET() {
  try {
    await requireAdmin();

    // 1. Hitung status garasi per tipe (sepeda, mobil, mobil_listrik)
    const garages = await prisma.garage.findMany({
      select: {
        type: true,
        status: true,
      },
    });

    const garageStats = {
      sepeda: { available: 0, used: 0, total: 0 },
      mobil: { available: 0, used: 0, total: 0 },
      mobil_listrik: { available: 0, used: 0, total: 0 },
    };

    garages.forEach((g) => {
      const t = g.type as "sepeda" | "mobil" | "mobil_listrik";
      const s = g.status.toLowerCase() as "available" | "used";
      if (garageStats[t]) {
        garageStats[t].total += 1;
        if (s === "available") garageStats[t].available += 1;
        else if (s === "used") garageStats[t].used += 1;
      }
    });

    // 2. Hitung jumlah pendaftar KTP berstatus PENDING
    const pendingVerificationsCount = await prisma.user.count({
      where: {
        role: "penyewa",
        verificationStatus: "pending",
      },
    });

    // 3. Hitung jumlah transaksi sewa aktif hari ini
    const activeRentalsCount = await prisma.rental.count({
      where: {
        status: { in: ["active", "extended"] },
      },
    });

    // 4. Hitung total penyewa terdaftar
    const totalPenyewaCount = await prisma.user.count({
      where: { role: "penyewa" },
    });

    // 5. Total pendapatan
    const rentals = await prisma.rental.findMany({
      select: {
        totalCost: true,
        extensions: {
          select: { additionalCost: true },
        },
      },
    });

    const totalRevenue = rentals.reduce((acc, r) => {
      const ext = r.extensions.reduce((sub, e) => sub + Number(e.additionalCost), 0);
      return acc + Number(r.totalCost) + ext;
    }, 0);

    return successResponse({
      overview: {
        garageStats,
        pendingVerificationsCount,
        activeRentalsCount,
        totalPenyewaCount,
        totalGaragesCount: garages.length,
        totalRevenue,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
