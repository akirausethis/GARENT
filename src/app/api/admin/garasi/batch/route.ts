import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { GarageCodeGenerator } from "@/domain/services/GarageCodeGenerator";
import { TipeGarasi } from "@/domain/types";
import { ValidationError } from "@/domain/errors";

const batchSchema = z.object({
  tipeGarasi: z.enum(["SEPEDA", "MOBIL", "MOBIL_LISTRIK"]),
  quantity: z
    .number()
    .int("Jumlah garasi harus berupa bilangan bulat.")
    .positive("Jumlah garasi harus minimal 1."),
  hargaSewaHarian: z
    .number()
    .positive("Harga sewa harian harus bernilai lebih dari 0."),
  hargaListrikPerKwh: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data = batchSchema.parse(body);

    if (data.tipeGarasi === "MOBIL_LISTRIK") {
      if (!data.hargaListrikPerKwh || data.hargaListrikPerKwh <= 0) {
        throw new ValidationError(
          "Harga listrik per kWh wajib diisi dan harus lebih dari 0 untuk pembuatan Garasi Mobil Listrik."
        );
      }
    }

    // 1. Ambil nomor urut tertinggi saat ini untuk tipe garasi yang dipilih
    const maxRecord = await prisma.garasi.findFirst({
      where: { tipeGarasi: data.tipeGarasi },
      orderBy: { nomorUrut: "desc" },
      select: { nomorUrut: true },
    });

    const currentMax = maxRecord?.nomorUrut ?? 0;

    // 2. Generate batch kode menggunakan domain generator (memvalidasi <= 999)
    const batch = GarageCodeGenerator.generateBatch(
      data.tipeGarasi as TipeGarasi,
      currentMax,
      data.quantity
    );

    // 3. Simpan seluruh garasi baru ke dalam database secara atomic
    const createdGarages = await prisma.$transaction(
      batch.codes.map((code, index) => {
        const sequenceNumber = batch.startNumber + index;
        return prisma.garasi.create({
          data: {
            kodeGarasi: code,
            tipeGarasi: data.tipeGarasi,
            nomorUrut: sequenceNumber,
            hargaSewaHarian: data.hargaSewaHarian,
            hargaListrikPerKwh: data.tipeGarasi === "MOBIL_LISTRIK" ? data.hargaListrikPerKwh : null,
            status: "AVAILABLE",
          },
        });
      })
    );

    return successResponse(
      {
        message: `Berhasil membuat ${createdGarages.length} unit garasi (${batch.codes[0]} s/d ${batch.codes[batch.codes.length - 1]}).`,
        batchInfo: {
          startCode: batch.codes[0],
          endCode: batch.codes[batch.codes.length - 1],
          count: createdGarages.length,
        },
        garages: createdGarages,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
