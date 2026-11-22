import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadBuktiBayar } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * POST /api/admin/sewa/upload-bukti
 * Endpoint bagi Admin untuk mengunggah berkas bukti pelunasan biaya sewa ke Supabase Storage
 * dan memperbarui status bukti bayar transaksi sewa penyewa.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const rentalId = (formData.get("rentalId") || formData.get("transaksiSewaId")) as string;
    const paymentProofFile = (formData.get("paymentProof") || formData.get("buktiBayar") || formData.get("buktiPelunasan")) as File | null;

    if (!rentalId) {
      throw new Error("ID transaksi sewa (rentalId) wajib disertakan.");
    }

    if (!paymentProofFile || !(paymentProofFile instanceof File) || paymentProofFile.size === 0) {
      throw new Error("Berkas gambar bukti pelunasan sewa wajib diunggah.");
    }

    // 1. Pastikan transaksi sewa ada
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
    });

    if (!rental) {
      throw new Error("Data transaksi sewa garasi tidak ditemukan.");
    }

    // 2. Unggah bukti bayar ke Supabase Storage (bucket: bukti-bayar)
    const paymentProofUrl = await uploadBuktiBayar(paymentProofFile, "sewa");

    // 3. Perbarui paymentProofUrl di tabel rentals
    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: {
        paymentProofUrl,
      },
    });

    return successResponse({
      message: "Bukti pelunasan sewa berhasil diunggah dan diverifikasi oleh Admin.",
      paymentProofUrl,
      rental: updatedRental,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
