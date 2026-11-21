import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { TipeGarasi, StatusGarasi } from "@/domain/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const tipe = searchParams.get("tipe") as TipeGarasi | null;
    const status = searchParams.get("status") as StatusGarasi | null;

    const whereClause: {
      tipeGarasi?: TipeGarasi;
      status?: StatusGarasi;
    } = {};

    if (tipe) whereClause.tipeGarasi = tipe;
    if (status) whereClause.status = status;

    const garages = await prisma.garasi.findMany({
      where: whereClause,
      orderBy: [{ tipeGarasi: "asc" }, { nomorUrut: "asc" }],
      include: {
        _count: {
          select: { transaksiSewa: true },
        },
      },
    });

    return successResponse({ garages });
  } catch (err) {
    return errorResponse(err);
  }
}
