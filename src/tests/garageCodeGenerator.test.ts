/**
 * @file garageCodeGenerator.test.ts
 * @description Unit tests for GarageCodeGenerator using Vitest and BVA.
 * Satisfies LSP Pemrogram UK 9 (Software Testing).
 */

import { describe, it, expect } from "vitest";
import { GarageCodeGenerator } from "../domain/services/GarageCodeGenerator";
import { CapacityExceededError, ValidationError } from "../domain/errors";

describe("GarageCodeGenerator", () => {
  describe("Format Code & Prefixes", () => {
    it("should generate S001, C001, E001 on initial index 1", () => {
      expect(GarageCodeGenerator.formatCode("SEPEDA", 1)).toBe("S001");
      expect(GarageCodeGenerator.formatCode("MOBIL", 1)).toBe("C001");
      expect(GarageCodeGenerator.formatCode("MOBIL_LISTRIK", 1)).toBe("E001");
    });

    it("should format C010 accurately for the 10th car garage", () => {
      expect(GarageCodeGenerator.formatCode("MOBIL", 10)).toBe("C010");
    });

    it("should format S999 for the 999th bicycle garage", () => {
      expect(GarageCodeGenerator.formatCode("SEPEDA", 999)).toBe("S999");
    });

    it("should throw ValidationError if sequenceNumber < 1 or > 999", () => {
      expect(() => GarageCodeGenerator.formatCode("MOBIL", 0)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.formatCode("MOBIL", -1)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.formatCode("MOBIL", 1000)).toThrow(ValidationError);
    });
  });

  describe("Batch Code Generation", () => {
    it("should generate continuous batch codes starting from currentMax + 1", () => {
      // Current max is 5 (C001..C005), generating 5 more
      const result = GarageCodeGenerator.generateBatch("MOBIL", 5, 5);
      expect(result.startNumber).toBe(6);
      expect(result.endNumber).toBe(10);
      expect(result.codes).toEqual(["C006", "C007", "C008", "C009", "C010"]);
    });

    it("should generate batch on empty inventory (currentMax = 0)", () => {
      const result = GarageCodeGenerator.generateBatch("SEPEDA", 0, 3);
      expect(result.startNumber).toBe(1);
      expect(result.endNumber).toBe(3);
      expect(result.codes).toEqual(["S001", "S002", "S003"]);
    });

    it("should generate batch for EV garage (E prefix)", () => {
      const result = GarageCodeGenerator.generateBatch("MOBIL_LISTRIK", 0, 2);
      expect(result.codes).toEqual(["E001", "E002"]);
    });
  });

  describe("Boundary Value Analysis (BVA)", () => {
    it("should succeed when target reaches exactly the 999 maximum capacity", () => {
      // 998 existing + 1 new = 999
      const result = GarageCodeGenerator.generateBatch("MOBIL_LISTRIK", 998, 1);
      expect(result.endNumber).toBe(999);
      expect(result.codes).toEqual(["E999"]);
    });

    it("should throw CapacityExceededError when target exceeds 999", () => {
      // 999 existing + 1 new = 1000 (exceeded)
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 999, 1)).toThrow(
        CapacityExceededError
      );

      // 990 existing + 10 new = 1000 (exceeded)
      expect(() => GarageCodeGenerator.generateBatch("SEPEDA", 990, 10)).toThrow(
        CapacityExceededError
      );

      // 0 existing + 1000 new (exceeded)
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 0, 1000)).toThrow(
        CapacityExceededError
      );
    });

    it("should throw ValidationError when quantity <= 0", () => {
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 0, 0)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 5, -3)).toThrow(ValidationError);
    });

    it("should throw ValidationError when currentMax < 0", () => {
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", -1, 5)).toThrow(ValidationError);
    });
  });
});
