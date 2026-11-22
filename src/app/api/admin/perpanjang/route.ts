import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadBuktiBayar } from "@/lib/supabase";
import { GaragePricingService } from "@/domain/services/GaragePricingService";
import { successResponse, errorResponse } from "@/lib/api-response";

const pricingService = new GaragePricingService();

/**
 * GET /api/admin/perpanjang
 * Mengambil seluruh sewa garasi yang sedang aktif (garasi USED) untuk antrean perpanjangan Admin.
 */
export async function GET() {
  try {
    await requireAdmin();

    const activeRentals = await prisma.rental.findMany({
      where: {
        status: { in: ["active", "extended"] },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            nik: true,
          },
        },
        garage: true,
        extensions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const formatted = activeRentals.map((r) => ({
      id: r.id,
      transaksiSewaId: r.id,
      userId: r.userId,
      garageId: r.garageId,
      vehicleType: r.vehicleType,
      tipeKendaraan: r.vehicleType.toUpperCase(),
      plateNumber: r.plateNumber,
      nomorPlat: r.plateNumber,
      vehicleBrandType: r.vehicleBrandType,
      merekTipe: r.vehicleBrandType,
      maxBatteryKwh: r.maxBatteryKwh ? Number(r.maxBatteryKwh) : null,
      currentBatteryKwh: r.currentBatteryKwh ? Number(r.currentBatteryKwh) : null,
      rentalType: r.rentalType,
      tipeSewa: r.rentalType.toUpperCase(),
      durationDays: r.durationDays,
      jumlahHari: r.durationDays,
      startDate: r.startDate.toISOString().split("T")[0],
      tanggalMulai: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      tanggalSelesai: r.endDate.toISOString().split("T")[0],
      rentalCost: Number(r.rentalCost),
      biayaSewa: Number(r.rentalCost),
      electricityCost: Number(r.electricityCost),
      biayaListrik: Number(r.electricityCost),
      totalCost: Number(r.totalCost),
      totalBiaya: Number(r.totalCost),
      paymentProofUrl: r.paymentProofUrl,
      buktiPelunasanUrl: r.paymentProofUrl,
      status: r.status,
      user: r.user,
      penyewa: {
        id: r.user.id,
        namaLengkap: r.user.fullName,
        fullName: r.user.fullName,
        email: r.user.email,
        noTelepon: r.user.phoneNumber,
        phoneNumber: r.user.phoneNumber,
        nik: r.user.nik,
      },
      garage: {
        id: r.garage.id,
        code: r.garage.code,
        kodeGarasi: r.garage.code,
        type: r.garage.type,
        tipeGarasi: r.garage.type.toUpperCase(),
        dailyPrice: Number(r.garage.dailyPrice),
        hargaSewaHarian: Number(r.garage.dailyPrice),
        kwhPrice: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        hargaListrikPerKwh: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        status: r.garage.status,
      },
      garasi: {
        id: r.garage.id,
        code: r.garage.code,
        kodeGarasi: r.garage.code,
        type: r.garage.type,
        tipeGarasi: r.garage.type.toUpperCase(),
        dailyPrice: Number(r.garage.dailyPrice),
        hargaSewaHarian: Number(r.garage.dailyPrice),
        kwhPrice: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        hargaListrikPerKwh: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        status: r.garage.status,
      },
      extensions: r.extensions,
      perpanjangan: r.extensions.map((ext) => ({
        id: ext.id,
        transaksiSewaId: ext.rentalId,
        tanggalSelesaiLama: ext.oldEndDate.toISOString().split("T")[0],
        tanggalSelesaiBaru: ext.newEndDate.toISOString().split("T")[0],
        tambahanHari: ext.additionalDays,
        sisaBiaya: Number(ext.additionalCost),
        buktiBayarUrl: ext.paymentProofUrl,
        createdAt: ext.createdAt.toISOString(),
      })),
    }));

    return successResponse({
      activeRentals: formatted,
      rentals: formatted,
      sewaAktif: formatted,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/admin/perpanjang
 * Memproses perpanjangan masa sewa aktif oleh Admin.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const formData = await req.formData();
    const rentalId = (formData.get("rentalId") || formData.get("transaksiSewaId")) as string;
    const newEndDateStr = (formData.get("newEndDate") || formData.get("tanggalSelesaiBaru")) as string;
    const paymentProofFile = (formData.get("paymentProof") || formData.get("buktiBayar")) as File | null;

    if (!rentalId) {
      throw new Error("ID transaksi sewa (rentalId / transaksiSewaId) wajib disertakan.");
    }
    if (!newEndDateStr) {
      throw new Error("Tanggal selesai perpanjangan baru (newEndDate / tanggalSelesaiBaru) wajib diisi.");
    }
    if (!paymentProofFile || !(paymentProofFile instanceof File) || paymentProofFile.size === 0) {
      throw new Error("Bukti bayar perpanjangan sewa wajib diunggah.");
    }

    // 1. Ambil data rental aktif
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { garage: true },
    });

    if (!rental) {
      throw new Error("Data transaksi sewa garasi tidak ditemukan.");
    }

    // 2. Kalkulasi perpanjangan via OOP Domain Service
    const oldEndDateStr = rental.endDate.toISOString().split("T")[0];
    const extQuote = pricingService.calculateExtension({
      tanggalSelesaiLama: oldEndDateStr,
      tanggalSelesaiBaru: newEndDateStr,
      hargaSewaHarian: Number(rental.garage.dailyPrice),
    });

    if (extQuote.tambahanHari <= 0 || extQuote.sisaBiaya <= 0) {
      throw new Error(
        "Tanggal selesai perpanjangan baru harus lebih besar dari tanggal selesai sewa saat ini (sisa biaya harus bernilai positif > 0)."
      );
    }

    // 3. Upload berkas bukti perpanjangan ke Supabase Storage (bucket: bukti-bayar / payment-proofs)
    const paymentProofUrl = await uploadBuktiBayar(paymentProofFile, "perpanjangan");

    // 4. Eksekusi database transaksi atomik
    const result = await prisma.$transaction(async (tx) => {
      // Simpan riwayat perpanjangan
      const extension = await tx.rentalExtension.create({
        data: {
          rentalId,
          adminId: session.userId,
          oldEndDate: extQuote.tanggalSelesaiLama,
          newEndDate: extQuote.tanggalSelesaiBaru,
          additionalDays: extQuote.tambahanHari,
          additionalCost: extQuote.sisaBiaya,
          paymentProofUrl,
        },
      });

      // Update transaksi sewa: tanggal selesai baru, status = extended, dan tambahkan total biaya
      const updatedRental = await tx.rental.update({
        where: { id: rentalId },
        data: {
          endDate: extQuote.tanggalSelesaiBaru,
          status: "extended",
          totalCost: Number(rental.totalCost) + extQuote.sisaBiaya,
        },
      });

      return { extension, updatedRental };
    });

    return successResponse({
      message: `Masa sewa garasi ${rental.garage.code} berhasil diperpanjang (+${extQuote.tambahanHari} hari)!`,
      extension: {
        id: result.extension.id,
        transaksiSewaId: result.extension.rentalId,
        oldEndDate: result.extension.oldEndDate.toISOString().split("T")[0],
        newEndDate: result.extension.newEndDate.toISOString().split("T")[0],
        additionalDays: result.extension.additionalDays,
        additionalCost: Number(result.extension.additionalCost),
        paymentProofUrl: result.extension.paymentProofUrl,
      },
      updatedRental: result.updatedRental,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
