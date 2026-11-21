/**
 * @file KendaraanEntity.ts
 * @description Encapsulated OOP Entity representing a Tenant Vehicle.
 * Satisfies LSP Pemrogram UK 4 (OOP - Encapsulation) and UK 7 (Code Documentation).
 */

import { TipeKendaraan } from "../types";
import { ValidationError } from "../errors";

/**
 * Entitas Kendaraan yang memodelkan kendaraan milik penyewa.
 */
export class KendaraanEntity {
  private _id: string;
  private _tipeKendaraan: TipeKendaraan;
  private _nomorPlat: string | null;
  private _merekTipe: string;
  private _kapasitasListrikKwh: number | null;

  /**
   * Menginisialisasi entitas KendaraanEntity dengan validasi nomor plat dan kapasitas kWh.
   *
   * @param id - Identifier unik kendaraan.
   * @param tipeKendaraan - Tipe kendaraan (SEPEDA, SEPEDA_MOTOR, MOBIL, MOBIL_LISTRIK).
   * @param nomorPlat - Plat nomor kendaraan (wajib diisi kecuali untuk SEPEDA).
   * @param merekTipe - Nama merek dan varian tipe kendaraan.
   * @param kapasitasListrikKwh - Kapasitas baterai (wajib > 0 jika MOBIL_LISTRIK).
   * @throws {ValidationError} Apabila plat nomor kosong untuk non-sepeda atau kWh <= 0 untuk EV.
   */
  constructor(
    id: string,
    tipeKendaraan: TipeKendaraan,
    nomorPlat: string | null,
    merekTipe: string,
    kapasitasListrikKwh: number | null = null
  ) {
    if (!merekTipe || merekTipe.trim().length === 0) {
      throw new ValidationError("Merek dan tipe kendaraan wajib diisi.");
    }

    // Plat nomor wajib untuk selain SEPEDA
    if (tipeKendaraan !== "SEPEDA") {
      if (!nomorPlat || nomorPlat.trim().length === 0) {
        throw new ValidationError("Nomor plat kendaraan wajib diisi untuk motor, mobil, dan mobil listrik.");
      }
    }

    // Kapasitas kWh wajib > 0 hanya untuk MOBIL_LISTRIK
    if (tipeKendaraan === "MOBIL_LISTRIK") {
      if (kapasitasListrikKwh === null || kapasitasListrikKwh === undefined || kapasitasListrikKwh <= 0) {
        throw new ValidationError("Kapasitas listrik (kWh) wajib diisi lebih dari 0 untuk mobil listrik.");
      }
    }

    this._id = id;
    this._tipeKendaraan = tipeKendaraan;
    this._nomorPlat = nomorPlat ? nomorPlat.trim().toUpperCase() : null;
    this._merekTipe = merekTipe.trim();
    this._kapasitasListrikKwh = kapasitasListrikKwh;
  }

  public getId(): string {
    return this._id;
  }

  public getTipeKendaraan(): TipeKendaraan {
    return this._tipeKendaraan;
  }

  public getNomorPlat(): string | null {
    return this._nomorPlat;
  }

  public getMerekTipe(): string {
    return this._merekTipe;
  }

  public getKapasitasListrikKwh(): number | null {
    return this._kapasitasListrikKwh;
  }
}
