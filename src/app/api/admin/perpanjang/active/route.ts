import { requireAdmin } from "@/lib/auth";
import { RentalService } from "@/services/RentalService";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const rentalService = new RentalService();

export async function GET() {
  try {
    await requireAdmin();
    const activeRentals = await rentalService.getActiveRentalsForAdmin();

    return successResponse({ activeRentals });
  } catch (err) {
    return errorResponse(err);
  }
}
