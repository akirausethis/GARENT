/**
 * @file GarageCodeGenerator.ts
 * @description Sequential Auto-Increment Code Generator for Garages (S001..S999, C001..C999, E001..E999).
 * Satisfies LSP Pemrogram UK 3 (Structured Programming) and UK 7 (Code Documentation).
 */

import { TipeGarasi } from "../types";
import { CapacityExceededError, ValidationError } from "../errors";

export interface GeneratedCodeBatch {
  codes: string[];
  startNumber: number;
  endNumber: number;
}

/**
 * Service untuk memproduksi kode unik sekuensial garasi sesuai spesifikasi LSP:
 * - SEPEDA: S001 s/d S999
 * - MOBIL: C001 s/d C999 (misal garasi ke-10 adalah C010)
 * - MOBIL_LISTRIK: E001 s/d E999
 */
export class GarageCodeGenerator {
  public static readonly MAX_GARAGE_COUNT = 999;

  private static readonly PREFIX_MAP: Record<TipeGarasi, string> = {
    SEPEDA: "S",
    MOBIL: "C",
    MOBIL_LISTRIK: "E",
  };

  /**
   * Menghasilkan prefix huruf sesuai kategori garasi.
   *
   * @param type - Tipe kategori garasi.
   * @returns Huruf awalan (S, C, atau E).
   */
  public static getPrefix(type: TipeGarasi): string {
    const prefix = this.PREFIX_MAP[type];
    if (!prefix) {
      throw new ValidationError(`Tipe garasi '${type}' tidak dikenal.`);
    }
    return prefix;
  }

  /**
   * Memformat nomor urut numerik menjadi kode 3 digit dengan zero-padding.
   * (Contoh: 1 -> S001, 10 -> C010, 999 -> E999).
   *
   * @param type - Tipe kategori garasi.
   * @param sequenceNumber - Nomor urut (1..999).
   * @returns String kode unik garasi.
   * @throws {ValidationError} Apabila nomor urut di luar batas 1..999.
   */
  public static formatCode(type: TipeGarasi, sequenceNumber: number): string {
    if (sequenceNumber < 1 || sequenceNumber > this.MAX_GARAGE_COUNT) {
      throw new ValidationError(
        `Nomor urut garasi harus berada pada rentang 1 hingga ${this.MAX_GARAGE_COUNT}. Diterima: ${sequenceNumber}`
      );
    }
    const prefix = this.getPrefix(type);
    const padded = String(sequenceNumber).padStart(3, "0");
    return `${prefix}${padded}`;
  }

  /**
   * Menghasilkan sekelompok kode garasi baru secara berurutan (batch generation).
   *
   * @param type - Tipe kategori garasi (SEPEDA, MOBIL, MOBIL_LISTRIK).
   * @param currentMax - Nomor urut tertinggi yang sudah ada di basis data (0 jika belum ada).
   * @param quantity - Jumlah garasi yang ingin dibuat dalam batch ini.
   * @returns Kumpulan kode garasi baru beserta batas rentang nomornya.
   * @throws {ValidationError} Apabila kuantitas <= 0 atau currentMax < 0.
   * @throws {CapacityExceededError} Apabila currentMax + quantity > 999.
   */
  public static generateBatch(
    type: TipeGarasi,
    currentMax: number,
    quantity: number
  ): GeneratedCodeBatch {
    if (quantity <= 0) {
      throw new ValidationError("Jumlah garasi yang dibuat harus bernilai minimal 1.");
    }
    if (currentMax < 0) {
      throw new ValidationError("Nomor urut maksimum saat ini tidak boleh bernilai negatif.");
    }

    const targetMax = currentMax + quantity;
    if (targetMax > this.MAX_GARAGE_COUNT) {
      throw new CapacityExceededError(
        `Jumlah total garasi tipe ${type} tidak boleh melebihi batas maksimum ${this.MAX_GARAGE_COUNT}. Saat ini terdapat ${currentMax} garasi, penambahan ${quantity} akan menghasilkan total ${targetMax}.`
      );
    }

    const startNumber = currentMax + 1;
    const endNumber = targetMax;
    const codes: string[] = [];

    for (let num = startNumber; num <= endNumber; num++) {
      codes.push(this.formatCode(type, num));
    }

    return {
      codes,
      startNumber,
      endNumber,
    };
  }
}
