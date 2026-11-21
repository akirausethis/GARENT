/**
 * @file IPricingCalculator.ts
 * @description Interface abstraction for Garage Rental Pricing Engine.
 * Satisfies LSP Pemrogram UK 4 (OOP - Abstraction/Polymorphism) and UK 7 (Code Documentation).
 */

import {
  TipeKendaraan,
  TipeGarasi,
  VehicleInput,
  NewRentalParams,
  RentalQuote,
  ExtensionParams,
  ExtensionQuote,
} from "../types";

/**
 * Kontrak abstraksi antarmuka untuk mesin kalkulasi dan validasi bisnis GARASIKU.
 */
export interface IPricingCalculator {
  /**
   * Memvalidasi kecocokan antara tipe kendaraan dengan tipe garasi.
   *
   * @param vehicleType - Kategori kendaraan penyewa.
   * @param garageType - Kategori garasi yang dipilih.
   * @throws {CompatibilityError} Apabila kombinasi kendaraan dan garasi dilarang.
   */
  validateCompatibility(vehicleType: TipeKendaraan, garageType: TipeGarasi): void;

  /**
   * Memvalidasi kelengkapan atribut fisik kendaraan.
   *
   * @param vehicle - Spesifikasi kendaraan yang didaftarkan.
   * @throws {ValidationError} Apabila plat nomor atau kWh melanggar aturan.
   */
  validateVehicleFields(vehicle: VehicleInput): void;

  /**
   * Mengkalkulasi kutipan sewa baru dengan rincian biaya transparan.
   *
   * @param params - Parameter penyewaan baru.
   * @returns Kutipan sewa lengkap dengan tanggal jatuh tempo dan rincian biaya.
   */
  calculateNewRental(params: NewRentalParams): RentalQuote;

  /**
   * Mengkalkulasi perpanjangan masa sewa aktif.
   *
   * @param params - Parameter perpanjangan.
   * @returns Kutipan perpanjangan dengan tambahan hari dan sisa biaya positif.
   */
  calculateExtension(params: ExtensionParams): ExtensionQuote;
}
