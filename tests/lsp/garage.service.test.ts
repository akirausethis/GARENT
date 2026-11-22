import { describe, expect, it } from 'vitest';
import { GarageService } from '@/services/GarageService';

describe('GarageService - Logika Penomoran & Kompatibilitas Garasi', () => {
  const garageService = new GarageService();

  describe('Generate Kode Garasi Incremental (S001, C010, E001) & Batas Maks 999', () => {
    it('harus menghasilkan S001, S002, S003 saat belum ada garasi sepeda di database', () => {
      const codes = garageService.generateIncrementalCodes('sepeda', 3, null);
      expect(codes).toEqual(['S001', 'S002', 'S003']);
    });

    it('harus melanjutkan penomoran incremental dari kode terakhir (misal C008 -> C009, C010, C011)', () => {
      const codes = garageService.generateIncrementalCodes('mobil', 3, 'C008');
      expect(codes).toEqual(['C009', 'C010', 'C011']);
    });

    it('harus menghasilkan kode E001 dst untuk tipe mobil_listrik', () => {
      const codes = garageService.generateIncrementalCodes('mobil_listrik', 2, null);
      expect(codes).toEqual(['E001', 'E002']);

      const nextCodes = garageService.generateIncrementalCodes(
        'mobil_listrik',
        2,
        'E009'
      );
      expect(nextCodes).toEqual(['E010', 'E011']);
    });

    it('harus mengizinkan pembuatan tepat hingga batas ke-999', () => {
      const codes = garageService.generateIncrementalCodes('sepeda', 5, 'S994');
      expect(codes).toEqual(['S995', 'S996', 'S997', 'S998', 'S999']);
    });

    it('harus menolak jika jumlah unit melebihi batas maksimal 999', () => {
      expect(() =>
        garageService.generateIncrementalCodes('sepeda', 1000, null)
      ).toThrow(/999/);

      expect(() =>
        garageService.generateIncrementalCodes('mobil', 5, 'C995')
      ).toThrow(/999/);

      expect(() =>
        garageService.generateIncrementalCodes('mobil_listrik', 1, 'E999')
      ).toThrow(/999/);
    });

    it('harus menolak quantity kurang dari 1 atau bukan integer', () => {
      expect(() =>
        garageService.generateIncrementalCodes('sepeda', 0, null)
      ).toThrow();
      expect(() =>
        garageService.generateIncrementalCodes('sepeda', -2, null)
      ).toThrow();
      expect(() =>
        garageService.generateIncrementalCodes('sepeda', 2.5, null)
      ).toThrow();
    });
  });

  describe('Validasi Kesesuaian Tipe Kendaraan vs Tipe Garasi', () => {
    it('sepeda hanya boleh memilih garasi sepeda (S)', () => {
      expect(garageService.getAllowedGarageTypes('sepeda')).toEqual(['sepeda']);
      expect(garageService.isVehicleCompatibleWithGarage('sepeda', 'sepeda')).toBe(
        true
      );
      expect(garageService.isVehicleCompatibleWithGarage('sepeda', 'mobil')).toBe(
        false
      );
      expect(
        garageService.isVehicleCompatibleWithGarage('sepeda', 'mobil_listrik')
      ).toBe(false);
    });

    it('sepeda_motor hanya boleh memilih garasi sepeda (S)', () => {
      expect(garageService.getAllowedGarageTypes('sepeda_motor')).toEqual([
        'sepeda',
      ]);
      expect(
        garageService.isVehicleCompatibleWithGarage('sepeda_motor', 'sepeda')
      ).toBe(true);
      expect(
        garageService.isVehicleCompatibleWithGarage('sepeda_motor', 'mobil')
      ).toBe(false);
      expect(
        garageService.isVehicleCompatibleWithGarage(
          'sepeda_motor',
          'mobil_listrik'
        )
      ).toBe(false);
    });

    it('mobil hanya boleh memilih garasi mobil (C)', () => {
      expect(garageService.getAllowedGarageTypes('mobil')).toEqual(['mobil']);
      expect(garageService.isVehicleCompatibleWithGarage('mobil', 'mobil')).toBe(
        true
      );
      expect(garageService.isVehicleCompatibleWithGarage('mobil', 'sepeda')).toBe(
        false
      );
      expect(
        garageService.isVehicleCompatibleWithGarage('mobil', 'mobil_listrik')
      ).toBe(false);
    });

    it('mobil_listrik boleh memilih garasi mobil (C) atau garasi mobil_listrik (E)', () => {
      expect(garageService.getAllowedGarageTypes('mobil_listrik')).toEqual([
        'mobil',
        'mobil_listrik',
      ]);
      expect(
        garageService.isVehicleCompatibleWithGarage('mobil_listrik', 'mobil')
      ).toBe(true);
      expect(
        garageService.isVehicleCompatibleWithGarage(
          'mobil_listrik',
          'mobil_listrik'
        )
      ).toBe(true);
      expect(
        garageService.isVehicleCompatibleWithGarage('mobil_listrik', 'sepeda')
      ).toBe(false);
    });
  });
});
