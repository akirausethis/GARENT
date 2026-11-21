import { NextRequest } from "next/server";
import { requireApprovedPenyewa } from "@/lib/auth";
import { GarageService, GarageType } from "@/services/GarageService";
import { successResponse, errorResponse } from "@/lib/api-response";

const garageService = new GarageService();

export async function GET(req: NextRequest) {
  try {
    await requireApprovedPenyewa();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as GarageType | null;

    const garages = await garageService.getAvailableGarages(type || undefined);

    return successResponse({ garages });
  } catch (err) {
    return errorResponse(err);
  }
}
