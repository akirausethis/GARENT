/**
 * @file RentalService.ts
 * @description OOP Service Class handling rental transactions, compatibility rules,
 * pricing formulas, EV charging calculations, rental extensions, and 4-way reports.
 * Satisfies LSP Pemrogram UK 3, UK 4, and UK 7.
 */

import { prisma } from "@/lib/prisma";
import { GarageType } from "./GarageService";

export type VehicleType = "sepeda" | "sepeda_motor" | "mobil" | "mobil_listrik";
export type RentalType = "harian" | "bulanan";
export type RentalStatus = "active" | "completed" | "extended";

export interface VehicleDetailsInput {
  vehicleType: VehicleType;
  plateNumber?: string | null;
  vehicleBrandType: string;
  maxBatteryKwh?: number | null;
  currentBatteryKwh?: number | null;
}

export interface QuoteRentalParams {
  rentalType: RentalType;
  durationDays?: number | null;
  startDate?: Date | string;
  dailyPrice: number;
  garageType: GarageType;
  kwhPrice?: number | null;
  vehicle: VehicleDetailsInput;
}

export interface RentalQuoteResult {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  rentalCost: number;
  electricityCost: number;
  totalCost: number;
}

export interface ExtensionQuoteResult {
  oldEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalCost: number;
}

export interface CreateRentalParams {
  userId: string;
  garageId: string;
  vehicle: VehicleDetailsInput;
  rentalType: RentalType;
  durationDays?: number | null;
  paymentProofUrl?: string | null;
}

export interface ExtendRentalParams {
  rentalId: string;
  adminId: string;
  newEndDate: string; // YYYY-MM-DD
  paymentProofUrl: string;
}

export interface RentalReportFilters {
  year?: number;
  month?: number; // 1 - 12
  specificDate?: string; // YYYY-MM-DD
  garageType?: GarageType;
  userId?: string;
}

/**
 * Service Class untuk memproses bisnis sewa baru, kalkulasi biaya transparan,
 * validasi kesesuaian kendaraan, perpanjangan sewa, dan laporan analitik.
 */
export class RentalService {
  /**
   * Memvalidasi matriks kesesuaian antara tipe kendaraan dengan tipe garasi:
   * - sepeda / sepeda_motor -> HANYA bisa pilih Garasi Sepeda (S).
   * - mobil -> HANYA bisa pilih Garasi Mobil (C).
   * - mobil_listrik -> bisa pilih Garasi Mobil (C) atau Garasi Mobil Listrik (E).
   *
   * @param vehicleType - Kategori tipe kendaraan pemohon.
   * @param garageType - Kategori tipe garasi yang dipilih.
   * @throws {Error} Jika kombinasi dilarang oleh spesifikasi LSP.
   */
  public static validateCompatibility(vehicleType: VehicleType, garageType: GarageType): void {
    if (vehicleType === "sepeda" || vehicleType === "sepeda_motor") {
      if (garageType !== "sepeda") {
        throw new Error(
          `Kendaraan jenis '${vehicleType}' hanya diizinkan menyewa Garasi Sepeda (S).`
        );
      }
      return;
    }

    if (vehicleType === "mobil") {
      if (garageType !== "mobil") {
        throw new Error("Kendaraan Mobil Bensin hanya diizinkan menyewa Garasi Mobil (C).");
      }
      return;
    }

    if (vehicleType === "mobil_listrik") {
      if (garageType !== "mobil" && garageType !== "mobil_listrik") {
        throw new Error(
          "Mobil Listrik hanya diizinkan menyewa Garasi Mobil (C) atau Garasi Mobil Listrik (E)."
        );
      }
      return;
    }

    throw new Error(`Tipe kendaraan '${vehicleType}' tidak dikenali oleh sistem.`);
  }

  /**
   * Memvalidasi kelengkapan atribut fisik dan spesifikasi kendaraan:
   * - Nomor plat wajib diisi untuk sepeda_motor, mobil, dan mobil_listrik.
   * - Khusus mobil_listrik: max_battery_kwh dan current_battery_kwh wajib diisi,
   *   dengan validasi mutlak: current_battery_kwh <= max_battery_kwh.
   *
   * @param vehicle - Detail kendaraan yang didaftarkan.
   * @throws {Error} Jika ada field yang tidak memenuhi syarat bisnis.
   */
  public static validateVehicleDetails(vehicle: VehicleDetailsInput): void {
    if (!vehicle.vehicleBrandType || vehicle.vehicleBrandType.trim().length === 0) {
      throw new Error("Merek dan tipe kendaraan wajib diisi.");
    }

    if (vehicle.vehicleType !== "sepeda") {
      if (!vehicle.plateNumber || vehicle.plateNumber.trim().length === 0) {
        throw new Error(
          `Nomor plat kendaraan wajib diisi untuk tipe '${vehicle.vehicleType}'.`
        );
      }
    }

    if (vehicle.vehicleType === "mobil_listrik") {
      const maxKwh = vehicle.maxBatteryKwh;
      const curKwh = vehicle.currentBatteryKwh;

      if (maxKwh === null || maxKwh === undefined || isNaN(maxKwh) || maxKwh <= 0) {
        throw new Error(
          "Kapasitas baterai maksimum (max_battery_kwh) wajib diisi dan bernilai lebih dari 0 untuk Mobil Listrik."
        );
      }

      if (curKwh === null || curKwh === undefined || isNaN(curKwh) || curKwh < 0) {
        throw new Error(
          "Kapasitas baterai saat ini (current_battery_kwh) wajib diisi dan tidak boleh negatif."
        );
      }

      if (curKwh > maxKwh) {
        throw new Error(
          `Kapasitas baterai saat ini (${curKwh} kWh) tidak boleh melebihi kapasitas maksimum (${maxKwh} kWh).`
        );
      }
    }
  }

  /**
   * Menghitung tanggal mulai, tanggal selesai, dan durasi sewa:
   * - Tanggal Mulai Sewa SELALU otomatis tanggal hari ini (hari pembayaran).
   * - Sewa Harian: jumlah hari antara 1 sampai 29 hari (kurang dari 30 hari).
   * - Sewa Bulanan: maksimal 1 bulan (30 hari). Tanggal selesai mengikuti tanggal yang sama di bulan berikutnya.
   *
   * @param rentalType - 'harian' atau 'bulanan'.
   * @param durationDays - Jumlah hari (khusus harian: 1..29).
   * @param customStartDate - Tanggal mulai (default: tanggal hari ini).
   * @returns Tanggal mulai, tanggal selesai, dan durasi hari.
   */
  public static calculateDatesAndDuration(
    rentalType: RentalType,
    durationDays?: number | null,
    customStartDate?: Date | string
  ): { startDateStr: string; endDateStr: string; duration: number } {
    const now = customStartDate ? new Date(customStartDate) : new Date();
    if (isNaN(now.getTime())) {
      throw new Error("Format tanggal mulai tidak valid.");
    }

    const startYear = now.getUTCFullYear();
    const startMonth = now.getUTCMonth();
    const startDateNum = now.getUTCDate();

    const startUTC = new Date(Date.UTC(startYear, startMonth, startDateNum));
    const startDateStr = startUTC.toISOString().split("T")[0];

    let endUTC: Date;
    let duration: number;

    if (rentalType === "harian") {
      if (durationDays === null || durationDays === undefined || isNaN(durationDays)) {
        throw new Error("Jumlah hari sewa wajib diisi untuk tipe sewa harian.");
      }
      if (durationDays < 1 || durationDays > 29) {
        throw new Error(
          `Sewa harian harus berada pada rentang 1 hingga 29 hari (kurang dari 30 hari). Diterima: ${durationDays}`
        );
      }
      duration = Math.floor(durationDays);
      endUTC = new Date(startUTC.getTime());
      endUTC.setUTCDate(endUTC.getUTCDate() + duration);
    } else if (rentalType === "bulanan") {
      duration = 30; // 1 bulan operasional
      // Tanggal selesai mengikuti tanggal yang sama di bulan berikutnya dengan clamping kalender
      const targetMonth = startMonth + 1;
      const lastDayOfTarget = new Date(Date.UTC(startYear, targetMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(startDateNum, lastDayOfTarget);
      endUTC = new Date(Date.UTC(startYear, targetMonth, clampedDay));
    } else {
      throw new Error(`Tipe sewa '${rentalType}' tidak valid.`);
    }

    const endDateStr = endUTC.toISOString().split("T")[0];

    return {
      startDateStr,
      endDateStr,
      duration,
    };
  }

  /**
   * Menghitung biaya dasar sewa garasi:
   * - Harian: jumlah_hari * daily_price
   * - Bulanan: 25 * daily_price (rumus baku 25x harga sewa harian)
   */
  public static calculateRentalCost(
    rentalType: RentalType,
    durationDays: number,
    dailyPrice: number
  ): number {
    if (dailyPrice <= 0) {
      throw new Error("Tarif harian garasi harus bernilai lebih dari 0.");
    }
    if (rentalType === "harian") {
      return durationDays * dailyPrice;
    }
    if (rentalType === "bulanan") {
      return 25 * dailyPrice;
    }
    throw new Error(`Tipe sewa '${rentalType}' tidak didukung.`);
  }

  /**
   * Menghitung biaya pengisian daya listrik untuk Mobil Listrik:
   * - Jika masuk ke Garasi Mobil Listrik (E): wajib isi penuh.
   *   Biaya listrik = (max_battery_kwh - current_battery_kwh) * kwh_price
   * - Jika masuk ke Garasi Mobil (C): biaya listrik = 0.
   */
  public static calculateElectricityCost(
    vehicleType: VehicleType,
    garageType: GarageType,
    maxBatteryKwh?: number | null,
    currentBatteryKwh?: number | null,
    kwhPrice?: number | null
  ): number {
    if (vehicleType === "mobil_listrik" && garageType === "mobil_listrik") {
      const maxKwh = maxBatteryKwh ?? 0;
      const curKwh = currentBatteryKwh ?? 0;
      const rate = kwhPrice ?? 0;

      if (rate <= 0) {
        throw new Error("Harga listrik per kWh garasi mobil listrik belum diset atau tidak valid.");
      }
      const neededKwh = Math.max(0, maxKwh - curKwh);
      return Math.round(neededKwh * rate);
    }

    // Jika masuk Garasi Mobil (C) atau kendaraan non-EV
    return 0;
  }

  /**
   * Menghasilkan kutipan sewa lengkap dengan rincian biaya sewa dan listrik secara real-time.
   */
  public static quoteNewRental(params: QuoteRentalParams): RentalQuoteResult {
    const {
      rentalType,
      durationDays,
      startDate,
      dailyPrice,
      garageType,
      kwhPrice,
      vehicle,
    } = params;

    // 1. Validasi kompatibilitas & atribut kendaraan
    RentalService.validateCompatibility(vehicle.vehicleType, garageType);
    RentalService.validateVehicleDetails(vehicle);

    // 2. Hitung tanggal dan durasi
    const { startDateStr, endDateStr, duration } = RentalService.calculateDatesAndDuration(
      rentalType,
      durationDays,
      startDate
    );

    // 3. Hitung biaya sewa
    const rentalCost = RentalService.calculateRentalCost(rentalType, duration, dailyPrice);

    // 4. Hitung biaya listrik (Mandatory EV Full Charge di garasi E)
    const electricityCost = RentalService.calculateElectricityCost(
      vehicle.vehicleType,
      garageType,
      vehicle.maxBatteryKwh,
      vehicle.currentBatteryKwh,
      kwhPrice
    );

    const totalCost = rentalCost + electricityCost;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays: duration,
      rentalCost,
      electricityCost,
      totalCost,
    };
  }

  /**
   * Menghitung biaya perpanjangan sewa garasi:
   * - Tanggal selesai baru harus lebih besar dari tanggal selesai lama.
   * - Selisih hari dihitung otomatis.
   * - Sisa biaya tambahan = selisih hari * daily_price (strictly > 0).
   */
  public static calculateExtension(
    oldEndDate: Date | string,
    newEndDate: Date | string,
    dailyPrice: number
  ): ExtensionQuoteResult {
    if (dailyPrice <= 0) {
      throw new Error("Harga sewa harian harus lebih dari 0.");
    }

    const oldDate = new Date(oldEndDate);
    const newDate = new Date(newEndDate);

    if (isNaN(oldDate.getTime()) || isNaN(newDate.getTime())) {
      throw new Error("Format tanggal perpanjangan tidak valid.");
    }

    const oldUTC = new Date(
      Date.UTC(oldDate.getUTCFullYear(), oldDate.getUTCMonth(), oldDate.getUTCDate())
    );
    const newUTC = new Date(
      Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate())
    );

    const diffMs = newUTC.getTime() - oldUTC.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      throw new Error(
        "Tanggal selesai perpanjangan harus lebih besar dari tanggal selesai sewa sebelumnya."
      );
    }

    let additionalCost = 0;
    if (diffDays < 30) {
      // < 30 hari = Harian (tambahan_hari * harga_sewa_harian)
      additionalCost = diffDays * dailyPrice;
    } else if (diffDays === 30) {
      // = 30 hari = 1 Bulan (25 * harga_sewa_harian)
      additionalCost = 25 * dailyPrice;
    } else {
      // > 30 hari = dihitung per bulan (Math.ceil(tambahan_hari / 30) * 25 * dailyPrice)
      const months = Math.ceil(diffDays / 30);
      additionalCost = months * 25 * dailyPrice;
    }

    return {
      oldEndDate: oldUTC.toISOString().split("T")[0],
      newEndDate: newUTC.toISOString().split("T")[0],
      additionalDays: diffDays,
      additionalCost,
    };
  }

  /**
   * Mengeksekusi transaksi sewa baru:
   * - Memvalidasi kepatuhan bisnis.
   * - Menyimpan data transaksi ke tabel 'rentals'.
   * - Mengubah status garasi menjadi 'used' di dalam transaksi atomik.
   */
  public async createRental(params: CreateRentalParams) {
    const { userId, garageId, vehicle, rentalType, durationDays, paymentProofUrl } = params;

    // 1. Periksa pengguna (harus berstatus approved)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("Pengguna tidak ditemukan.");
    }
    if (user.role !== "penyewa") {
      throw new Error("Hanya akun dengan peran Penyewa yang dapat melakukan penyewaan.");
    }
    if (user.verificationStatus !== "approved") {
      throw new Error(
        "Akun Anda belum disetujui oleh Admin. Anda belum dapat melakukan penyewaan garasi."
      );
    }

    // 2. Ambil data garasi (harus berstatus available)
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
    });
    if (!garage) {
      throw new Error("Unit garasi yang dipilih tidak ditemukan.");
    }
    if (garage.status !== "available") {
      throw new Error(`Garasi ${garage.code} saat ini sedang terpakai (used) atau tidak tersedia.`);
    }

    // 3. Kalkulasi kutipan biaya
    const quote = RentalService.quoteNewRental({
      rentalType,
      durationDays,
      dailyPrice: Number(garage.dailyPrice),
      garageType: garage.type as GarageType,
      kwhPrice: garage.kwhPrice ? Number(garage.kwhPrice) : null,
      vehicle,
    });

    // 4. Eksekusi database transaksi atomik
    return prisma.$transaction(async (tx) => {
      // Simpan transaksi sewa
      const newRental = await tx.rental.create({
        data: {
          userId,
          garageId,
          vehicleType: vehicle.vehicleType,
          plateNumber: vehicle.vehicleType === "sepeda" ? null : vehicle.plateNumber,
          vehicleBrandType: vehicle.vehicleBrandType,
          maxBatteryKwh: vehicle.maxBatteryKwh ?? null,
          currentBatteryKwh: vehicle.currentBatteryKwh ?? null,
          rentalType,
          durationDays: quote.durationDays,
          startDate: new Date(quote.startDate),
          endDate: new Date(quote.endDate),
          rentalCost: quote.rentalCost,
          electricityCost: quote.electricityCost,
          totalCost: quote.totalCost,
          paymentProofUrl: paymentProofUrl || null,
          status: "active",
        },
      });

      // Update status garasi menjadi used
      await tx.garage.update({
        where: { id: garageId },
        data: { status: "used" },
      });

      return newRental;
    });
  }

  /**
   * Menampilkan daftar garasi yang sedang aktif disewa hari ini untuk menu perpanjangan Admin.
   */
  public async getActiveRentalsForAdmin() {
    return prisma.rental.findMany({
      where: {
        status: { in: ["active", "extended"] },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            nik: true,
          },
        },
        garage: true,
      },
      orderBy: { endDate: "asc" },
    });
  }

  /**
   * Memproses perpanjangan masa sewa aktif oleh Admin:
   * - Menghitung sisa biaya perpanjangan.
   * - Menyimpan ke tabel 'rental_extensions'.
   * - Mengubah tanggal selesai sewa (end_date) di tabel 'rentals'.
   */
  public async extendRental(params: ExtendRentalParams) {
    const { rentalId, adminId, newEndDate, paymentProofUrl } = params;

    // 1. Verifikasi Admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Hanya Administrator yang memiliki wewenang memperpanjang sewa garasi.");
    }

    // 2. Ambil rental aktif beserta tarif garasi
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { garage: true },
    });
    if (!rental) {
      throw new Error("Data sewa garasi tidak ditemukan.");
    }

    // 3. Kalkulasi perpanjangan
    const extQuote = RentalService.calculateExtension(
      rental.endDate,
      newEndDate,
      Number(rental.garage.dailyPrice)
    );

    // 4. Eksekusi transaksi atomik
    return prisma.$transaction(async (tx) => {
      // Simpan riwayat perpanjangan
      const extension = await tx.rentalExtension.create({
        data: {
          rentalId,
          adminId,
          oldEndDate: new Date(extQuote.oldEndDate),
          newEndDate: new Date(extQuote.newEndDate),
          additionalDays: extQuote.additionalDays,
          additionalCost: extQuote.additionalCost,
          paymentProofUrl,
        },
      });

      // Update tanggal selesai di tabel rentals
      await tx.rental.update({
        where: { id: rentalId },
        data: {
          endDate: new Date(extQuote.newEndDate),
          status: "extended",
        },
      });

      return extension;
    });
  }

  /**
   * Menampilkan laporan sewa garasi dengan 4 filter lengkap:
   * 1) Per bulan dalam tahun tertentu (year + month)
   * 2) Per hari dalam bulan tertentu (specificDate: YYYY-MM-DD)
   * 3) Per Tipe Garasi (garageType)
   * 4) Per Penyewa (userId)
   */
  public async getRentalReports(filters: RentalReportFilters) {
    const where: any = {};

    // 1 & 2: Filter tanggal
    if (filters.specificDate) {
      const d = new Date(filters.specificDate);
      where.startDate = d;
    } else if (filters.year && filters.month) {
      const start = new Date(Date.UTC(filters.year, filters.month - 1, 1));
      const end = new Date(Date.UTC(filters.year, filters.month, 1));
      where.startDate = {
        gte: start,
        lt: end,
      };
    } else if (filters.year) {
      const start = new Date(Date.UTC(filters.year, 0, 1));
      const end = new Date(Date.UTC(filters.year + 1, 0, 1));
      where.startDate = {
        gte: start,
        lt: end,
      };
    }

    // 3: Filter Tipe Garasi
    if (filters.garageType && filters.garageType !== ("ALL" as any)) {
      where.garage = {
        type: filters.garageType,
      };
    }

    // 4: Filter Per Penyewa
    if (filters.userId && filters.userId !== "ALL") {
      where.userId = filters.userId;
    }

    const records = await prisma.rental.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            nik: true,
          },
        },
        garage: true,
        extensions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Kalkulasi agregat keuangan
    const totalRentalCost = records.reduce((acc, r) => acc + Number(r.rentalCost), 0);
    const totalElectricityCost = records.reduce((acc, r) => acc + Number(r.electricityCost), 0);
    const totalBaseRevenue = records.reduce((acc, r) => acc + Number(r.totalCost), 0);

    const totalExtensionRevenue = records.reduce((acc, r) => {
      const extTotal = r.extensions.reduce((sub, e) => sub + Number(e.additionalCost), 0);
      return acc + extTotal;
    }, 0);

    const grandTotalRevenue = totalBaseRevenue + totalExtensionRevenue;

    return {
      filters,
      totalCount: records.length,
      revenue: {
        totalRentalCost,
        totalElectricityCost,
        totalBaseRevenue,
        totalExtensionRevenue,
        grandTotalRevenue,
      },
      records,
    };
  }

  /**
   * Mengambil riwayat sewa milik penyewa tertentu.
   */
  public async getUserRentals(userId: string) {
    return prisma.rental.findMany({
      where: { userId },
      include: {
        garage: true,
        extensions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
