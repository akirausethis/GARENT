/**
 * @file garasiEntity.test.ts
 * @description Unit tests for GarasiEntity and GarasiMobilListrikEntity.
 * Satisfies LSP Pemrogram UK 4 (OOP) and UK 9 (Testing).
 */

import { describe, it, expect } from "vitest";
import { GarasiEntity } from "../domain/entities/GarasiEntity";
import { GarasiMobilListrikEntity } from "../domain/entities/GarasiMobilListrikEntity";
import { ValidationError } from "../domain/errors";

describe("GarasiEntity (OOP Encapsulation)", () => {
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

  it("should calculate exact 25x monthly rate via hitungHargaBulanan()", () => {
    const garageDaily10k = new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 10000);
    expect(garageDaily10k.hitungHargaBulanan()).toBe(250000);

    const garageDaily50k = new GarasiEntity("uuid-2", "C001", "MOBIL", 1, 50000);
    expect(garageDaily50k.hitungHargaBulanan()).toBe(1250000);
  });

  it("should update status and harga via validated setters", () => {
    const garage = new GarasiEntity("uuid-1", "C001", "MOBIL", 1, 50000);
    garage.setStatus("USED");
    expect(garage.getStatus()).toBe("USED");
    expect(garage.isAvailable()).toBe(false);

    garage.setHargaSewaHarian(60000);
    expect(garage.getHargaSewaHarian()).toBe(60000);
    expect(garage.hitungHargaBulanan()).toBe(1500000);
  });

  it("should reject negative or zero hargaSewaHarian in constructor and setter", () => {
    expect(() => new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 0)).toThrow(ValidationError);
    expect(() => new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, -10000)).toThrow(ValidationError);

    const garage = new GarasiEntity("uuid-1", "S001", "SEPEDA", 1, 10000);
    expect(() => garage.setHargaSewaHarian(0)).toThrow(ValidationError);
    expect(() => garage.setHargaSewaHarian(-5000)).toThrow(ValidationError);
  });

  it("should reject invalid nomorUrut outside 1..999", () => {
    expect(() => new GarasiEntity("uuid-1", "S000", "SEPEDA", 0, 10000)).toThrow(ValidationError);
    expect(() => new GarasiEntity("uuid-1", "S1000", "SEPEDA", 1000, 10000)).toThrow(
      ValidationError
    );
  });
});

describe("GarasiMobilListrikEntity (OOP Inheritance & EV Charging)", () => {
  it("should inherit GarasiEntity and add hargaListrikPerKwh", () => {
    const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
    expect(evGarage.getId()).toBe("uuid-ev");
    expect(evGarage.getKodeGarasi()).toBe("E001");
    expect(evGarage.getTipeGarasi()).toBe("MOBIL_LISTRIK");
    expect(evGarage.getHargaSewaHarian()).toBe(75000);
    expect(evGarage.getHargaListrikPerKwh()).toBe(2500);
    expect(evGarage.getStatus()).toBe("AVAILABLE");

    // Inherited monthly calculation
    expect(evGarage.hitungHargaBulanan()).toBe(25 * 75000);
  });

  it("should calculate mandatory EV full charge cost via hitungBiayaIsiPenuh()", () => {
    const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
    // 60 kWh battery * Rp 2.500/kWh = Rp 150.000
    expect(evGarage.hitungBiayaIsiPenuh(60)).toBe(150000);

    // 40.5 kWh battery * Rp 2.500/kWh = Rp 101.250
    expect(evGarage.hitungBiayaIsiPenuh(40.5)).toBe(101250);
  });

  it("should reject non-positive hargaListrikPerKwh or kapasitasKwh", () => {
    expect(() => new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 0)).toThrow(
      ValidationError
    );
    expect(() => new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, -500)).toThrow(
      ValidationError
    );

    const evGarage = new GarasiMobilListrikEntity("uuid-ev", "E001", 1, 75000, 2500);
    expect(() => evGarage.hitungBiayaIsiPenuh(0)).toThrow(ValidationError);
    expect(() => evGarage.hitungBiayaIsiPenuh(-10)).toThrow(ValidationError);
  });
});
