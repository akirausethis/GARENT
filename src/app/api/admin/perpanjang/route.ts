import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RentalService } from "@/services/RentalService";
import { uploadPaymentProof } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/api-response";

const rentalService = new RentalService();

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const formData = await req.formData();
    const rentalId = formData.get("rentalId") as string;
    const newEndDate = formData.get("newEndDate") as string;
    const paymentProofFile = formData.get("paymentProof") as File | null;

    if (!rentalId) {
      throw new Error("ID transaksi sewa wajib disertakan.");
    }

    if (!newEndDate) {
      throw new Error("Tanggal selesai perpanjangan baru wajib diisi.");
    }

    if (!paymentProofFile || !(paymentProofFile instanceof File) || paymentProofFile.size === 0) {
      throw new Error("Bukti bayar perpanjangan sewa wajib diunggah.");
    }

    // 1. Upload berkas bukti perpanjangan ke Supabase Storage (bucket: payment-proofs)
    const paymentProofUrl = await uploadPaymentProof(paymentProofFile, "extensions");

    // 2. Eksekusi perpanjangan dan update end_date
    const extension = await rentalService.extendRental({
      rentalId,
      adminId: session.userId,
      newEndDate,
      paymentProofUrl,
    });

    return successResponse({
      message: "Masa sewa garasi berhasil diperpanjang!",
      extension,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
