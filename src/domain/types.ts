/**
 * @file types.ts
 * @description Domain types and enumerations for GARENT (Garage Rental).
 * Aligns strictly with LSP Pemrogram UK 2 (Clean Code) and UK 4 (OOP).
 */

export type Role = "ADMIN" | "PENYEWA";

export type StatusVerifikasi = "PENDING" | "APPROVED" | "REJECTED";

export type TipeGarasi = "SEPEDA" | "MOBIL" | "MOBIL_LISTRIK";

export type StatusGarasi = "AVAILABLE" | "USED";

export type TipeKendaraan = "SEPEDA" | "SEPEDA_MOTOR" | "MOBIL" | "MOBIL_LISTRIK";

export type TipeSewa = "HARIAN" | "BULANAN";

/**
 * Parameter masukan untuk registrasi kendaraan baru.
 */
export interface VehicleInput {
  tipeKendaraan: TipeKendaraan;
  nomorPlat?: string | null;
  merekTipe: string;
  kapasitasListrikKwh?: number | null; // legacy alias
  kapasitasMaxKwh?: number | null;     // Kapasitas baterai maksimal (kWh)
  currentBatteryKwh?: number | null;   // Kapasitas baterai saat ini (kWh)
}

/**
 * Parameter masukan untuk kalkulasi penyewaan baru.
 */
export interface NewRentalParams {
  tipeSewa: TipeSewa;
  jumlahHari?: number | null;
  tanggalMulai: Date | string;
  hargaSewaHarian: number;
  tipeGarasi: TipeGarasi;
  hargaListrikPerKwh?: number | null;
  vehicle: VehicleInput;
}

/**
 * Hasil kalkulasi kutipan sewa baru yang transparan.
 */
export interface RentalQuote {
  tanggalMulai: Date;
  tanggalSelesai: Date;
  durasiHari: number;
  hargaSewaHarian: number;
  biayaSewa: number;
  biayaListrik: number;
  totalBiaya: number;
}

/**
 * Parameter masukan untuk perpanjangan sewa garasi.
 */
export interface ExtensionParams {
  tanggalSelesaiLama: Date | string;
  tanggalSelesaiBaru: Date | string;
  hargaSewaHarian: number;
}

/**
 * Hasil kalkulasi perpanjangan sewa garasi.
 */
export interface ExtensionQuote {
  tanggalSelesaiLama: Date;
  tanggalSelesaiBaru: Date;
  tambahanHari: number;
  hargaSewaHarian: number;
  sisaBiaya: number;
}
