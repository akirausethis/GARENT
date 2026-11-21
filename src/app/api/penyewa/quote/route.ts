import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApprovedPenyewa } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { GaragePricingService } from "@/domain/services/GaragePricingService";
import { TipeKendaraan, TipeGarasi, TipeSewa } from "@/domain/types";

const pricingService = new GaragePricingService();

const quoteSchema = z.object({
  tipeSewa: z.enum(["HARIAN", "BULANAN"]),
  jumlahHari: z.number().int().nullable().optional(),
  tanggalMulai: z.string(),
  hargaSewaHarian: z.number().positive("Harga sewa harian harus lebih dari 0."),
  tipeGarasi: z.enum(["SEPEDA", "MOBIL", "MOBIL_LISTRIK"]),
  hargaListrikPerKwh: z.number().nullable().optional(),
  vehicle: z.object({
    tipeKendaraan: z.enum(["SEPEDA", "SEPEDA_MOTOR", "MOBIL", "MOBIL_LISTRIK"]),
    nomorPlat: z.string().nullable().optional(),
    merekTipe: z.string().min(1, "Merek dan tipe kendaraan wajib diisi."),
    kapasitasListrikKwh: z.number().nullable().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await requireApprovedPenyewa();

    const body = await req.json();
    const data = quoteSchema.parse(body);

    const quote = pricingService.calculateNewRental({
      tipeSewa: data.tipeSewa as TipeSewa,
      jumlahHari: data.jumlahHari,
      tanggalMulai: data.tanggalMulai,
      hargaSewaHarian: data.hargaSewaHarian,
      tipeGarasi: data.tipeGarasi as TipeGarasi,
      hargaListrikPerKwh: data.hargaListrikPerKwh,
      vehicle: {
        tipeKendaraan: data.vehicle.tipeKendaraan as TipeKendaraan,
        nomorPlat: data.vehicle.nomorPlat,
        merekTipe: data.vehicle.merekTipe,
        kapasitasListrikKwh: data.vehicle.kapasitasListrikKwh,
      },
    });

    return successResponse({ quote });
  } catch (err) {
    return errorResponse(err);
  }
}
