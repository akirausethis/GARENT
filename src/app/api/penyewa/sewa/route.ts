import { NextRequest } from "next/server";
import { requireApprovedPenyewa } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadBuktiBayar } from "@/lib/supabase";
import { GaragePricingService } from "@/domain/services/GaragePricingService";
import { GarasiEntity, GarasiMobilListrikEntity } from "@/domain/entities/GarasiEntity";
import { TipeKendaraan, TipeGarasi, TipeSewa } from "@/domain/types";
import { successResponse, errorResponse } from "@/lib/api-response";

const pricingService = new GaragePricingService();

/**
 * GET /api/penyewa/sewa
 * Mengambil seluruh riwayat transaksi sewa garasi milik penyewa yang sedang login.
 */
export async function GET() {
  try {
    const session = await requireApprovedPenyewa();

    const rentals = await prisma.rental.findMany({
      where: { userId: session.userId },
      include: {
        garage: true,
        extensions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = rentals.map((r) => ({
      id: r.id,
      penyewaId: r.userId,
      garasiId: r.garageId,
      garasi: {
        id: r.garage.id,
        kodeGarasi: r.garage.code,
        code: r.garage.code,
        tipeGarasi: r.garage.type.toUpperCase(),
        type: r.garage.type,
        hargaSewaHarian: Number(r.garage.dailyPrice),
        dailyPrice: Number(r.garage.dailyPrice),
        hargaListrikPerKwh: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        kwhPrice: r.garage.kwhPrice ? Number(r.garage.kwhPrice) : null,
        status: r.garage.status.toUpperCase(),
      },
      kendaraan: {
        tipeKendaraan: r.vehicleType.toUpperCase(),
        vehicleType: r.vehicleType,
        nomorPlat: r.plateNumber,
        plateNumber: r.plateNumber,
        merekTipe: r.vehicleBrandType,
        vehicleBrandType: r.vehicleBrandType,
        kapasitasListrikKwh: r.maxBatteryKwh ? Number(r.maxBatteryKwh) : null,
        maxBatteryKwh: r.maxBatteryKwh ? Number(r.maxBatteryKwh) : null,
        currentBatteryKwh: r.currentBatteryKwh ? Number(r.currentBatteryKwh) : null,
      },
      tipeSewa: r.rentalType.toUpperCase(),
      rentalType: r.rentalType,
      jumlahHari: r.durationDays,
      durationDays: r.durationDays,
      tanggalMulai: r.startDate.toISOString().split("T")[0],
      startDate: r.startDate.toISOString().split("T")[0],
      tanggalSelesai: r.endDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      biayaSewa: Number(r.rentalCost),
      rentalCost: Number(r.rentalCost),
      biayaListrik: Number(r.electricityCost),
      electricityCost: Number(r.electricityCost),
      totalBiaya: Number(r.totalCost),
      totalCost: Number(r.totalCost),
      buktiPelunasanUrl: r.paymentProofUrl,
      paymentProofUrl: r.paymentProofUrl,
      status: r.status,
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
      extensions: r.extensions,
      createdAt: r.createdAt.toISOString(),
    }));

    return successResponse({ sewa: formatted, rentals: formatted });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/penyewa/sewa
 * Membuat transaksi sewa garasi baru dengan validasi domain OOP,
 * upload bukti pelunasan ke Supabase Storage, kalkulasi tarif transparan,
 * dan update status garasi menjadi 'USED' di dalam transaksi atomik.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApprovedPenyewa();

    const formData = await req.formData();
    const garasiId = (formData.get("garasiId") || formData.get("garageId")) as string;
    const tipeKendaraanRaw = (formData.get("tipeKendaraan") || formData.get("vehicleType")) as string;
    const nomorPlat = ((formData.get("nomorPlat") || formData.get("plateNumber")) as string) || null;
    const merekTipe = (formData.get("merekTipe") || formData.get("vehicleBrandType")) as string;
    const kapasitasListrikRaw = formData.get("kapasitasListrikKwh") || formData.get("maxBatteryKwh");
    const currentBatteryRaw = formData.get("currentBatteryKwh");
    const tipeSewaRaw = (formData.get("tipeSewa") || formData.get("rentalType")) as string;
    const jumlahHariRaw = formData.get("jumlahHari") || formData.get("durationDays");
    const buktiPelunasan = (formData.get("buktiPelunasan") || formData.get("paymentProof")) as File | null;

    if (!garasiId) {
      throw new Error("Unit garasi wajib dipilih.");
    }
    if (!tipeKendaraanRaw) {
      throw new Error("Tipe kendaraan wajib dipilih.");
    }
    if (!merekTipe || merekTipe.trim().length === 0) {
      throw new Error("Merek dan tipe kendaraan wajib diisi.");
    }

    // Normalisasi enum ke format Domain
    const tipeKendaraan = tipeKendaraanRaw.toUpperCase() as TipeKendaraan;
    const tipeSewa = tipeSewaRaw ? (tipeSewaRaw.toUpperCase() as TipeSewa) : "HARIAN";
    const kapasitasListrikKwh = kapasitasListrikRaw ? parseFloat(kapasitasListrikRaw as string) : null;
    const currentBatteryKwh = currentBatteryRaw ? parseFloat(currentBatteryRaw as string) : null;
    const jumlahHari = jumlahHariRaw ? parseInt(jumlahHariRaw as string, 10) : null;

    // 1. Validasi Spesifikasi Kendaraan via OOP Domain Service
    pricingService.validateVehicleFields({
      tipeKendaraan,
      nomorPlat,
      merekTipe,
      kapasitasListrikKwh,
      kapasitasMaxKwh: kapasitasListrikKwh,
      currentBatteryKwh,
    });

    // 2. Ambil data garasi dari database
    const garage = await prisma.garage.findUnique({
      where: { id: garasiId },
    });

    if (!garage) {
      throw new Error("Unit garasi yang dipilih tidak ditemukan dalam sistem.");
    }

    if (garage.status.toLowerCase() !== "available") {
      throw new Error(
        `Garasi ${garage.code} saat ini sedang terpakai (status: ${garage.status}). Silakan pilih garasi lain yang tersedia.`
      );
    }

    const tipeGarasi = garage.type.toUpperCase() as TipeGarasi;

    // 3. Validasi Kompatibilitas Kendaraan vs Garasi
    pricingService.validateCompatibility(tipeKendaraan, tipeGarasi);

    // 4. Instansiasi Entitas Domain OOP untuk Memvalidasi Invarian (UK 4)
    let garasiEntity: GarasiEntity;
    if (tipeGarasi === "MOBIL_LISTRIK") {
      if (!garage.kwhPrice || Number(garage.kwhPrice) <= 0) {
        throw new Error("Garasi Mobil Listrik wajib memiliki tarif listrik per kWh yang valid.");
      }
      garasiEntity = new GarasiMobilListrikEntity(
        garage.id,
        garage.code,
        garage.sequenceNumber,
        Number(garage.dailyPrice),
        Number(garage.kwhPrice),
        "AVAILABLE"
      );
    } else {
      garasiEntity = new GarasiEntity(
        garage.id,
        garage.code,
        tipeGarasi,
        garage.sequenceNumber,
        Number(garage.dailyPrice),
        "AVAILABLE"
      );
    }

    // 5. Server-Enforced Tanggal Mulai Hari Ini
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // 6. Jalankan Kalkulasi Tarif Sewa & Full Charge EV via Domain Service
    const quote = pricingService.calculateNewRental({
      tipeSewa,
      jumlahHari: tipeSewa === "HARIAN" ? jumlahHari || 1 : null,
      tanggalMulai: todayStr,
      hargaSewaHarian: garasiEntity.getHargaSewaHarian(),
      tipeGarasi,
      hargaListrikPerKwh:
        garasiEntity instanceof GarasiMobilListrikEntity
          ? garasiEntity.getHargaListrikPerKwh()
          : null,
      vehicle: {
        tipeKendaraan,
        nomorPlat,
        merekTipe,
        kapasitasListrikKwh,
        kapasitasMaxKwh: kapasitasListrikKwh,
        currentBatteryKwh,
      },
    });

    // 7. Jika ada berkas bukti pelunasan yang disertakan, unggah ke Supabase Storage
    let buktiPelunasanUrl: string | null = null;
    if (buktiPelunasan && buktiPelunasan instanceof File && buktiPelunasan.size > 0) {
      buktiPelunasanUrl = await uploadBuktiBayar(buktiPelunasan, "sewa");
    }

    // 8. Eksekusi Transaksi Atomik Database (Prisma $transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Pastikan status garasi masih AVAILABLE (concurrency protection)
      const currentGarage = await tx.garage.findUnique({
        where: { id: garasiId },
      });
      if (!currentGarage || currentGarage.status.toLowerCase() !== "available") {
        throw new Error(`Garasi ${garage.code} baru saja disewa oleh pengguna lain.`);
      }

      // Buat transaksi sewa
      const newRental = await tx.rental.create({
        data: {
          userId: session.userId,
          garageId: garasiId,
          vehicleType: tipeKendaraan.toLowerCase(),
          plateNumber: tipeKendaraan === "SEPEDA" ? null : nomorPlat?.trim().toUpperCase(),
          vehicleBrandType: merekTipe.trim(),
          maxBatteryKwh: kapasitasListrikKwh,
          currentBatteryKwh: currentBatteryKwh,
          rentalType: tipeSewa.toLowerCase(),
          durationDays: quote.durasiHari,
          startDate: quote.tanggalMulai,
          endDate: quote.tanggalSelesai,
          rentalCost: quote.biayaSewa,
          electricityCost: quote.biayaListrik,
          totalCost: quote.totalBiaya,
          paymentProofUrl: buktiPelunasanUrl,
          status: "active",
        },
        include: {
          garage: true,
        },
      });

      // Update status garasi menjadi USED
      await tx.garage.update({
        where: { id: garasiId },
        data: { status: "used" },
      });

      return newRental;
    });

    return successResponse(
      {
        message: `Penyewaan unit garasi ${garage.code} berhasil diproses! Status garasi kini telah terisi (USED).`,
        transaksi: {
          id: result.id,
          garasiId: result.garageId,
          kodeGarasi: result.garage.code,
          tipeSewa: result.rentalType.toUpperCase(),
          durasiHari: result.durationDays,
          tanggalMulai: result.startDate.toISOString().split("T")[0],
          tanggalSelesai: result.endDate.toISOString().split("T")[0],
          biayaSewa: Number(result.rentalCost),
          biayaListrik: Number(result.electricityCost),
          totalBiaya: Number(result.totalCost),
          buktiPelunasanUrl: result.paymentProofUrl,
          status: result.status,
        },
        rental: result,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
