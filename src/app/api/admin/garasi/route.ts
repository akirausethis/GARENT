import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { GarageService, GarageType, GarageStatus } from "@/services/GarageService";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

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
    const typeParam = searchParams.get("type") || searchParams.get("tipe");
    const statusParam = searchParams.get("status");

    const type =
      typeParam && typeParam !== "ALL"
        ? (typeParam.toLowerCase() as GarageType)
        : undefined;
    const status =
      statusParam && statusParam !== "ALL"
        ? (statusParam.toLowerCase() as GarageStatus)
        : undefined;

    const garages = await garageService.getAllGarages({
      type,
      status,
    });

    const formatted = garages.map((g) => ({
      id: g.id,
      code: g.code,
      kodeGarasi: g.code,
      type: g.type.toLowerCase(),
      tipeGarasi: g.type.toUpperCase(),
      sequenceNumber: g.sequenceNumber,
      nomorUrut: g.sequenceNumber,
      dailyPrice: Number(g.dailyPrice),
      hargaSewaHarian: Number(g.dailyPrice),
      kwhPrice: g.kwhPrice ? Number(g.kwhPrice) : null,
      hargaListrikPerKwh: g.kwhPrice ? Number(g.kwhPrice) : null,
      status: g.status.toLowerCase(),
      statusUpper: g.status.toUpperCase(),
      createdAt: g.createdAt.toISOString(),
    }));

    return successResponse({ garages: formatted });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const rawType = (body.tipeGarasi || body.type || "")
      .toString()
      .trim()
      .toLowerCase();

    const data = batchGarasiSchema.parse({
      tipeGarasi: rawType,
      quantity: body.quantity ? Number(body.quantity) : 0,
      dailyPrice: body.dailyPrice ? Number(body.dailyPrice) : (body.hargaSewaHarian ? Number(body.hargaSewaHarian) : 0),
      kwhPrice: body.kwhPrice !== undefined && body.kwhPrice !== null ? (body.kwhPrice ? Number(body.kwhPrice) : null) : (body.hargaListrikPerKwh ? Number(body.hargaListrikPerKwh) : null),
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
