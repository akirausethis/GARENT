import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAdmin();

    const activeRentals = await prisma.transaksiSewa.findMany({
      where: {
        garasi: {
          status: "USED",
        },
      },
      include: {
        garasi: true,
        kendaraan: true,
        penyewa: {
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            email: true,
            noTelepon: true,
          },
        },
        perpanjanganList: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { tanggalSelesai: "asc" },
    });

    return successResponse({ activeRentals });
  } catch (err) {
    return errorResponse(err);
  }
}
