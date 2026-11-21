/**
 * @file rentalService.test.ts
 * @description Unit tests for RentalService covering vehicle-to-garage compatibility,
 * duration limits (1-29 days harian, 25x bulanan), EV electricity calculations ((max - current) * kwhPrice),
 * and automatic rental extension calculations.
 * Satisfies LSP Pemrogram Unit Testing requirements #2, #3, #4, #5.
 */

import { describe, it, expect } from "vitest";
import { RentalService, VehicleDetailsInput } from "../src/services/RentalService";

describe("RentalService — Unit Testing (Logika Bisnis Persewaan Garasi)", () => {
  // ============================================================================
  // 1. Validasi Kesesuaian Tipe Kendaraan vs Tipe Garasi
  // ============================================================================
  describe("1. Validasi Kesesuaian Tipe Kendaraan vs Tipe Garasi", () => {
    it("should allow 'sepeda' and 'sepeda_motor' ONLY in Garasi Sepeda (S)", () => {
      // Valid
      expect(() => RentalService.validateCompatibility("sepeda", "sepeda")).not.toThrow();
      expect(() => RentalService.validateCompatibility("sepeda_motor", "sepeda")).not.toThrow();

      // Invalid
      expect(() => RentalService.validateCompatibility("sepeda", "mobil")).toThrowError(
        /hanya diizinkan menyewa Garasi Sepeda/
      );
      expect(() => RentalService.validateCompatibility("sepeda", "mobil_listrik")).toThrowError(
        /hanya diizinkan menyewa Garasi Sepeda/
      );
      expect(() => RentalService.validateCompatibility("sepeda_motor", "mobil")).toThrowError(
        /hanya diizinkan menyewa Garasi Sepeda/
      );
      expect(() => RentalService.validateCompatibility("sepeda_motor", "mobil_listrik")).toThrowError(
        /hanya diizinkan menyewa Garasi Sepeda/
      );
    });

    it("should allow 'mobil' (bensin) ONLY in Garasi Mobil (C)", () => {
      // Valid
      expect(() => RentalService.validateCompatibility("mobil", "mobil")).not.toThrow();

      // Invalid
      expect(() => RentalService.validateCompatibility("mobil", "sepeda")).toThrowError(
        /Mobil Bensin hanya diizinkan menyewa Garasi Mobil \(C\)/
      );
      expect(() => RentalService.validateCompatibility("mobil", "mobil_listrik")).toThrowError(
        /Mobil Bensin hanya diizinkan menyewa Garasi Mobil \(C\)/
      );
    });

    it("should allow 'mobil_listrik' in Garasi Mobil (C) or Garasi Mobil Listrik (E)", () => {
      // Valid di C atau E
      expect(() => RentalService.validateCompatibility("mobil_listrik", "mobil")).not.toThrow();
      expect(() => RentalService.validateCompatibility("mobil_listrik", "mobil_listrik")).not.toThrow();

      // Invalid di S
      expect(() => RentalService.validateCompatibility("mobil_listrik", "sepeda")).toThrowError(
        /Mobil Listrik hanya diizinkan menyewa Garasi Mobil \(C\) atau Garasi Mobil Listrik \(E\)/
      );
    });
  });

  // ============================================================================
  // 2. Validasi Atribut Kendaraan & Baterai EV
  // ============================================================================
  describe("2. Validasi Detail Kendaraan & Baterai Mobil Listrik", () => {
    it("should allow 'sepeda' without license plate", () => {
      const bike: VehicleDetailsInput = {
        vehicleType: "sepeda",
        plateNumber: null,
        vehicleBrandType: "Polygon Helios A8",
      };
      expect(() => RentalService.validateVehicleDetails(bike)).not.toThrow();
    });

    it("should require license plate for 'sepeda_motor' and 'mobil'", () => {
      const motorWithoutPlate: VehicleDetailsInput = {
        vehicleType: "sepeda_motor",
        plateNumber: "",
        vehicleBrandType: "Honda PCX 160",
      };
      expect(() => RentalService.validateVehicleDetails(motorWithoutPlate)).toThrowError(
        /Nomor plat kendaraan wajib diisi/
      );

      const carWithoutPlate: VehicleDetailsInput = {
        vehicleType: "mobil",
        plateNumber: " ",
        vehicleBrandType: "Toyota Kijang Innova Zenix",
      };
      expect(() => RentalService.validateVehicleDetails(carWithoutPlate)).toThrowError(
        /Nomor plat kendaraan wajib diisi/
      );

      const carValid: VehicleDetailsInput = {
        vehicleType: "mobil",
        plateNumber: "B 1234 ABC",
        vehicleBrandType: "Toyota Avanza",
      };
      expect(() => RentalService.validateVehicleDetails(carValid)).not.toThrow();
    });

    it("should validate mobil_listrik battery: current_battery_kwh <= max_battery_kwh", () => {
      // Kasus valid: current <= max
      const evValid: VehicleDetailsInput = {
        vehicleType: "mobil_listrik",
        plateNumber: "B 9999 EV",
        vehicleBrandType: "Hyundai Ioniq 5",
        maxBatteryKwh: 72.6,
        currentBatteryKwh: 20.0,
      };
      expect(() => RentalService.validateVehicleDetails(evValid)).not.toThrow();

      // Kasus sama (baterai penuh): current == max
      const evFull: VehicleDetailsInput = {
        ...evValid,
        currentBatteryKwh: 72.6,
      };
      expect(() => RentalService.validateVehicleDetails(evFull)).not.toThrow();

      // Kasus invalid: current > max (melebihi kapasitas)
      const evExceeded: VehicleDetailsInput = {
        ...evValid,
        maxBatteryKwh: 50.0,
        currentBatteryKwh: 65.0,
      };
      expect(() => RentalService.validateVehicleDetails(evExceeded)).toThrowError(
        /tidak boleh melebihi kapasitas maksimum/
      );

      // Kasus invalid: max <= 0 atau current < 0
      const evZeroMax: VehicleDetailsInput = {
        ...evValid,
        maxBatteryKwh: 0,
      };
      expect(() => RentalService.validateVehicleDetails(evZeroMax)).toThrowError();

      const evNegativeCurrent: VehicleDetailsInput = {
        ...evValid,
        currentBatteryKwh: -5,
      };
      expect(() => RentalService.validateVehicleDetails(evNegativeCurrent)).toThrowError();
    });
  });

  // ============================================================================
  // 3. Batas Durasi Sewa Harian (1-29 hari) dan Bulanan (25x Harga Harian)
  // ============================================================================
  describe("3. Batas Durasi Sewa Harian (1-29 Hari) & Bulanan (25x Formula)", () => {
    const dailyPrice = 50000; // Rp 50.000 / hari
    const testDate = "2026-11-21";

    it("should allow daily rental from 1 up to 29 days (kurang dari 30 hari)", () => {
      // Lower bound: 1 hari
      const d1 = RentalService.calculateDatesAndDuration("harian", 1, testDate);
      expect(d1.duration).toBe(1);
      expect(d1.startDateStr).toBe("2026-11-21");
      expect(d1.endDateStr).toBe("2026-11-22");
      expect(RentalService.calculateRentalCost("harian", 1, dailyPrice)).toBe(50000);

      // Upper bound: 29 hari
      const d29 = RentalService.calculateDatesAndDuration("harian", 29, testDate);
      expect(d29.duration).toBe(29);
      expect(d29.startDateStr).toBe("2026-11-21");
      expect(d29.endDateStr).toBe("2026-12-20");
      expect(RentalService.calculateRentalCost("harian", 29, dailyPrice)).toBe(29 * 50000); // Rp 1.450.000
    });

    it("should reject daily rental with 0 days, negative days, or >= 30 days", () => {
      expect(() => RentalService.calculateDatesAndDuration("harian", 0, testDate)).toThrowError(
        /rentang 1 hingga 29 hari/
      );
      expect(() => RentalService.calculateDatesAndDuration("harian", -1, testDate)).toThrowError(
        /rentang 1 hingga 29 hari/
      );
      expect(() => RentalService.calculateDatesAndDuration("harian", 30, testDate)).toThrowError(
        /rentang 1 hingga 29 hari/
      );
      expect(() => RentalService.calculateDatesAndDuration("harian", 31, testDate)).toThrowError(
        /rentang 1 hingga 29 hari/
      );
    });

    it("should calculate exact 25x daily price for bulanan rental (30 days)", () => {
      const monthCalc = RentalService.calculateDatesAndDuration("bulanan", null, "2026-11-21");
      expect(monthCalc.duration).toBe(30);
      expect(monthCalc.startDateStr).toBe("2026-11-21");
      // Tanggal selesai mengikuti tanggal yang sama di bulan berikutnya: 2026-12-21
      expect(monthCalc.endDateStr).toBe("2026-12-21");

      const monthlyCost = RentalService.calculateRentalCost("bulanan", 30, dailyPrice);
      // 25 * 50.000 = Rp 1.250.000
      expect(monthlyCost).toBe(1250000);
      expect(monthlyCost).toBe(25 * dailyPrice);
    });
  });

  // ============================================================================
  // 4. Perhitungan Biaya Isi Listrik EV: (max - current) * kwh_price
  // ============================================================================
  describe("4. Perhitungan Biaya Isi Listrik EV ((max - current) * kwhPrice)", () => {
    const maxKwh = 60.0;
    const curKwh = 20.0;
    const kwhPrice = 2500; // Rp 2.500 / kWh

    it("should charge full electricity: (max - current) * kwhPrice when EV in Garasi E", () => {
      // (60 - 20) * 2500 = 40 kWh * 2500 = Rp 100.000
      const cost = RentalService.calculateElectricityCost(
        "mobil_listrik",
        "mobil_listrik",
        maxKwh,
        curKwh,
        kwhPrice
      );
      expect(cost).toBe(100000);
    });

    it("should charge Rp 0 electricity if battery is already full (max == current) in Garasi E", () => {
      const cost = RentalService.calculateElectricityCost(
        "mobil_listrik",
        "mobil_listrik",
        60.0,
        60.0,
        kwhPrice
      );
      expect(cost).toBe(0);
    });

    it("should charge Rp 0 electricity when EV rents regular Garasi Mobil (C)", () => {
      const cost = RentalService.calculateElectricityCost(
        "mobil_listrik",
        "mobil",
        maxKwh,
        curKwh,
        kwhPrice
      );
      expect(cost).toBe(0);
    });

    it("should charge Rp 0 electricity for non-EV vehicles (sepeda, motor, mobil bensin)", () => {
      expect(
        RentalService.calculateElectricityCost("mobil", "mobil", null, null, kwhPrice)
      ).toBe(0);
      expect(
        RentalService.calculateElectricityCost("sepeda", "sepeda", null, null, kwhPrice)
      ).toBe(0);
    });

    it("should calculate complete quote with rental + electricity costs accurately", () => {
      const quote = RentalService.quoteNewRental({
        rentalType: "harian",
        durationDays: 3,
        startDate: "2026-11-21",
        dailyPrice: 75000,
        garageType: "mobil_listrik",
        kwhPrice: 2500,
        vehicle: {
          vehicleType: "mobil_listrik",
          plateNumber: "B 1234 EV",
          vehicleBrandType: "Wuling Air EV",
          maxBatteryKwh: 26.7,
          currentBatteryKwh: 6.7, // Butuh isi 20 kWh
        },
      });

      // Biaya sewa: 3 * 75.000 = 225.000
      expect(quote.rentalCost).toBe(225000);
      // Biaya listrik: (26.7 - 6.7) * 2.500 = 20 * 2.500 = 50.000
      expect(quote.electricityCost).toBe(50000);
      // Total biaya: 225.000 + 50.000 = 275.000
      expect(quote.totalCost).toBe(275000);
    });
  });

  // ============================================================================
  // 5. Perhitungan Perpanjangan Sewa (Extension)
  // ============================================================================
  describe("5. Perhitungan Perpanjangan Sewa & Biaya Tambahan", () => {
    const oldEndDate = "2026-11-30";
    const dailyPrice = 50000;

    it("should calculate positive additional cost for +1 day extension", () => {
      const ext = RentalService.calculateExtension(oldEndDate, "2026-12-01", dailyPrice);
      expect(ext.additionalDays).toBe(1);
      expect(ext.additionalCost).toBe(50000);
    });

    it("should calculate additional cost for +10 days extension", () => {
      const ext = RentalService.calculateExtension(oldEndDate, "2026-12-10", dailyPrice);
      expect(ext.additionalDays).toBe(10);
      expect(ext.additionalCost).toBe(10 * 50000); // Rp 500.000
    });

    it("should throw error if new end date is same as or before old end date", () => {
      expect(() =>
        RentalService.calculateExtension(oldEndDate, oldEndDate, dailyPrice)
      ).toThrowError(/harus lebih besar dari tanggal selesai/);

      expect(() =>
        RentalService.calculateExtension(oldEndDate, "2026-11-25", dailyPrice)
      ).toThrowError(/harus lebih besar dari tanggal selesai/);
    });
  });
});
