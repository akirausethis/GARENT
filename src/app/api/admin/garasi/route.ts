import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { GarageService, GarageType, GarageStatus } from "@/services/GarageService";
import { successResponse, errorResponse } from "@/lib/api-response";

const garageService = new GarageService();

const batchGarasiSchema = z.object({
  tipeGarasi: z.enum(["sepeda", "mobil", "mobil_listrik"]),
  quantity: z
    .number()
    .int("Jumlah garasi harus berupa bilangan bulat.")
    .positive("Jumlah garasi harus minimal 1."),
  dailyPrice: z.number().positive("Harga sewa harian harus bernilai lebih dari 0."),
  kwhPrice: z.number().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as GarageType | null;
    const status = searchParams.get("status") as GarageStatus | null;

    const garages = await garageService.getAllGarages({
      type: type && type !== ("ALL" as any) ? type : undefined,
      status: status && status !== ("ALL" as any) ? status : undefined,
    });

    return successResponse({ garages });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data = batchGarasiSchema.parse({
      tipeGarasi: body.tipeGarasi || body.type,
      quantity: body.quantity ? Number(body.quantity) : 0,
      dailyPrice: body.dailyPrice ? Number(body.dailyPrice) : (body.hargaSewaHarian ? Number(body.hargaSewaHarian) : 0),
      kwhPrice: body.kwhPrice !== undefined ? (body.kwhPrice ? Number(body.kwhPrice) : null) : (body.hargaListrikPerKwh ? Number(body.hargaListrikPerKwh) : null),
    });

    const result = await garageService.bulkCreateGarages({
      type: data.tipeGarasi,
      quantity: data.quantity,
      dailyPrice: data.dailyPrice,
      kwhPrice: data.kwhPrice,
    });

    return successResponse(
      {
        message: `Berhasil membuat ${result.count} unit garasi (${result.startCode} s/d ${result.endCode}).`,
        batchInfo: {
          startCode: result.startCode,
          endCode: result.endCode,
          count: result.count,
        },
        garages: result.garages,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
