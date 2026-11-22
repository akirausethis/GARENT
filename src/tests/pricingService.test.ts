/**
 * @file pricingService.test.ts
 * @description Unit tests for GaragePricingService verifying all LSP business rules.
 * Uses AAA (Arrange-Act-Assert) pattern and Boundary Value Analysis (BVA).
 * Satisfies LSP Pemrogram UK 9 (Testing) covering UT-07, UT-08, UT-09, UT-10, UT-11, and UT-12.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GaragePricingService } from "../domain/services/GaragePricingService";
import { CompatibilityError, ValidationError } from "../domain/errors";
import { VehicleInput, NewRentalParams } from "../domain/types";

describe("GaragePricingService (LSP UK 9: UT-07 through UT-12)", () => {
  let service: GaragePricingService;

  beforeEach(() => {
    service = new GaragePricingService();
  });

  // ============================================================================
  // [UT-07] Vehicle-to-Garage Compatibility Matrix
  // ============================================================================
  describe("[UT-07] Vehicle-to-Garage Compatibility Matrix", () => {
    it("should allow SEPEDA only in SEPEDA (S) garage, rejecting in MOBIL (C) or MOBIL_LISTRIK (E)", () => {
      // SEPEDA in S -> Allowed
      expect(() => service.validateCompatibility("SEPEDA", "SEPEDA")).not.toThrow();

      // SEPEDA in C or E -> Rejected
      expect(() => service.validateCompatibility("SEPEDA", "MOBIL")).toThrow(CompatibilityError);
      expect(() => service.validateCompatibility("SEPEDA", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow SEPEDA_MOTOR only in SEPEDA (S) garage, rejecting in MOBIL (C) or MOBIL_LISTRIK (E)", () => {
      // SEPEDA_MOTOR in S -> Allowed
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "SEPEDA")).not.toThrow();

      // SEPEDA_MOTOR in C or E -> Rejected
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "MOBIL")).toThrow(
        CompatibilityError
      );
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow MOBIL (bensin) only in MOBIL (C) garage, rejecting in SEPEDA (S) or MOBIL_LISTRIK (E)", () => {
      // MOBIL in C -> Allowed
      expect(() => service.validateCompatibility("MOBIL", "MOBIL")).not.toThrow();

      // MOBIL in S or E -> Rejected
      expect(() => service.validateCompatibility("MOBIL", "SEPEDA")).toThrow(CompatibilityError);
      expect(() => service.validateCompatibility("MOBIL", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow MOBIL_LISTRIK in either MOBIL (C) or MOBIL_LISTRIK (E) garage, rejecting in SEPEDA (S)", () => {
      // MOBIL_LISTRIK in C or E -> Allowed
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "MOBIL")).not.toThrow();
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "MOBIL_LISTRIK")).not.toThrow();

      // MOBIL_LISTRIK in S -> Rejected
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "SEPEDA")).toThrow(
        CompatibilityError
      );
    });
  });

  // ============================================================================
  // [UT-08] Daily Rental Duration BVA (0, 1, 29, 30, 31)
  // ============================================================================
  describe("[UT-08] Daily Rental Duration BVA (1 <= jumlahHari <= 29; >= 30 must use Bulanan)", () => {
    const baseDailyParams: NewRentalParams = {
      tipeSewa: "HARIAN",
      tanggalMulai: "2026-11-21",
      hargaSewaHarian: 50000,
      tipeGarasi: "MOBIL",
      vehicle: {
        tipeKendaraan: "MOBIL",
        nomorPlat: "B 1234 CD",
        merekTipe: "Honda Civic",
      },
    };

    it("should throw ValidationError for below lower boundary: jumlahHari = 0", () => {
      expect(() => service.calculateNewRental({ ...baseDailyParams, jumlahHari: 0 })).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for negative jumlahHari", () => {
      expect(() => service.calculateNewRental({ ...baseDailyParams, jumlahHari: -5 })).toThrow(
        ValidationError
      );
    });

    it("should succeed for exact lower boundary: jumlahHari = 1", () => {
      const quote = service.calculateNewRental({ ...baseDailyParams, jumlahHari: 1 });
      expect(quote.durasiHari).toBe(1);
      expect(quote.biayaSewa).toBe(50000); // 1 * 50.000 = 50.000
      expect(quote.totalBiaya).toBe(50000);
      expect(quote.biayaListrik).toBe(0);
    });

    it("should succeed for exact upper boundary for HARIAN: jumlahHari = 29", () => {
      const quote = service.calculateNewRental({ ...baseDailyParams, jumlahHari: 29 });
      expect(quote.durasiHari).toBe(29);
      expect(quote.biayaSewa).toBe(29 * 50000); // 29 * 50.000 = 1.450.000
      expect(quote.totalBiaya).toBe(1450000);
    });

    it("should throw ValidationError for HARIAN with jumlahHari = 30 (must use BULANAN mode)", () => {
      expect(() => service.calculateNewRental({ ...baseDailyParams, jumlahHari: 30 })).toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for beyond upper boundary: jumlahHari = 31", () => {
      expect(() => service.calculateNewRental({ ...baseDailyParams, jumlahHari: 31 })).toThrow(
        ValidationError
      );
    });
  });

  // ============================================================================
  // [UT-09] Monthly Rental Rate Formula & Calendar Clamping Tanggal Selesai
  // ============================================================================
  describe("[UT-09] Monthly Rental (25x Daily Rate & Calendar Clamped Tanggal Selesai)", () => {
    it("should calculate exact 25 × hargaSewaHarian and 30-day equivalent duration for BULANAN rental", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "BULANAN",
        tanggalMulai: "2026-11-21",
        hargaSewaHarian: 50000,
        tipeGarasi: "MOBIL",
        vehicle: {
          tipeKendaraan: "MOBIL",
          nomorPlat: "B 5555 XYZ",
          merekTipe: "Toyota Innova",
        },
      });

      // 25 * 50.000 = 1.250.000
      expect(quote.biayaSewa).toBe(1250000);
      expect(quote.durasiHari).toBe(30);
      expect(quote.biayaListrik).toBe(0);
      expect(quote.totalBiaya).toBe(1250000);
      // Tanggal selesai mengikuti tanggal yang sama di bulan berikutnya: 2026-12-21
      expect(quote.tanggalSelesai.toISOString().split("T")[0]).toBe("2026-12-21");
    });

    it("should clamp tanggalSelesai to last day of next month if next month has fewer days (e.g. Jan 31 -> Feb 28)", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "BULANAN",
        tanggalMulai: "2026-01-31",
        hargaSewaHarian: 10000,
        tipeGarasi: "SEPEDA",
        vehicle: {
          tipeKendaraan: "SEPEDA",
          nomorPlat: null,
          merekTipe: "Polygon Cascade",
        },
      });

      expect(quote.tanggalMulai.toISOString().split("T")[0]).toBe("2026-01-31");
      // Februari 2026 memiliki 28 hari, sehingga tanggal selesai diclamp ke 2026-02-28
      expect(quote.tanggalSelesai.toISOString().split("T")[0]).toBe("2026-02-28");
      expect(quote.biayaSewa).toBe(250000); // 25 * 10.000
    });
  });

  // ============================================================================
  // [UT-10] EV Charging Rules: Garage E vs Garage C
  // ============================================================================
  describe("[UT-10] EV Charging Calculation in Garage E vs Garage C", () => {
    const evVehicle: VehicleInput = {
      tipeKendaraan: "MOBIL_LISTRIK",
      nomorPlat: "B 2026 EV",
      merekTipe: "Hyundai Ioniq 5",
      kapasitasMaxKwh: 70,
      currentBatteryKwh: 20,
    };

    it("should charge electricity for (maxKwh - currentKwh) * hargaPerKwh when EV rents MOBIL_LISTRIK (E) garage", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "HARIAN",
        jumlahHari: 3,
        tanggalMulai: "2026-11-21",
        hargaSewaHarian: 75000,
        tipeGarasi: "MOBIL_LISTRIK",
        hargaListrikPerKwh: 2500,
        vehicle: evVehicle,
      });

      // Biaya sewa: 3 * 75.000 = 225.000
      expect(quote.biayaSewa).toBe(225000);
      // Biaya listrik: (70 - 20) * 2.500 = 50 * 2.500 = 125.000
      expect(quote.biayaListrik).toBe(125000);
      // Total biaya: 225.000 + 125.000 = 350.000
      expect(quote.totalBiaya).toBe(350000);
    });

    it("should NOT charge electricity (biayaListrik = 0) when EV rents regular MOBIL (C) garage", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "HARIAN",
        jumlahHari: 3,
        tanggalMulai: "2026-11-21",
        hargaSewaHarian: 50000,
        tipeGarasi: "MOBIL",
        vehicle: evVehicle,
      });

      // Biaya sewa: 3 * 50.000 = 150.000
      expect(quote.biayaSewa).toBe(150000);
      // Biaya listrik di Garasi C = 0
      expect(quote.biayaListrik).toBe(0);
      expect(quote.totalBiaya).toBe(150000);
    });
  });

  // ============================================================================
  // [UT-11] Vehicle Field Validation
  // ============================================================================
  describe("[UT-11] Vehicle Field Validation", () => {
    it("should allow SEPEDA without license plate", () => {
      const bike: VehicleInput = {
        tipeKendaraan: "SEPEDA",
        nomorPlat: null,
        merekTipe: "Polygon Strattos",
      };
      expect(() => service.validateVehicleFields(bike)).not.toThrow();
    });

    it("should require license plate for SEPEDA_MOTOR, throwing ValidationError if empty", () => {
      const motorWithoutPlate: VehicleInput = {
        tipeKendaraan: "SEPEDA_MOTOR",
        nomorPlat: "",
        merekTipe: "Honda Vario 160",
      };
      expect(() => service.validateVehicleFields(motorWithoutPlate)).toThrow(ValidationError);

      const motorWithPlate: VehicleInput = {
        tipeKendaraan: "SEPEDA_MOTOR",
        nomorPlat: "B 1234 XYZ",
        merekTipe: "Honda Vario 160",
      };
      expect(() => service.validateVehicleFields(motorWithPlate)).not.toThrow();
    });

    it("should require license plate for MOBIL, throwing ValidationError if empty", () => {
      const carWithoutPlate: VehicleInput = {
        tipeKendaraan: "MOBIL",
        nomorPlat: "",
        merekTipe: "Toyota Avanza",
      };
      expect(() => service.validateVehicleFields(carWithoutPlate)).toThrow(ValidationError);

      const carWithPlate: VehicleInput = {
        tipeKendaraan: "MOBIL",
        nomorPlat: "B 9999 ABC",
        merekTipe: "Toyota Avanza",
      };
      expect(() => service.validateVehicleFields(carWithPlate)).not.toThrow();
    });

    it("should validate MOBIL_LISTRIK: maxBatteryKwh > 0, 0 <= currentBatteryKwh <= maxBatteryKwh", () => {
      const evNoPlate: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasMaxKwh: 58,
        currentBatteryKwh: 20,
      };
      expect(() => service.validateVehicleFields(evNoPlate)).toThrow(ValidationError);

      const evZeroMaxKwh: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasMaxKwh: 0,
        currentBatteryKwh: 0,
      };
      expect(() => service.validateVehicleFields(evZeroMaxKwh)).toThrow(ValidationError);

      const evNegativeCurrentKwh: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasMaxKwh: 58,
        currentBatteryKwh: -10,
      };
      expect(() => service.validateVehicleFields(evNegativeCurrentKwh)).toThrow(ValidationError);

      const evExceededCurrentKwh: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasMaxKwh: 50,
        currentBatteryKwh: 65,
      };
      expect(() => service.validateVehicleFields(evExceededCurrentKwh)).toThrow(ValidationError);

      const evValid: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasMaxKwh: 72.6,
        currentBatteryKwh: 20,
      };
      expect(() => service.validateVehicleFields(evValid)).not.toThrow();
    });

    it("should reject empty merek dan tipe", () => {
      expect(() =>
        service.validateVehicleFields({
          tipeKendaraan: "SEPEDA",
          merekTipe: "   ",
        })
      ).toThrow(ValidationError);
    });
  });

  // ============================================================================
  // [UT-12] Rental Extension Calculation BVA (<30 days, =30 days, >30 days)
  // ============================================================================
  describe("[UT-12] Rental Extension Calculation (<30 daily, =30 1 month, >30 2+ months)", () => {
    const oldEndDate = "2026-11-30";
    const dailyPrice = 50000;

    it("should throw ValidationError if new date is same as old date (tambahanHari = 0)", () => {
      expect(() =>
        service.calculateExtension({
          tanggalSelesaiLama: oldEndDate,
          tanggalSelesaiBaru: oldEndDate,
          hargaSewaHarian: dailyPrice,
        })
      ).toThrow(ValidationError);
    });

    it("should throw ValidationError if new date is before old date (tambahanHari < 0)", () => {
      expect(() =>
        service.calculateExtension({
          tanggalSelesaiLama: oldEndDate,
          tanggalSelesaiBaru: "2026-11-28",
          hargaSewaHarian: dailyPrice,
        })
      ).toThrow(ValidationError);
    });

    it("should calculate daily rate for < 30 days extension (+15 days = 15 * daily)", () => {
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2026-12-15",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(15);
      expect(ext.sisaBiaya).toBe(15 * 50000); // Rp 750.000
      expect(ext.sisaBiaya).toBeGreaterThan(0);
    });

    it("should calculate 1 month flat rate (25x daily) for exact = 30 days extension", () => {
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2026-12-30",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(30);
      expect(ext.sisaBiaya).toBe(25 * 50000); // Rp 1.250.000 (1 bulan flat rate)
    });

    it("should calculate 2 months rate (2 * 25x daily) for > 30 days extension (+45 days)", () => {
      // 45 days > 30 -> Math.ceil(45/30) = 2 bulan -> 2 * 25 * 50.000 = Rp 2.500.000
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2027-01-14",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(45);
      expect(ext.sisaBiaya).toBe(2 * 25 * 50000); // Rp 2.500.000
    });

    it("should calculate 2 months rate (2 * 25x daily) for exact 60 days extension", () => {
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2027-01-29",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(60);
      expect(ext.sisaBiaya).toBe(2 * 25 * 50000); // Rp 2.500.000
    });
  });
});
