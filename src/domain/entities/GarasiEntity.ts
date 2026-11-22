/**
 * @file GarasiEntity.ts
 * @description Encapsulated OOP Entity representing a Garage bay and specialized EV Garage bay.
 * Satisfies LSP Pemrogram UK 4 (OOP - Encapsulation & Inheritance) and UK 7 (Code Documentation).
 */

import { TipeGarasi, StatusGarasi } from "../types";
import { ValidationError } from "../errors";

/**
 * Entitas dasar Garasi yang menerapkan enkapsulasi ketat dengan private fields,
 * getter, setter dengan validasi invarian, serta metode bisnis perhitungan sewa.
 */
export class GarasiEntity {
  private _id: string;
  private _kodeGarasi: string;
  private _tipeGarasi: TipeGarasi;
  private _nomorUrut: number;
  private _hargaSewaHarian: number;
  private _status: StatusGarasi;

  /**
   * Menginisialisasi instans GarasiEntity dengan penegakan batasan nilai invarian.
   *
   * @param id - Identifier unik UUID garasi.
   * @param kodeGarasi - Kode identifikasi alfanumerik (misal: S001, C010).
   * @param tipeGarasi - Kategori garasi (SEPEDA, MOBIL, MOBIL_LISTRIK).
   * @param nomorUrut - Nomor urut sekuensial (1 s/d 999).
   * @param hargaSewaHarian - Tarif sewa harian (harus > 0).
   * @param status - Status ketersediaan garasi (AVAILABLE atau USED).
   * @throws {ValidationError} Apabila nomorUrut di luar jangkauan 1..999 atau harga <= 0.
   */
  constructor(
    id: string,
    kodeGarasi: string,
    tipeGarasi: TipeGarasi,
    nomorUrut: number,
    hargaSewaHarian: number,
    status: StatusGarasi = "AVAILABLE"
  ) {
    if (nomorUrut < 1 || nomorUrut > 999) {
      throw new ValidationError("Nomor urut garasi harus berada pada rentang 1 hingga 999.");
    }
    if (hargaSewaHarian <= 0) {
      throw new ValidationError("Harga sewa harian garasi harus bernilai positif lebih dari nol.");
    }

    this._id = id;
    this._kodeGarasi = kodeGarasi;
    this._tipeGarasi = tipeGarasi;
    this._nomorUrut = nomorUrut;
    this._hargaSewaHarian = hargaSewaHarian;
    this._status = status;
  }

  // --- Getters ---

  public getId(): string {
    return this._id;
  }

  public getKodeGarasi(): string {
    return this._kodeGarasi;
  }

  public getTipeGarasi(): TipeGarasi {
    return this._tipeGarasi;
  }

  public getNomorUrut(): number {
    return this._nomorUrut;
  }

  public getHargaSewaHarian(): number {
    return this._hargaSewaHarian;
  }

  public getStatus(): StatusGarasi {
    return this._status;
  }

  // --- Setters with Invariant Validation ---

  public setHargaSewaHarian(harga: number): void {
    if (harga <= 0) {
      throw new ValidationError("Harga sewa harian garasi harus lebih dari nol.");
    }
    this._hargaSewaHarian = harga;
  }

  public setStatus(status: StatusGarasi): void {
    this._status = status;
  }

  // --- Business Logic Methods ---

  /**
   * Menghitung tarif sewa bulanan garasi berdasarkan rumus baku LSP:
   * Tarif Bulanan = 25 × Harga Sewa Harian.
   *
   * @returns Nilai pasti tarif sewa bulanan.
   */
  public hitungHargaBulanan(): number {
    return 25 * this._hargaSewaHarian;
  }

  /**
   * Memeriksa apakah garasi saat ini siap untuk disewa.
   */
  public isAvailable(): boolean {
    return this._status === "AVAILABLE";
  }
}

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
   * kwhYangDiisi = kapasitasMaxKwh - currentBatteryKwh.
   * Biaya Listrik = kwhYangDiisi × Harga Listrik per kWh.
   *
   * @param kapasitasMaxKwh - Kapasitas baterai mobil listrik maksimal dalam kilowatt-hour (> 0).
   * @param currentBatteryKwh - Kapasitas baterai saat ini (default: 0, 0 <= current <= max).
   * @returns Total biaya pengisian penuh listrik.
   * @throws {ValidationError} Apabila kapasitas baterai melanggar batasan invarian.
   */
  public hitungBiayaIsiPenuh(kapasitasMaxKwh: number, currentBatteryKwh: number = 0): number {
    if (kapasitasMaxKwh <= 0) {
      throw new ValidationError("Kapasitas listrik maksimal kendaraan harus bernilai lebih dari nol.");
    }
    if (currentBatteryKwh < 0) {
      throw new ValidationError("Kapasitas baterai saat ini tidak boleh bernilai negatif.");
    }
    if (currentBatteryKwh > kapasitasMaxKwh) {
      throw new ValidationError("Kapasitas baterai saat ini tidak boleh melebihi kapasitas baterai maksimal.");
    }

    const kwhYangDiisi = kapasitasMaxKwh - currentBatteryKwh;
    return kwhYangDiisi * this._hargaListrikPerKwh;
  }
}
