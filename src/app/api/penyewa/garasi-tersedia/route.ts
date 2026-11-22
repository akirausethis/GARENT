import { NextRequest } from "next/server";
import { requireApprovedPenyewa } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireApprovedPenyewa();

    const { searchParams } = new URL(req.url);
    const tipeKendaraanParam = searchParams.get("tipeKendaraan") || searchParams.get("tipe_kendaraan");
    const typeParam = searchParams.get("type") || searchParams.get("tipe");

    let allowedGarageTypes: string[] | null = null;

    if (tipeKendaraanParam) {
      const vk = tipeKendaraanParam.toUpperCase();
      if (vk === "SEPEDA" || vk === "SEPEDA_MOTOR") {
        allowedGarageTypes = ["sepeda"];
      } else if (vk === "MOBIL") {
        allowedGarageTypes = ["mobil"];
      } else if (vk === "MOBIL_LISTRIK") {
        allowedGarageTypes = ["mobil", "mobil_listrik"];
      }
    } else if (typeParam) {
      const t = typeParam.toLowerCase();
      if (["sepeda", "mobil", "mobil_listrik"].includes(t)) {
        allowedGarageTypes = [t];
      }
    }

    const where: any = {
      status: "available",
    };

    if (allowedGarageTypes) {
      where.type = { in: allowedGarageTypes };
    }

    const garages = await prisma.garage.findMany({
      where,
      orderBy: [
        { type: "asc" },
        { sequenceNumber: "asc" },
      ],
    });

    // Petakan ke format konsisten (mendukung snake_case & camelCase)
    const formatted = garages.map((g) => ({
      id: g.id,
      code: g.code,
      kodeGarasi: g.code,
      type: g.type,
      tipeGarasi: g.type.toUpperCase(),
      sequenceNumber: g.sequenceNumber,
      nomorUrut: g.sequenceNumber,
      dailyPrice: Number(g.dailyPrice),
      hargaSewaHarian: Number(g.dailyPrice),
      kwhPrice: g.kwhPrice ? Number(g.kwhPrice) : null,
      hargaListrikPerKwh: g.kwhPrice ? Number(g.kwhPrice) : null,
      status: g.status,
    }));

    return successResponse({ garages: formatted });
  } catch (err) {
    return errorResponse(err);
  }
}
