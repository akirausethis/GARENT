import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedPenyewa } from "@/lib/auth";
import { uploadPaymentProof } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/api-response";
import { GaragePricingService } from "@/domain/services/GaragePricingService";
import { TipeKendaraan, TipeGarasi, TipeSewa } from "@/domain/types";
import { NotFoundError, ConflictError, ValidationError } from "@/domain/errors";

const pricingService = new GaragePricingService();

export async function POST(req: NextRequest) {
  try {
    const session = await requireApprovedPenyewa();

    const formData = await req.formData();
    const garasiId = formData.get("garasiId") as string;
    const tipeSewa = formData.get("tipeSewa") as TipeSewa;
    const jumlahHariRaw = formData.get("jumlahHari") as string | null;
    const jumlahHari = jumlahHariRaw ? parseInt(jumlahHariRaw, 10) : null;
    const tipeKendaraan = formData.get("tipeKendaraan") as TipeKendaraan;
    const nomorPlat = formData.get("nomorPlat") as string | null;
    const merekTipe = formData.get("merekTipe") as string;
    const kapasitasListrikRaw = formData.get("kapasitasListrikKwh") as string | null;
    const kapasitasListrikKwh = kapasitasListrikRaw ? parseFloat(kapasitasListrikRaw) : null;
    const file = formData.get("buktiBayar") as File | null;

    if (!garasiId) {
      throw new ValidationError("Garasi wajib dipilih.");
    }
    if (!file || !(file instanceof File) || file.size === 0) {
      throw new ValidationError("Bukti pelunasan pembayaran wajib diunggah.");
    }

    // 1. Ambil data garasi untuk memastikan harga dan status awal
    const targetGarage = await prisma.garasi.findUnique({
      where: { id: garasiId },
    });

    if (!targetGarage) {
      throw new NotFoundError("Garasi yang dipilih tidak ditemukan dalam sistem.");
    }

    if (targetGarage.status !== "AVAILABLE") {
      throw new ConflictError(
        "Garasi ini baru saja disewa oleh pengguna lain atau sedang tidak tersedia. Silakan pilih garasi lain."
      );
    }

    // 2. Hitung harga dan validasi aturan domain
    const today = new Date();
    const quote = pricingService.calculateNewRental({
      tipeSewa,
      jumlahHari,
      tanggalMulai: today,
      hargaSewaHarian: Number(targetGarage.hargaSewaHarian),
      tipeGarasi: targetGarage.tipeGarasi as TipeGarasi,
      hargaListrikPerKwh: targetGarage.hargaListrikPerKwh ? Number(targetGarage.hargaListrikPerKwh) : null,
      vehicle: {
        tipeKendaraan,
        nomorPlat,
        merekTipe,
        kapasitasListrikKwh,
      },
    });

    // 3. Unggah bukti pembayaran ke Supabase Storage
    const buktiPelunasanUrl = await uploadPaymentProof(file, "sewa-baru");

    // 4. Jalankan transaksi basis data secara ATOMIK (Prisma Transaction)
    // Memastikan integritas data: Kendaraan terinput, Transaksi tersimpan, dan Status Garasi berubah menjadi USED
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Re-check garasi di dalam transaksi untuk mencegah race condition (double booking)
      const freshGarage = await tx.garasi.findUnique({
        where: { id: garasiId },
      });

      if (!freshGarage || freshGarage.status !== "AVAILABLE") {
        throw new ConflictError(
          "Garasi baru saja disewa oleh pengguna lain saat Anda memproses pembayaran. Silakan pilih garasi lain."
        );
      }

      // a. Simpan data Kendaraan
      const newKendaraan = await tx.kendaraan.create({
        data: {
          tipeKendaraan,
          nomorPlat: tipeKendaraan === "SEPEDA" ? null : (nomorPlat ? nomorPlat.trim().toUpperCase() : null),
          merekTipe: merekTipe.trim(),
          kapasitasListrikKwh: tipeKendaraan === "MOBIL_LISTRIK" ? kapasitasListrikKwh : null,
        },
      });

      // b. Simpan TransaksiSewa
      const newTransaksi = await tx.transaksiSewa.create({
        data: {
          penyewaId: session.userId,
          garasiId: targetGarage.id,
          kendaraanId: newKendaraan.id,
          tipeSewa,
          jumlahHari: tipeSewa === "HARIAN" ? jumlahHari : null,
          tanggalMulai: quote.tanggalMulai,
          tanggalSelesai: quote.tanggalSelesai,
          biayaSewa: quote.biayaSewa,
          biayaListrik: quote.biayaListrik,
          totalBiaya: quote.totalBiaya,
          buktiPelunasanUrl,
        },
        include: {
          garasi: true,
          kendaraan: true,
        },
      });

      // c. Ubah status Garasi menjadi USED
      await tx.garasi.update({
        where: { id: targetGarage.id },
        data: { status: "USED" },
      });

      return newTransaksi;
    });

    return successResponse(
      {
        message: "Penyewaan garasi berhasil diproses dan dikonfirmasi!",
        transaksi: transactionResult,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
