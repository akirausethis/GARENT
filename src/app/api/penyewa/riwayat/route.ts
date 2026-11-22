import { requireApprovedPenyewa } from "@/lib/auth";
import { RentalService } from "@/services/RentalService";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const rentalService = new RentalService();

export async function GET() {
  try {
    const session = await requireApprovedPenyewa();
    const rentals = await rentalService.getUserRentals(session.userId);

    return successResponse({ rentals });
  } catch (err) {
    return errorResponse(err);
  }
}
