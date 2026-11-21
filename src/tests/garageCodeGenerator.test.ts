/**
 * @file garageCodeGenerator.test.ts
 * @description Unit tests for GarageCodeGenerator using Vitest and Boundary Value Analysis (BVA).
 * Satisfies LSP Pemrogram UK 9 (Software Testing) covering UT-01, UT-02, and UT-03.
 */

import { describe, it, expect } from "vitest";
import { GarageCodeGenerator } from "../domain/services/GarageCodeGenerator";
import { CapacityExceededError, ValidationError } from "../domain/errors";

describe("GarageCodeGenerator (LSP UK 9: UT-01, UT-02, UT-03)", () => {
  describe("[UT-01] Prefix & Formatting", () => {
    it("should format S001, C001, E001 on initial index 1", () => {
      // AAA Pattern: Arrange, Act, Assert
      const codeSepeda = GarageCodeGenerator.formatCode("SEPEDA", 1);
      const codeMobil = GarageCodeGenerator.formatCode("MOBIL", 1);
      const codeEv = GarageCodeGenerator.formatCode("MOBIL_LISTRIK", 1);

      expect(codeSepeda).toBe("S001");
      expect(codeMobil).toBe("C001");
      expect(codeEv).toBe("E001");
    });
  });

  describe("[UT-02] Sequential Numbering & Zero Padding", () => {
    it("should format C010 accurately for the 10th car garage", () => {
      const code10 = GarageCodeGenerator.formatCode("MOBIL", 10);
      expect(code10).toBe("C010");
    });

    it("should format S999 for the 999th bicycle garage", () => {
      const code999 = GarageCodeGenerator.formatCode("SEPEDA", 999);
      expect(code999).toBe("S999");
    });

    it("should generate continuous batch codes starting from currentMax + 1", () => {
      // Current max 5, generate 5 more -> C006..C010
      const result = GarageCodeGenerator.generateBatch("MOBIL", 5, 5);
      expect(result.startNumber).toBe(6);
      expect(result.endNumber).toBe(10);
      expect(result.codes).toEqual(["C006", "C007", "C008", "C009", "C010"]);
    });
  });

  describe("[UT-03] Boundary Value Analysis (BVA: Limit 999)", () => {
    it("should succeed when target reaches exactly the 999 maximum capacity", () => {
      // 998 existing + 1 new = 999
      const result = GarageCodeGenerator.generateBatch("MOBIL_LISTRIK", 998, 1);
      expect(result.endNumber).toBe(999);
      expect(result.codes).toEqual(["E999"]);
    });

    it("should throw CapacityExceededError when target exceeds 999 (e.g. 999 + 1 = 1000)", () => {
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

    it("should throw ValidationError when sequenceNumber < 1 or > 999", () => {
      expect(() => GarageCodeGenerator.formatCode("MOBIL", 0)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.formatCode("MOBIL", -1)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.formatCode("MOBIL", 1000)).toThrow(ValidationError);
    });

    it("should throw ValidationError when quantity <= 0 or currentMax < 0", () => {
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 0, 0)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", 5, -3)).toThrow(ValidationError);
      expect(() => GarageCodeGenerator.generateBatch("MOBIL", -1, 5)).toThrow(ValidationError);
    });
  });
});
