import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApprovedPenyewa } from "@/lib/auth";
import { RentalService } from "@/services/RentalService";
import { successResponse, errorResponse } from "@/lib/api-response";

const quoteSchema = z.object({
  rentalType: z.enum(["harian", "bulanan"]),
  durationDays: z.number().nullable().optional(),
  startDate: z.string().optional(),
  dailyPrice: z.number().positive(),
  garageType: z.enum(["sepeda", "mobil", "mobil_listrik"]),
  kwhPrice: z.number().nullable().optional(),
  vehicle: z.object({
    vehicleType: z.enum(["sepeda", "sepeda_motor", "mobil", "mobil_listrik"]),
    plateNumber: z.string().nullable().optional(),
    vehicleBrandType: z.string(),
    maxBatteryKwh: z.number().nullable().optional(),
    currentBatteryKwh: z.number().nullable().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await requireApprovedPenyewa();

    const body = await req.json();
    const data = quoteSchema.parse(body);

    const quote = RentalService.quoteNewRental(data);

    return successResponse({ quote });
  } catch (err) {
    return errorResponse(err);
  }
}
