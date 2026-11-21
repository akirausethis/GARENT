/**
 * @file GarageService.ts
 * @description OOP Service Class for managing Garage inventory and sequential auto-ID generation.
 * Satisfies LSP Pemrogram UK 3 (Structured Programming), UK 4 (OOP), and UK 7 (Documentation).
 */

import { prisma } from "@/lib/prisma";

export type GarageType = "sepeda" | "mobil" | "mobil_listrik";
export type GarageStatus = "available" | "used";

export interface CreateGarageBatchParams {
  type: GarageType;
  quantity: number;
  dailyPrice: number;
  kwhPrice?: number | null;
}

export interface GeneratedBatchResult {
  codes: string[];
  startNumber: number;
  endNumber: number;
}

/**
 * Service Class berorientasi objek untuk mengelola siklus hidup unit garasi,
 * penomoran otomatis sekuensial (S001, C001, E001), dan batasan kapasitas 999 unit.
 */
export class GarageService {
  public static readonly MAX_UNITS_PER_TYPE = 999;

  private static readonly PREFIX_MAP: Record<GarageType, string> = {
    sepeda: "S",
    mobil: "C",
    mobil_listrik: "E",
  };

  /**
   * Mengembalikan prefix kode alfanumerik berdasarkan tipe garasi.
   *
   * @param type - Tipe garasi ('sepeda', 'mobil', 'mobil_listrik').
   * @returns Huruf awalan kode ('S', 'C', atau 'E').
   */
  public static getPrefix(type: GarageType): string {
    const prefix = this.PREFIX_MAP[type];
    if (!prefix) {
      throw new Error(`Tipe garasi '${type}' tidak valid.`);
    }
    return prefix;
  }

  /**
   * Memformat nomor urut numerik menjadi kode garasi 3-digit dengan zero-padding.
   * Contoh: 1 -> S001, 10 -> C010, 999 -> E999.
   *
   * @param type - Tipe garasi.
   * @param sequenceNumber - Nomor urut 1..999.
   * @returns String kode unik garasi (e.g. 'C010').
   * @throws {Error} Jika sequenceNumber < 1 atau > 999.
   */
  public static generateGarageCode(type: GarageType, sequenceNumber: number): string {
    if (sequenceNumber < 1 || sequenceNumber > this.MAX_UNITS_PER_TYPE) {
      throw new Error(
        `Nomor urut garasi harus berada pada rentang 1 hingga ${this.MAX_UNITS_PER_TYPE}. Diterima: ${sequenceNumber}`
      );
    }
    const prefix = this.getPrefix(type);
    const padded = String(sequenceNumber).padStart(3, "0");
    return `${prefix}${padded}`;
  }

  /**
   * Menghasilkan batch kode garasi incremental secara berurutan.
   *
   * @param type - Tipe kategori garasi.
   * @param currentMax - Nomor urut maksimum yang sudah ada di database (0 jika kosong).
   * @param quantity - Jumlah garasi yang ingin dibuat.
   * @returns Kumpulan kode garasi baru dan batas nomornya.
   * @throws {Error} Jika kuantitas <= 0 atau target melebihi 999 unit.
   */
  public static generateBatchCodes(
    type: GarageType,
    currentMax: number,
    quantity: number
  ): GeneratedBatchResult {
    if (quantity <= 0) {
      throw new Error("Jumlah garasi yang dibuat harus minimal 1 unit.");
    }
    if (currentMax < 0) {
      throw new Error("Nomor urut maksimum saat ini tidak boleh bernilai negatif.");
    }

    const targetMax = currentMax + quantity;
    if (targetMax > this.MAX_UNITS_PER_TYPE) {
      throw new Error(
        `Jumlah total garasi tipe ${type} tidak boleh melebihi batas maksimum ${this.MAX_UNITS_PER_TYPE}. Saat ini terdapat ${currentMax} garasi, penambahan ${quantity} akan menghasilkan total ${targetMax}.`
      );
    }

    const startNumber = currentMax + 1;
    const endNumber = targetMax;
    const codes: string[] = [];

    for (let num = startNumber; num <= endNumber; num++) {
      codes.push(this.generateGarageCode(type, num));
    }

    return {
      codes,
      startNumber,
      endNumber,
    };
  }

  /**
   * Mengambil nomor urut terakhir di database untuk tipe garasi tertentu.
   *
   * @param type - Tipe kategori garasi.
   * @returns Nomor urut tertinggi saat ini (0 jika belum ada).
   */
  public async getLastSequenceNumber(type: GarageType): Promise<number> {
    const lastGarage = await prisma.garage.findFirst({
      where: { type },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });
    return lastGarage?.sequenceNumber ?? 0;
  }

  /**
   * Membuat garasi secara berkelompok (Bulk Create) di dalam transaksi database atomik.
   *
   * @param params - Parameter pembuatan garasi massal.
   * @returns Daftar unit garasi yang berhasil dibuat.
   */
  public async bulkCreateGarages(params: CreateGarageBatchParams) {
    const { type, quantity, dailyPrice, kwhPrice } = params;

    if (dailyPrice <= 0) {
      throw new Error("Harga sewa harian harus bernilai lebih dari 0.");
    }

    if (type === "mobil_listrik" && (!kwhPrice || kwhPrice <= 0)) {
      throw new Error("Harga listrik per kWh wajib diisi dan lebih dari 0 untuk garasi mobil listrik.");
    }

    // 1. Dapatkan sequence number terakhir
    const currentMax = await this.getLastSequenceNumber(type);

    // 2. Generate kode garasi incremental
    const batch = GarageService.generateBatchCodes(type, currentMax, quantity);

    // 3. Simpan ke database menggunakan transaksi atomik
    const created = await prisma.$transaction(
      batch.codes.map((code, idx) => {
        const sequenceNumber = batch.startNumber + idx;
        return prisma.garage.create({
          data: {
            code,
            type,
            sequenceNumber,
            dailyPrice,
            kwhPrice: type === "mobil_listrik" ? kwhPrice : null,
            status: "available",
          },
        });
      })
    );

    return {
      count: created.length,
      startCode: batch.codes[0],
      endCode: batch.codes[batch.codes.length - 1],
      garages: created,
    };
  }

  /**
   * Mengambil daftar garasi yang berstatus available pada hari ini.
   *
   * @param type - Opsi filter berdasarkan tipe garasi.
   * @returns Daftar garasi yang siap disewa.
   */
  public async getAvailableGarages(type?: GarageType) {
    return prisma.garage.findMany({
      where: {
        status: "available",
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: "asc" }, { sequenceNumber: "asc" }],
    });
  }

  /**
   * Mengambil seluruh daftar garasi dengan opsi filter tipe dan status.
   */
  public async getAllGarages(filters?: { type?: GarageType; status?: GarageStatus }) {
    return prisma.garage.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: [{ type: "asc" }, { sequenceNumber: "asc" }],
    });
  }
}
