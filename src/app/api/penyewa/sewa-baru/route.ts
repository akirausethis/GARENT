import { NextRequest } from "next/server";
import { requireApprovedPenyewa } from "@/lib/auth";
import { RentalService, VehicleType, RentalType } from "@/services/RentalService";
import { uploadPaymentProof } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/api-response";

const rentalService = new RentalService();

export async function POST(req: NextRequest) {
  try {
    const session = await requireApprovedPenyewa();

    const formData = await req.formData();
    const garageId = formData.get("garageId") as string;
    const vehicleType = formData.get("vehicleType") as VehicleType;
    const plateNumber = (formData.get("plateNumber") as string) || null;
    const vehicleBrandType = formData.get("vehicleBrandType") as string;
    const maxBatteryKwhRaw = formData.get("maxBatteryKwh");
    const currentBatteryKwhRaw = formData.get("currentBatteryKwh");
    const rentalType = formData.get("rentalType") as RentalType;
    const durationDaysRaw = formData.get("durationDays");
    const paymentProofFile = formData.get("paymentProof") as File | null;

    if (!garageId) {
      throw new Error("Unit garasi wajib dipilih.");
    }

    const maxBatteryKwh = maxBatteryKwhRaw ? parseFloat(maxBatteryKwhRaw as string) : null;
    const currentBatteryKwh = currentBatteryKwhRaw ? parseFloat(currentBatteryKwhRaw as string) : null;
    const durationDays = durationDaysRaw ? parseInt(durationDaysRaw as string, 10) : null;

    // 1. Upload bukti pembayaran ke Supabase Storage jika disertakan
    let paymentProofUrl: string | null = null;
    if (paymentProofFile && paymentProofFile instanceof File && paymentProofFile.size > 0) {
      paymentProofUrl = await uploadPaymentProof(paymentProofFile, "sewa");
    }

    // 2. Simpan transaksi sewa baru dan ubah status garasi menjadi 'used'
    const newRental = await rentalService.createRental({
      userId: session.userId,
      garageId,
      vehicle: {
        vehicleType,
        plateNumber,
        vehicleBrandType,
        maxBatteryKwh,
        currentBatteryKwh,
      },
      rentalType,
      durationDays,
      paymentProofUrl,
    });

    return successResponse(
      {
        message: "Penyewaan garasi berhasil dilakukan! Status garasi kini telah terisi (used).",
        rental: newRental,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
