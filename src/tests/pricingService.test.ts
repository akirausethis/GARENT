/**
 * @file pricingService.test.ts
 * @description Unit tests for GaragePricingService verifying all LSP business rules.
 * Uses AAA (Arrange-Act-Assert) pattern and Boundary Value Analysis (BVA).
 * Satisfies LSP Pemrogram UK 9 (Testing).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GaragePricingService } from "../domain/services/GaragePricingService";
import { CompatibilityError, ValidationError } from "../domain/errors";
import { VehicleInput, NewRentalParams } from "../domain/types";

describe("GaragePricingService", () => {
  let service: GaragePricingService;

  beforeEach(() => {
    service = new GaragePricingService();
  });

  // ============================================================================
  // 1. Vehicle-to-Garage Compatibility Matrix
  // ============================================================================
  describe("Vehicle-to-Garage Compatibility Matrix", () => {
    it("should allow SEPEDA only in SEPEDA garage", () => {
      expect(() => service.validateCompatibility("SEPEDA", "SEPEDA")).not.toThrow();
      expect(() => service.validateCompatibility("SEPEDA", "MOBIL")).toThrow(CompatibilityError);
      expect(() => service.validateCompatibility("SEPEDA", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow SEPEDA_MOTOR only in SEPEDA garage", () => {
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "SEPEDA")).not.toThrow();
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "MOBIL")).toThrow(
        CompatibilityError
      );
      expect(() => service.validateCompatibility("SEPEDA_MOTOR", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow MOBIL (bensin) only in MOBIL garage", () => {
      expect(() => service.validateCompatibility("MOBIL", "MOBIL")).not.toThrow();
      expect(() => service.validateCompatibility("MOBIL", "SEPEDA")).toThrow(CompatibilityError);
      expect(() => service.validateCompatibility("MOBIL", "MOBIL_LISTRIK")).toThrow(
        CompatibilityError
      );
    });

    it("should allow MOBIL_LISTRIK in either MOBIL or MOBIL_LISTRIK garage", () => {
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "MOBIL")).not.toThrow();
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "MOBIL_LISTRIK")).not.toThrow();
      expect(() => service.validateCompatibility("MOBIL_LISTRIK", "SEPEDA")).toThrow(
        CompatibilityError
      );
    });
  });

  // ============================================================================
  // 2. Vehicle Field Validation
  // ============================================================================
  describe("Vehicle Field Validation", () => {
    it("should allow SEPEDA without license plate", () => {
      const bike: VehicleInput = {
        tipeKendaraan: "SEPEDA",
        nomorPlat: null,
        merekTipe: "Polygon Strattos",
      };
      expect(() => service.validateVehicleFields(bike)).not.toThrow();
    });

    it("should require license plate for SEPEDA_MOTOR", () => {
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

    it("should require license plate for MOBIL", () => {
      const carWithoutPlate: VehicleInput = {
        tipeKendaraan: "MOBIL",
        nomorPlat: "",
        merekTipe: "Toyota Avanza",
      };
      expect(() => service.validateVehicleFields(carWithoutPlate)).toThrow(ValidationError);
    });

    it("should require license plate and positive kWh for MOBIL_LISTRIK", () => {
      const evNoKwh: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasListrikKwh: 0,
      };
      expect(() => service.validateVehicleFields(evNoKwh)).toThrow(ValidationError);

      const evNegativeKwh: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasListrikKwh: -58,
      };
      expect(() => service.validateVehicleFields(evNegativeKwh)).toThrow(ValidationError);

      const evValid: VehicleInput = {
        tipeKendaraan: "MOBIL_LISTRIK",
        nomorPlat: "B 1111 EV",
        merekTipe: "Hyundai Ioniq 5",
        kapasitasListrikKwh: 72.6,
      };
      expect(() => service.validateVehicleFields(evValid)).not.toThrow();
    });
  });

  // ============================================================================
  // 3. Rental Duration Boundary Value Analysis (1 <= jumlahHari <= 30)
  // ============================================================================
  describe("Daily Rental Duration (BVA: 1..30)", () => {
    const baseParams: Omit<NewRentalParams, "jumlahHari"> = {
      tipeSewa: "HARIAN",
      tanggalMulai: "2026-11-21",
      hargaSewaHarian: 50000,
      tipeGarasi: "MOBIL",
      vehicle: {
        tipeKendaraan: "MOBIL",
        nomorPlat: "B 9999 ABC",
        merekTipe: "Honda Civic",
      },
    };

    it("should throw ValidationError for jumlahHari <= 0 (0 and negative)", () => {
      expect(() => service.calculateNewRental({ ...baseParams, jumlahHari: 0 })).toThrow(
        ValidationError
      );
      expect(() => service.calculateNewRental({ ...baseParams, jumlahHari: -5 })).toThrow(
        ValidationError
      );
    });

    it("should succeed for lower boundary: jumlahHari = 1", () => {
      const quote = service.calculateNewRental({ ...baseParams, jumlahHari: 1 });
      expect(quote.durasiHari).toBe(1);
      expect(quote.biayaSewa).toBe(50000);
      expect(quote.totalBiaya).toBe(50000);
    });

    it("should succeed for upper boundary: jumlahHari = 30", () => {
      const quote = service.calculateNewRental({ ...baseParams, jumlahHari: 30 });
      expect(quote.durasiHari).toBe(30);
      expect(quote.biayaSewa).toBe(30 * 50000); // Rp 1.500.000
      expect(quote.totalBiaya).toBe(1500000);
    });

    it("should throw ValidationError for beyond upper boundary: jumlahHari = 31", () => {
      expect(() => service.calculateNewRental({ ...baseParams, jumlahHari: 31 })).toThrow(
        ValidationError
      );
    });
  });

  // ============================================================================
  // 4. Monthly Pricing (Exact 25x Formula)
  // ============================================================================
  describe("Monthly Rental Rate Calculation (25x Formula)", () => {
    it("should calculate exact 25 × hargaSewaHarian for BULANAN", () => {
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
    });
  });

  // ============================================================================
  // 5. Mandatory EV Full Charging Logic
  // ============================================================================
  describe("EV Full Charging Rules", () => {
    const evVehicle: VehicleInput = {
      tipeKendaraan: "MOBIL_LISTRIK",
      nomorPlat: "B 2026 EV",
      merekTipe: "Wuling Air EV",
      kapasitasListrikKwh: 26.7,
    };

    it("should charge full electricity when EV rents MOBIL_LISTRIK (E) garage", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "HARIAN",
        jumlahHari: 2,
        tanggalMulai: "2026-11-21",
        hargaSewaHarian: 75000,
        tipeGarasi: "MOBIL_LISTRIK",
        hargaListrikPerKwh: 2500,
        vehicle: evVehicle,
      });

      // Biaya sewa: 2 * 75.000 = 150.000
      expect(quote.biayaSewa).toBe(150000);

      // Biaya listrik: 26.7 * 2.500 = 66.750
      expect(quote.biayaListrik).toBe(66750);

      // Total biaya: 150.000 + 66.750 = 216.750
      expect(quote.totalBiaya).toBe(216750);
    });

    it("should NOT charge electricity (biayaListrik = 0) when EV rents regular MOBIL (C) garage", () => {
      const quote = service.calculateNewRental({
        tipeSewa: "HARIAN",
        jumlahHari: 2,
        tanggalMulai: "2026-11-21",
        hargaSewaHarian: 50000,
        tipeGarasi: "MOBIL",
        vehicle: evVehicle,
      });

      expect(quote.biayaSewa).toBe(100000);
      expect(quote.biayaListrik).toBe(0);
      expect(quote.totalBiaya).toBe(100000);
    });
  });

  // ============================================================================
  // 6. Rental Extension BVA
  // ============================================================================
  describe("Rental Extension Calculation (BVA)", () => {
    const oldEndDate = "2026-11-30";
    const dailyPrice = 50000;

    it("should throw ValidationError if new date is same as old date", () => {
      expect(() =>
        service.calculateExtension({
          tanggalSelesaiLama: oldEndDate,
          tanggalSelesaiBaru: oldEndDate,
          hargaSewaHarian: dailyPrice,
        })
      ).toThrow(ValidationError);
    });

    it("should throw ValidationError if new date is before old date", () => {
      expect(() =>
        service.calculateExtension({
          tanggalSelesaiLama: oldEndDate,
          tanggalSelesaiBaru: "2026-11-28",
          hargaSewaHarian: dailyPrice,
        })
      ).toThrow(ValidationError);
    });

    it("should calculate positive remaining balance for lower bound: +1 day extension", () => {
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2026-12-01",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(1);
      expect(ext.sisaBiaya).toBe(50000);
      expect(ext.sisaBiaya).toBeGreaterThan(0);
    });

    it("should calculate positive remaining balance for +30 days extension", () => {
      const ext = service.calculateExtension({
        tanggalSelesaiLama: oldEndDate,
        tanggalSelesaiBaru: "2026-12-30",
        hargaSewaHarian: dailyPrice,
      });

      expect(ext.tambahanHari).toBe(30);
      expect(ext.sisaBiaya).toBe(30 * 50000);
      expect(ext.sisaBiaya).toBe(1500000);
      expect(ext.sisaBiaya).toBeGreaterThan(0);
    });
  });
});
