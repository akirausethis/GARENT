import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RentalService } from "@/services/RentalService";
import { GarageType } from "@/services/GarageService";
import { successResponse, errorResponse } from "@/lib/api-response";

const rentalService = new RentalService();

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");
    const specificDate = searchParams.get("specificDate") || undefined;
    const garageType = (searchParams.get("garageType") as GarageType) || undefined;
    const userId = searchParams.get("userId") || undefined;

    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const month = monthStr ? parseInt(monthStr, 10) : undefined;

    const report = await rentalService.getRentalReports({
      year,
      month,
      specificDate,
      garageType,
      userId,
    });

    return successResponse({ report });
  } catch (err) {
    return errorResponse(err);
  }
}
