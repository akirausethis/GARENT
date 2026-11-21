import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { TipeGarasi } from "@/domain/types";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "bulan"; // 'bulan' | 'hari' | 'tipe' | 'penyewa'
    const tahun = parseInt(searchParams.get("tahun") || String(new Date().getFullYear()), 10);
    const bulan = searchParams.get("bulan") ? parseInt(searchParams.get("bulan")!, 10) : 11; // 1..12
    const tipeGarasi = searchParams.get("tipeGarasi") as TipeGarasi | null;
    const penyewaId = searchParams.get("penyewaId") || null;

    const where: Prisma.TransaksiSewaWhereInput = {};

    if (mode === "bulan") {
      // Filter transaksi dalam tahun tertentu (1 Jan s/d 31 Des)
      const startOfYear = new Date(Date.UTC(tahun, 0, 1));
      const endOfYear = new Date(Date.UTC(tahun, 11, 31, 23, 59, 59, 999));
      where.createdAt = {
        gte: startOfYear,
        lte: endOfYear,
      };
    } else if (mode === "hari") {
      // Filter transaksi dalam bulan dan tahun tertentu (bulan: 1-based, 1..12)
      const startOfMonth = new Date(Date.UTC(tahun, bulan - 1, 1));
      const endOfMonth = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59, 999));
      where.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (mode === "tipe") {
      if (tipeGarasi) {
        where.garasi = {
          tipeGarasi: tipeGarasi,
        };
      }
    } else if (mode === "penyewa") {
      if (penyewaId) {
        where.penyewaId = penyewaId;
      }
    }

    const transactions = await prisma.transaksiSewa.findMany({
      where,
      include: {
        garasi: true,
        kendaraan: true,
        penyewa: {
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            email: true,
            noTelepon: true,
          },
        },
        perpanjanganList: {
          select: {
            id: true,
            tambahanHari: true,
            sisaBiaya: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Kalkulasi ringkasan operasional deterministik
    let totalBiayaSewa = 0;
    let totalBiayaListrik = 0;
    let totalBiayaPerpanjangan = 0;

    for (const trx of transactions) {
      totalBiayaSewa += Number(trx.biayaSewa);
      totalBiayaListrik += Number(trx.biayaListrik);
      const extTotal = trx.perpanjanganList.reduce((acc, curr) => acc + Number(curr.sisaBiaya), 0);
      totalBiayaPerpanjangan += extTotal;
    }

    const grandTotal = totalBiayaSewa + totalBiayaListrik + totalBiayaPerpanjangan;

    return successResponse({
      mode,
      filters: {
        tahun,
        bulan,
        tipeGarasi,
        penyewaId,
      },
      summary: {
        totalTransaksi: transactions.length,
        totalBiayaSewa,
        totalBiayaListrik,
        totalBiayaPerpanjangan,
        grandTotal,
      },
      transactions,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
