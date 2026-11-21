/**
 * @file garageService.test.ts
 * @description Unit tests for GarageService covering incremental code generation and 999 capacity limit.
 * Satisfies LSP Pemrogram Unit Testing requirement #1.
 */

import { describe, it, expect } from "vitest";
import { GarageService } from "../src/services/GarageService";

describe("GarageService — Unit Testing (Logika Bisnis Kode & Kapasitas Garasi)", () => {
  describe("1. Generate Kode Garasi Incremental (S001, C010, E001)", () => {
    it("should format correct prefixes: S for sepeda, C for mobil, E for mobil_listrik", () => {
      expect(GarageService.getPrefix("sepeda")).toBe("S");
      expect(GarageService.getPrefix("mobil")).toBe("C");
      expect(GarageService.getPrefix("mobil_listrik")).toBe("E");
    });

    it("should format S001, C001, E001 for sequence index 1 with 3-digit zero-padding", () => {
      expect(GarageService.generateGarageCode("sepeda", 1)).toBe("S001");
      expect(GarageService.generateGarageCode("mobil", 1)).toBe("C001");
      expect(GarageService.generateGarageCode("mobil_listrik", 1)).toBe("E001");
    });

    it("should format C010 accurately for sequence index 10 (mobil)", () => {
      expect(GarageService.generateGarageCode("mobil", 10)).toBe("C010");
    });

    it("should format S999 accurately for the 999th unit", () => {
      expect(GarageService.generateGarageCode("sepeda", 999)).toBe("S999");
    });

    it("should generate continuous sequential batch codes (e.g. C006..C010 when currentMax = 5)", () => {
      const result = GarageService.generateBatchCodes("mobil", 5, 5);
      expect(result.startNumber).toBe(6);
      expect(result.endNumber).toBe(10);
      expect(result.codes).toEqual(["C006", "C007", "C008", "C009", "C010"]);
    });
  });

  describe("2. Validasi Batas Maksimal 999 Unit (Boundary Value Analysis)", () => {
    it("should succeed when adding units reaches exactly the 999 upper bound", () => {
      // 998 unit ada + 1 unit baru = 999 unit (tepat di batas atas)
      const result = GarageService.generateBatchCodes("mobil_listrik", 998, 1);
      expect(result.startNumber).toBe(999);
      expect(result.endNumber).toBe(999);
      expect(result.codes).toEqual(["E999"]);
    });

    it("should throw error when target sequence exceeds the 999 limit", () => {
      // 999 unit ada + 1 unit baru = 1000 (melebihi batas)
      expect(() => GarageService.generateBatchCodes("mobil", 999, 1)).toThrowError(
        /tidak boleh melebihi batas maksimum 999/
      );

      // 990 unit ada + 10 unit baru = 1000 (melebihi batas)
      expect(() => GarageService.generateBatchCodes("sepeda", 990, 10)).toThrowError(
        /tidak boleh melebihi batas maksimum 999/
      );

      // Dari kosong langsung buat 1000 unit (melebihi batas)
      expect(() => GarageService.generateBatchCodes("mobil", 0, 1000)).toThrowError(
        /tidak boleh melebihi batas maksimum 999/
      );
    });

    it("should reject invalid sequence number outside 1..999", () => {
      expect(() => GarageService.generateGarageCode("sepeda", 0)).toThrowError();
      expect(() => GarageService.generateGarageCode("sepeda", -1)).toThrowError();
      expect(() => GarageService.generateGarageCode("sepeda", 1000)).toThrowError();
    });

    it("should reject quantity <= 0 or negative currentMax in batch generation", () => {
      expect(() => GarageService.generateBatchCodes("mobil", 0, 0)).toThrowError();
      expect(() => GarageService.generateBatchCodes("mobil", 5, -2)).toThrowError();
      expect(() => GarageService.generateBatchCodes("mobil", -1, 5)).toThrowError();
    });
  });
});
