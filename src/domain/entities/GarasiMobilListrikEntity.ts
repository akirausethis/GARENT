/**
 * @file GarasiMobilListrikEntity.ts
 * @description Specialized Garage Entity inheriting from GarasiEntity.
 * Satisfies LSP Pemrogram UK 4 (OOP - Inheritance) and UK 7 (Code Documentation).
 */

import { StatusGarasi } from "../types";
import { ValidationError } from "../errors";
import { GarasiEntity } from "./GarasiEntity";

/**
 * Entitas khusus Garasi Mobil Listrik yang mewarisi sifat dasar GarasiEntity
 * dan menambahkan kapabilitas tarif listrik per kWh serta kalkulasi isi daya penuh.
 */
export class GarasiMobilListrikEntity extends GarasiEntity {
  private _hargaListrikPerKwh: number;

  /**
   * Menginisialisasi instans GarasiMobilListrikEntity.
   *
   * @param id - Identifier unik UUID garasi.
   * @param kodeGarasi - Kode identifikasi alfanumerik (misal: E001).
   * @param nomorUrut - Nomor urut sekuensial (1 s/d 999).
   * @param hargaSewaHarian - Tarif dasar sewa harian (harus > 0).
   * @param hargaListrikPerKwh - Tarif pengisian listrik per kWh (harus > 0).
   * @param status - Status ketersediaan garasi (default: AVAILABLE).
   * @throws {ValidationError} Apabila tarif listrik <= 0 atau invarian dasar terlanggar.
   */
  constructor(
    id: string,
    kodeGarasi: string,
    nomorUrut: number,
    hargaSewaHarian: number,
    hargaListrikPerKwh: number,
    status: StatusGarasi = "AVAILABLE"
  ) {
    super(id, kodeGarasi, "MOBIL_LISTRIK", nomorUrut, hargaSewaHarian, status);

    if (hargaListrikPerKwh <= 0) {
      throw new ValidationError("Harga listrik per kWh untuk garasi mobil listrik harus lebih dari nol.");
    }

    this._hargaListrikPerKwh = hargaListrikPerKwh;
  }

  // --- Getter ---

  public getHargaListrikPerKwh(): number {
    return this._hargaListrikPerKwh;
  }

  // --- Setter ---

  public setHargaListrikPerKwh(harga: number): void {
    if (harga <= 0) {
      throw new ValidationError("Harga listrik per kWh harus bernilai positif lebih dari nol.");
    }
    this._hargaListrikPerKwh = harga;
  }

  // --- Domain Logic Method ---

  /**
   * Menghitung total biaya pengisian daya listrik hingga penuh (Mandatory EV Full Charge):
   * Biaya Listrik = Kapasitas Listrik Kendaraan (kWh) × Harga Listrik per kWh.
   *
   * @param kapasitasKwh - Kapasitas baterai mobil listrik dalam kilowatt-hour.
   * @returns Total biaya pengisian penuh listrik.
   * @throws {ValidationError} Apabila kapasitas listrik bernilai <= 0.
   */
  public hitungBiayaIsiPenuh(kapasitasKwh: number): number {
    if (kapasitasKwh <= 0) {
      throw new ValidationError("Kapasitas listrik kendaraan harus bernilai lebih dari nol.");
    }
    return kapasitasKwh * this._hargaListrikPerKwh;
  }
}
