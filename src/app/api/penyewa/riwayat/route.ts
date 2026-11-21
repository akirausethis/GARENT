import { prisma } from "@/lib/prisma";
import { requireApprovedPenyewa } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await requireApprovedPenyewa();

    const rentals = await prisma.transaksiSewa.findMany({
      where: { penyewaId: session.userId },
      include: {
        garasi: true,
        kendaraan: true,
        perpanjanganList: {
          include: {
            admin: {
              select: {
                id: true,
                namaLengkap: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ rentals });
  } catch (err) {
    return errorResponse(err);
  }
}
