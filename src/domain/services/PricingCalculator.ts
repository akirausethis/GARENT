/**
 * @file PricingCalculator.ts
 * @description IPricingCalculator interface and GaragePricingService implementation for GARENT (Garage Rental).
 * Satisfies LSP Pemrogram UK 3 (Structured Programming), UK 4 (OOP), and UK 7 (Code Documentation).
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
import { CompatibilityError, ValidationError } from "../errors";

/**
 * Kontrak abstraksi antarmuka untuk mesin kalkulasi dan validasi bisnis GARENT.
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

/**
 * Layanan murni untuk kalkulasi tarif sewa garasi dan validasi kepatuhan bisnis.
 * Bebas dari ketergantungan basis data (pure business service) agar mudah diuji secara modular (UK 9).
 */
export class GaragePricingService implements IPricingCalculator {
  /**
   * Memvalidasi matriks kompatibilitas kendaraan dengan tipe garasi:
   * - SEPEDA / SEPEDA_MOTOR: HANYA di Garasi SEPEDA (S).
   * - MOBIL (Bensin): HANYA di Garasi MOBIL (C).
   * - MOBIL_LISTRIK: Dapat di Garasi MOBIL (C) atau Garasi MOBIL_LISTRIK (E).
   *
   * @param vehicleType - Tipe kendaraan penyewa.
   * @param garageType - Tipe garasi yang dipilih.
   * @throws {CompatibilityError} Apabila kombinasi tidak sesuai dengan aturan matriks.
   */
  public validateCompatibility(vehicleType: TipeKendaraan, garageType: TipeGarasi): void {
    if (vehicleType === "SEPEDA" || vehicleType === "SEPEDA_MOTOR") {
      if (garageType !== "SEPEDA") {
        throw new CompatibilityError(
          `Kendaraan jenis ${vehicleType} hanya diizinkan menyewa Garasi SEPEDA (S).`
        );
      }
      return;
    }

    if (vehicleType === "MOBIL") {
      if (garageType !== "MOBIL") {
        throw new CompatibilityError(
          `Kendaraan Mobil Bensin hanya diizinkan menyewa Garasi MOBIL (C).`
        );
      }
      return;
    }

    if (vehicleType === "MOBIL_LISTRIK") {
      if (garageType !== "MOBIL" && garageType !== "MOBIL_LISTRIK") {
        throw new CompatibilityError(
          `Mobil Listrik hanya diizinkan menyewa Garasi MOBIL (C) atau Garasi MOBIL_LISTRIK (E).`
        );
      }
      return;
    }

    throw new CompatibilityError(`Tipe kendaraan '${vehicleType}' tidak dikenali oleh sistem.`);
  }

  /**
   * Memvalidasi format dan kelengkapan atribut kendaraan:
   * - Nomor plat wajib diisi untuk SEPEDA_MOTOR, MOBIL, dan MOBIL_LISTRIK.
   * - Kapasitas listrik (kWh) wajib diisi dan bernilai positif (> 0) khusus untuk MOBIL_LISTRIK.
   *
   * @param vehicle - Spesifikasi kendaraan yang dimasukkan penyewa.
   * @throws {ValidationError} Apabila atribut kendaraan tidak memenuhi spesifikasi.
   */
  public validateVehicleFields(vehicle: VehicleInput): void {
    if (!vehicle.merekTipe || vehicle.merekTipe.trim().length === 0) {
      throw new ValidationError("Merek dan tipe kendaraan wajib diisi.");
    }

    if (vehicle.tipeKendaraan !== "SEPEDA") {
      if (!vehicle.nomorPlat || vehicle.nomorPlat.trim().length === 0) {
        throw new ValidationError(
          `Nomor plat wajib diisi untuk kendaraan jenis ${vehicle.tipeKendaraan}.`
        );
      }
    }

    if (vehicle.tipeKendaraan === "MOBIL_LISTRIK") {
      if (
        vehicle.kapasitasListrikKwh === null ||
        vehicle.kapasitasListrikKwh === undefined ||
        vehicle.kapasitasListrikKwh <= 0
      ) {
        throw new ValidationError(
          "Kapasitas baterai (kWh) wajib diisi dan harus bernilai lebih dari 0 untuk Mobil Listrik."
        );
      }
    }
  }

  /**
   * Mengkalkulasi rincian sewa baru:
   * - Durasi sewa harian harus antara 1 s/d 30 hari (Boundary Value Analysis: 1..30).
   * - Tanggal selesai dihitung secara deterministik.
   * - Biaya sewa bulanan = 25 × Harga Sewa Harian.
   * - Biaya sewa harian = Jumlah Hari × Harga Sewa Harian.
   * - Biaya listrik EV (Mandatory Full Charging):
   *   Kapasitas kWh × Harga Listrik per kWh (jika Mobil Listrik berada di Garasi E).
   *   Bernilai 0 jika Mobil Listrik menyewa Garasi C atau kendaraan non-EV.
   *
   * @param params - Parameter lengkap penyewaan garasi baru.
   * @returns Kutipan sewa terstruktur dengan rincian total.
   */
  public calculateNewRental(params: NewRentalParams): RentalQuote {
    const {
      tipeSewa,
      jumlahHari,
      tanggalMulai,
      hargaSewaHarian,
      tipeGarasi,
      hargaListrikPerKwh,
      vehicle,
    } = params;

    // 1. Validasi kompatibilitas dan atribut kendaraan
    this.validateCompatibility(vehicle.tipeKendaraan, tipeGarasi);
    this.validateVehicleFields(vehicle);

    if (hargaSewaHarian <= 0) {
      throw new ValidationError("Harga sewa harian garasi harus lebih dari nol.");
    }

    // 2. Normalisasi tanggal mulai
    const startDate = new Date(tanggalMulai);
    if (isNaN(startDate.getTime())) {
      throw new ValidationError("Tanggal mulai sewa tidak valid.");
    }
    // Set ke awal hari (00:00:00 UTC) untuk perhitungan deterministik
    const normalizedStart = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    );

    let durasiHari = 0;
    let biayaSewa = 0;

    // 3. Hitung biaya sewa dasar dan durasi
    if (tipeSewa === "HARIAN") {
      if (jumlahHari === null || jumlahHari === undefined) {
        throw new ValidationError("Jumlah hari wajib diisi untuk tipe sewa HARIAN.");
      }
      if (jumlahHari < 1 || jumlahHari > 30) {
        throw new ValidationError(
          `Jumlah hari sewa harian harus berada pada rentang 1 hingga 30 hari. Diterima: ${jumlahHari}`
        );
      }
      durasiHari = Math.floor(jumlahHari);
      biayaSewa = durasiHari * hargaSewaHarian;
    } else if (tipeSewa === "BULANAN") {
      durasiHari = 30; // 1 bulan operasional garasi setara 30 hari
      biayaSewa = 25 * hargaSewaHarian; // Rumus baku LSP: 25x tarif harian
    } else {
      throw new ValidationError(`Tipe sewa '${tipeSewa}' tidak didukung.`);
    }

    // 4. Hitung tanggal selesai
    const endDate = new Date(normalizedStart.getTime());
    endDate.setUTCDate(endDate.getUTCDate() + durasiHari);

    // 5. Hitung biaya listrik (Mandatory EV Full Charge jika di garasi MOBIL_LISTRIK)
    let biayaListrik = 0;
    if (vehicle.tipeKendaraan === "MOBIL_LISTRIK" && tipeGarasi === "MOBIL_LISTRIK") {
      const kwh = vehicle.kapasitasListrikKwh ?? 0;
      const rate = hargaListrikPerKwh ?? 0;
      if (rate <= 0) {
        throw new ValidationError("Harga listrik per kWh garasi belum diatur atau tidak valid.");
      }
      biayaListrik = kwh * rate;
    }

    const totalBiaya = biayaSewa + biayaListrik;

    return {
      tanggalMulai: normalizedStart,
      tanggalSelesai: endDate,
      durasiHari,
      hargaSewaHarian,
      biayaSewa,
      biayaListrik,
      totalBiaya,
    };
  }

  /**
   * Mengkalkulasi biaya perpanjangan masa sewa aktif:
   * - Tanggal selesai baru harus strictly lebih besar dari tanggal selesai lama.
   * - Tambahan hari dihitung secara presisi.
   * - Sisa biaya = Tambahan Hari × Harga Sewa Harian (harus > 0).
   *
   * @param params - Parameter perpanjangan sewa.
   * @returns Kutipan perpanjangan dengan tambahan hari dan sisa biaya.
   * @throws {ValidationError} Apabila tanggal selesai baru <= tanggal lama atau harga <= 0.
   */
  public calculateExtension(params: ExtensionParams): ExtensionQuote {
    const { tanggalSelesaiLama, tanggalSelesaiBaru, hargaSewaHarian } = params;

    if (hargaSewaHarian <= 0) {
      throw new ValidationError("Harga sewa harian harus bernilai positif lebih dari nol.");
    }

    const oldEnd = new Date(tanggalSelesaiLama);
    const newEnd = new Date(tanggalSelesaiBaru);

    if (isNaN(oldEnd.getTime()) || isNaN(newEnd.getTime())) {
      throw new ValidationError("Format tanggal perpanjangan tidak valid.");
    }

    const normalizedOldEnd = new Date(
      Date.UTC(oldEnd.getUTCFullYear(), oldEnd.getUTCMonth(), oldEnd.getUTCDate())
    );
    const normalizedNewEnd = new Date(
      Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth(), newEnd.getUTCDate())
    );

    const diffMs = normalizedNewEnd.getTime() - normalizedOldEnd.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      throw new ValidationError(
        "Tanggal selesai perpanjangan harus lebih besar dari tanggal selesai sewa sebelumnya."
      );
    }

    const sisaBiaya = diffDays * hargaSewaHarian;

    return {
      tanggalSelesaiLama: normalizedOldEnd,
      tanggalSelesaiBaru: normalizedNewEnd,
      tambahanHari: diffDays,
      hargaSewaHarian,
      sisaBiaya,
    };
  }
}
