import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const tahunStr = searchParams.get("tahun") || searchParams.get("year");
    const bulanStr = searchParams.get("bulan") || searchParams.get("month");
    const specificDate = searchParams.get("specificDate") || searchParams.get("tanggal");
    const tipeGarasiParam = searchParams.get("tipeGarasi") || searchParams.get("garageType");
    const penyewaIdParam = searchParams.get("penyewaId") || searchParams.get("userId");

    const tahun = tahunStr ? parseInt(tahunStr, 10) : new Date().getFullYear();
    const bulan = bulanStr ? parseInt(bulanStr, 10) : undefined;

    const where: any = {};

    // Mode 1: per_bulan
    if (mode === "per_bulan" || (!mode && tahun && !bulan && !specificDate)) {
      const start = new Date(Date.UTC(tahun, 0, 1));
      const end = new Date(Date.UTC(tahun + 1, 0, 1));
      where.startDate = { gte: start, lt: end };
    }
    // Mode 2: per_hari
    else if (mode === "per_hari" || (bulan && !specificDate)) {
      const m = bulan || 1;
      const start = new Date(Date.UTC(tahun, m - 1, 1));
      const end = new Date(Date.UTC(tahun, m, 1));
      where.startDate = { gte: start, lt: end };
    } else if (specificDate) {
      where.startDate = new Date(specificDate);
    }

    // Mode 3: per_tipe
    if (tipeGarasiParam && tipeGarasiParam !== "ALL") {
      where.garage = {
        type: tipeGarasiParam.toLowerCase(),
      };
    }

    // Mode 4: per_penyewa
    if (penyewaIdParam && penyewaIdParam !== "ALL") {
      where.userId = penyewaIdParam;
    }

    const records = await prisma.rental.findMany({
      where,
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
      orderBy: { startDate: "desc" },
    });

    // Kalkulasi Agregat Finansial
    const totalTransaksi = records.length;
    const totalBiayaSewa = records.reduce((acc, r) => acc + Number(r.rentalCost), 0);
    const totalBiayaListrik = records.reduce((acc, r) => acc + Number(r.electricityCost), 0);
    const totalBase = records.reduce((acc, r) => acc + Number(r.totalCost), 0);
    const totalPerpanjangan = records.reduce((acc, r) => {
      const ext = r.extensions.reduce((sub, e) => sub + Number(e.additionalCost), 0);
      return acc + ext;
    }, 0);
    const grandTotal = totalBase + totalPerpanjangan;

    // Format Baris Transaksi
    const formattedRecords = records.map((r) => {
      const extTotal = r.extensions.reduce((acc, e) => acc + Number(e.additionalCost), 0);
      return {
        id: r.id,
        transaksiSewaId: r.id,
        tanggalTransaksi: r.createdAt.toISOString().split("T")[0],
        createdAt: r.createdAt.toISOString(),
        penyewa: {
          id: r.user.id,
          namaLengkap: r.user.fullName,
          fullName: r.user.fullName,
          email: r.user.email,
          noTelepon: r.user.phoneNumber,
          phoneNumber: r.user.phoneNumber,
          nik: r.user.nik,
        },
        user: r.user,
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
        },
        garage: r.garage,
        kendaraan: {
          tipeKendaraan: r.vehicleType.toUpperCase(),
          vehicleType: r.vehicleType,
          nomorPlat: r.plateNumber,
          plateNumber: r.plateNumber,
          merekTipe: r.vehicleBrandType,
          vehicleBrandType: r.vehicleBrandType,
        },
        durasiHari: r.durationDays,
        durationDays: r.durationDays,
        tipeSewa: r.rentalType.toUpperCase(),
        rentalType: r.rentalType,
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
        totalBiayaDenganPerpanjangan: Number(r.totalCost) + extTotal,
        buktiPelunasanUrl: r.paymentProofUrl,
        paymentProofUrl: r.paymentProofUrl,
        status: r.status,
        extensions: r.extensions,
        perpanjangan: r.extensions,
      };
    });

    // Breakdown bulanan (Jan–Des) jika mode per_bulan
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const monthIdx = i; // 0..11
      const monthRecords = records.filter((r) => r.startDate.getUTCMonth() === monthIdx);
      const count = monthRecords.length;
      const sewa = monthRecords.reduce((acc, r) => acc + Number(r.rentalCost), 0);
      const listrik = monthRecords.reduce((acc, r) => acc + Number(r.electricityCost), 0);
      const total = monthRecords.reduce((acc, r) => {
        const ext = r.extensions.reduce((sub, e) => sub + Number(e.additionalCost), 0);
        return acc + Number(r.totalCost) + ext;
      }, 0);
      return {
        bulan: monthIdx + 1,
        namaBulan: new Date(2026, monthIdx, 1).toLocaleDateString("id-ID", { month: "long" }),
        totalTransaksi: count,
        totalBiayaSewa: sewa,
        totalBiayaListrik: listrik,
        grandTotal: total,
      };
    });

    const report = {
      mode: mode || "per_bulan",
      tahun,
      bulan,
      tipeGarasi: tipeGarasiParam || "ALL",
      penyewaId: penyewaIdParam || "ALL",
      totalTransaksi,
      totalBiayaSewa,
      totalBiayaListrik,
      totalBiayaPerpanjangan: totalPerpanjangan,
      grandTotal,
      revenue: {
        totalRentalCost: totalBiayaSewa,
        totalElectricityCost: totalBiayaListrik,
        totalBaseRevenue: totalBase,
        totalExtensionRevenue: totalPerpanjangan,
        grandTotalRevenue: grandTotal,
      },
      totalCount: totalTransaksi,
      records: formattedRecords,
      transaksi: formattedRecords,
      monthlyBreakdown,
    };

    return successResponse({ report });
  } catch (err) {
    return errorResponse(err);
  }
}
