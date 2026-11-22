/**
 * @file garasiEntity.test.ts
 * @description Unit tests for GarasiEntity and GarasiMobilListrikEntity.
 * Satisfies LSP Pemrogram UK 4 (OOP) and UK 9 (Testing) covering UT-04, UT-05, and UT-06.
 */

import { describe, it, expect } from "vitest";
import { GarasiEntity, GarasiMobilListrikEntity } from "../domain/entities/GarasiEntity";
import { ValidationError } from "../domain/errors";

describe("GarasiEntity & GarasiMobilListrikEntity (LSP UK 9: UT-04, UT-05, UT-06)", () => {
  // ============================================================================
  // [UT-04] Monthly Rental Rate Formula (Exact 25x Daily Rate)
  // ============================================================================
  describe("[UT-04] GarasiEntity.hitungHargaBulanan()", () => {
    it("should return exact 25 * hargaSewaHarian for bicycle garage (10k -> 250k)", () => {
      // Arrange
      const garageDaily10k = new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 10000);

      // Act
      const hargaBulanan = garageDaily10k.hitungHargaBulanan();

      // Assert: 25 * 10.000 = 250.000
      expect(hargaBulanan).toBe(250000);
      expect(hargaBulanan).toBe(25 * garageDaily10k.getHargaSewaHarian());
    });

    it("should return exact 25 * hargaSewaHarian for car garage (50k -> 1.25M)", () => {
      // Arrange
      const garageDaily50k = new GarasiEntity("uuid-2", "C001", "MOBIL", 1, 50000);

      // Act
      const hargaBulanan = garageDaily50k.hitungHargaBulanan();

      // Assert: 25 * 50.000 = 1.250.000
      expect(hargaBulanan).toBe(1250000);
      expect(hargaBulanan).toBe(25 * garageDaily50k.getHargaSewaHarian());
    });

    it("should recalculate accurate 25x monthly rate when daily price is updated via setter", () => {
      // Arrange
      const garage = new GarasiEntity("uuid-3", "C002", "MOBIL", 2, 50000);

      // Act
      garage.setHargaSewaHarian(60000);

      // Assert: 25 * 60.000 = 1.500.000
      expect(garage.getHargaSewaHarian()).toBe(60000);
      expect(garage.hitungHargaBulanan()).toBe(1500000);
    });
  });

  // ============================================================================
  // [UT-05] Encapsulation Invariant & Attribute Validation
  // ============================================================================
  describe("[UT-05] Encapsulation Invariants & Boundary Validations", () => {
    it("should create an instance with valid attributes and default to AVAILABLE", () => {
      const garage = new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 10000);
      expect(garage.getId()).toBe("uuid-1");
      expect(garage.getKodeGarasi()).toBe("S001");
      expect(garage.getTipeGarasi()).toBe("SEPEDA");
      expect(garage.getNomorUrut()).toBe(1);
      expect(garage.getHargaSewaHarian()).toBe(10000);
      expect(garage.getStatus()).toBe("AVAILABLE");
      expect(garage.isAvailable()).toBe(true);
    });

    it("should update status via validated setter", () => {
      const garage = new GarasiEntity("uuid-1", "C001", "MOBIL", 1, 50000);
      garage.setStatus("USED");
      expect(garage.getStatus()).toBe("USED");
      expect(garage.isAvailable()).toBe(false);
    });

    it("should reject hargaSewaHarian <= 0 in constructor and setter", () => {
      expect(() => new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 0)).toThrow(ValidationError);
      expect(() => new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, -10000)).toThrow(ValidationError);

      const garage = new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 10000);
      expect(() => garage.setHargaSewaHarian(0)).toThrow(ValidationError);
      expect(() => garage.setHargaSewaHarian(-5000)).toThrow(ValidationError);
    });

    it("should reject nomorUrut outside 1..999 in constructor", () => {
      expect(() => new GarasiEntity("uuid-1", "S000", "SEPEDA", 0, 10000)).toThrow(ValidationError);
      expect(() => new GarasiEntity("uuid-1", "S1000", "SEPEDA", 1000, 10000)).toThrow(
        ValidationError
      );
    });

    it("should reject hargaListrikPerKwh <= 0 in GarasiMobilListrikEntity constructor and setter", () => {
      expect(() => new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 0)).toThrow(
        ValidationError
      );
      expect(() => new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, -2500)).toThrow(
        ValidationError
      );

      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
      expect(() => evGarage.setHargaListrikPerKwh(0)).toThrow(ValidationError);
      expect(() => evGarage.setHargaListrikPerKwh(-100)).toThrow(ValidationError);
    });
  });

  // ============================================================================
  // [UT-06] GarasiMobilListrikEntity.hitungBiayaIsiPenuh(kapasitasMaxKwh, currentBatteryKwh)
  // ============================================================================
  describe("[UT-06] GarasiMobilListrikEntity.hitungBiayaIsiPenuh(kapasitasMaxKwh, currentBatteryKwh)", () => {
    it("should return exact (max - current) * hargaListrikPerKwh for 60 kWh max and 20 kWh current", () => {
      // Arrange: Tarif Rp 2.500/kWh, baterai max 60 kWh, current 20 kWh -> butuh 40 kWh
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);

      // Act: (60 - 20) * 2.500 = 100.000
      const biaya = evGarage.hitungBiayaIsiPenuh(60, 20);

      // Assert
      expect(biaya).toBe(100000);
      expect(biaya).toBe((60 - 20) * evGarage.getHargaListrikPerKwh());
    });

    it("should charge full battery when currentBatteryKwh defaults to 0", () => {
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
      const biaya = evGarage.hitungBiayaIsiPenuh(60);
      expect(biaya).toBe(150000); // 60 * 2.500 = 150.000
    });

    it("should return 0 when battery is already full (max == current)", () => {
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
      const biaya = evGarage.hitungBiayaIsiPenuh(60, 60);
      expect(biaya).toBe(0);
    });

    it("should reject non-positive kapasitasMaxKwh (max <= 0) with ValidationError", () => {
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);

      expect(() => evGarage.hitungBiayaIsiPenuh(0, 0)).toThrow(ValidationError);
      expect(() => evGarage.hitungBiayaIsiPenuh(-15, 0)).toThrow(ValidationError);
    });

    it("should reject negative currentBatteryKwh (current < 0) with ValidationError", () => {
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);

      expect(() => evGarage.hitungBiayaIsiPenuh(60, -5)).toThrow(ValidationError);
    });

    it("should reject currentBatteryKwh > kapasitasMaxKwh with ValidationError", () => {
      const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);

      expect(() => evGarage.hitungBiayaIsiPenuh(60, 75)).toThrow(ValidationError);
    });
  });
});
