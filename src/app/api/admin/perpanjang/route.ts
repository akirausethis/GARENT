import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { uploadPaymentProof } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/api-response";
import { GaragePricingService } from "@/domain/services/GaragePricingService";
import { NotFoundError, ValidationError } from "@/domain/errors";

const pricingService = new GaragePricingService();

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();

    const formData = await req.formData();
    const transaksiSewaId = formData.get("transaksiSewaId") as string;
    const tanggalSelesaiBaru = formData.get("tanggalSelesaiBaru") as string;
    const file = formData.get("buktiBayar") as File | null;

    if (!transaksiSewaId) {
      throw new ValidationError("ID transaksi sewa garasi wajib dipilih.");
    }
    if (!tanggalSelesaiBaru) {
      throw new ValidationError("Tanggal selesai perpanjangan baru wajib diisi.");
    }
    if (!file || !(file instanceof File) || file.size === 0) {
      throw new ValidationError("Bukti pembayaran perpanjangan wajib diunggah.");
    }

    // 1. Ambil data transaksi sewa yang sedang aktif
    const transaksi = await prisma.transaksiSewa.findUnique({
      where: { id: transaksiSewaId },
      include: { garasi: true },
    });

    if (!transaksi) {
      throw new NotFoundError("Data transaksi sewa tidak ditemukan.");
    }

    // 2. Hitung penambahan hari dan sisa biaya perpanjangan secara deterministik
    const quote = pricingService.calculateExtension({
      tanggalSelesaiLama: transaksi.tanggalSelesai,
      tanggalSelesaiBaru,
      hargaSewaHarian: Number(transaksi.garasi.hargaSewaHarian),
    });

    // 3. Unggah bukti pembayaran perpanjangan ke Supabase Storage
    const buktiBayarUrl = await uploadPaymentProof(file, "perpanjangan");

    // 4. Eksekusi transaksi ATOMIK di database
    const result = await prisma.$transaction(async (tx) => {
      // a. Simpan record PerpanjanganSewa baru
      const extensionRecord = await tx.perpanjanganSewa.create({
        data: {
          transaksiSewaId: transaksi.id,
          adminId: adminSession.userId,
          tanggalSelesaiLama: quote.tanggalSelesaiLama,
          tanggalSelesaiBaru: quote.tanggalSelesaiBaru,
          tambahanHari: quote.tambahanHari,
          sisaBiaya: quote.sisaBiaya,
          buktiBayarUrl,
        },
      });

      // b. Update tanggal selesai dan akumulasi total biaya pada TransaksiSewa
      const newTotalBiaya = Number(transaksi.totalBiaya) + quote.sisaBiaya;
      const updatedTransaksi = await tx.transaksiSewa.update({
        where: { id: transaksi.id },
        data: {
          tanggalSelesai: quote.tanggalSelesaiBaru,
          totalBiaya: newTotalBiaya,
        },
        include: {
          garasi: true,
          kendaraan: true,
        },
      });

      return {
        extension: extensionRecord,
        transaksi: updatedTransaksi,
      };
    });

    return successResponse(
      {
        message: `Masa sewa garasi ${transaksi.garasi.kodeGarasi} berhasil diperpanjang sebanyak ${quote.tambahanHari} hari.`,
        data: result,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
