import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedPenyewa } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { TipeKendaraan, TipeGarasi } from "@/domain/types";
import { ValidationError } from "@/domain/errors";

export async function GET(req: NextRequest) {
  try {
    await requireApprovedPenyewa();

    const { searchParams } = new URL(req.url);
    const tipeKendaraan = searchParams.get("tipeKendaraan") as TipeKendaraan | null;

    if (!tipeKendaraan) {
      throw new ValidationError("Parameter tipeKendaraan wajib disertakan.");
    }

    // Tentukan tipe garasi yang kompatibel sesuai matriks bisnis
    let allowedGarageTypes: TipeGarasi[] = [];
    if (tipeKendaraan === "SEPEDA" || tipeKendaraan === "SEPEDA_MOTOR") {
      allowedGarageTypes = ["SEPEDA"];
    } else if (tipeKendaraan === "MOBIL") {
      allowedGarageTypes = ["MOBIL"];
    } else if (tipeKendaraan === "MOBIL_LISTRIK") {
      allowedGarageTypes = ["MOBIL", "MOBIL_LISTRIK"];
    } else {
      throw new ValidationError(`Tipe kendaraan '${tipeKendaraan}' tidak valid.`);
    }

    const availableGarages = await prisma.garasi.findMany({
      where: {
        status: "AVAILABLE",
        tipeGarasi: { in: allowedGarageTypes },
      },
      orderBy: [{ tipeGarasi: "asc" }, { nomorUrut: "asc" }],
      select: {
        id: true,
        kodeGarasi: true,
        tipeGarasi: true,
        nomorUrut: true,
        hargaSewaHarian: true,
        hargaListrikPerKwh: true,
        status: true,
      },
    });

    return successResponse({ garages: availableGarages });
  } catch (err) {
    return errorResponse(err);
  }
}
