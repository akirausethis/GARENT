import { describe, expect, it } from 'vitest';
import { RentalService } from '@/services/RentalService';
import { RentalWithDetails } from '@/types';

describe('RentalService - Validasi Durasi, Biaya Sewa, Listrik EV, Tanggal & Laporan', () => {
  const rentalService = new RentalService();

  describe('Validasi Batas Durasi & Perhitungan Biaya Sewa (Harian & Bulanan)', () => {
    it('menghitung jumlah hari dalam bulan dan batas maksimal sewa harian secara dinamis', () => {
      // Februari non-kabisat (28 hari -> maks 27 hari)
      expect(RentalService.getDaysInMonth('2026-02-10')).toBe(28);
      expect(RentalService.getMaxDailyDuration('2026-02-10')).toBe(27);

      // Februari kabisat (29 hari -> maks 28 hari)
      expect(RentalService.getDaysInMonth('2024-02-10')).toBe(29);
      expect(RentalService.getMaxDailyDuration('2024-02-10')).toBe(28);

      // Bulan 30 hari (November -> maks 29 hari)
      expect(RentalService.getDaysInMonth('2026-11-21')).toBe(30);
      expect(RentalService.getMaxDailyDuration('2026-11-21')).toBe(29);

      // Bulan 31 hari (Desember / Januari -> maks 30 hari)
      expect(RentalService.getDaysInMonth('2026-12-05')).toBe(31);
      expect(RentalService.getMaxDailyDuration('2026-12-05')).toBe(30);
      expect(RentalService.getDaysInMonth('2026-01-15')).toBe(31);
      expect(RentalService.getMaxDailyDuration('2026-01-15')).toBe(30);
    });

    it('sewa harian pada bulan 28 hari (Februari) menerima maks 27 hari dan menolak >= 28 hari', () => {
      const febStart = '2026-02-05';
      expect(() => rentalService.validateDuration('harian', 1, febStart)).not.toThrow();
      expect(() => rentalService.validateDuration('harian', 27, febStart)).not.toThrow();
      expect(
        rentalService.calculateRentalCost('harian', 50000, 27, febStart)
      ).toBe(1350000);

      expect(() => rentalService.validateDuration('harian', 28, febStart)).toThrow(
        /maksimal adalah 27 hari/i
      );
      expect(() =>
        rentalService.calculateRentalCost('harian', 50000, 28, febStart)
      ).toThrow(/maksimal adalah 27 hari/i);
    });

    it('sewa harian pada bulan kabisat 29 hari (Februari 2024) menerima maks 28 hari dan menolak >= 29 hari', () => {
      const leapFebStart = '2024-02-01';
      expect(() =>
        rentalService.validateDuration('harian', 28, leapFebStart)
      ).not.toThrow();
      expect(() =>
        rentalService.validateDuration('harian', 29, leapFebStart)
      ).toThrow(/maksimal adalah 28 hari/i);
    });

    it('sewa harian pada bulan 30 hari (November) menerima maks 29 hari dan menolak >= 30 hari', () => {
      const novStart = '2026-11-21';
      expect(() => rentalService.validateDuration('harian', 29, novStart)).not.toThrow();
      expect(
        rentalService.calculateRentalCost('harian', 50000, 29, novStart)
      ).toBe(1450000);

      expect(() => rentalService.validateDuration('harian', 30, novStart)).toThrow(
        /maksimal adalah 29 hari/i
      );
      expect(() =>
        rentalService.calculateRentalCost('harian', 50000, 30, novStart)
      ).toThrow(/maksimal adalah 29 hari/i);
    });

    it('sewa harian pada bulan 31 hari (Desember) menerima maks 30 hari dan menolak >= 31 hari', () => {
      const decStart = '2026-12-10';
      expect(() => rentalService.validateDuration('harian', 30, decStart)).not.toThrow();
      expect(
        rentalService.calculateRentalCost('harian', 50000, 30, decStart)
      ).toBe(1500000);

      expect(() => rentalService.validateDuration('harian', 31, decStart)).toThrow(
        /maksimal adalah 30 hari/i
      );
      expect(() =>
        rentalService.calculateRentalCost('harian', 50000, 31, decStart)
      ).toThrow(/maksimal adalah 30 hari/i);
    });

    it('sewa harian menggunakan bulan hari ini jika startDate tidak diisi dan menolak durasi <= 0', () => {
      const todayMax = RentalService.getMaxDailyDuration();
      expect(() => rentalService.validateDuration('harian', 1)).not.toThrow();
      expect(() => rentalService.validateDuration('harian', todayMax)).not.toThrow();
      expect(() =>
        rentalService.validateDuration('harian', todayMax + 1)
      ).toThrow();

      expect(rentalService.calculateRentalCost('harian', 50000, 1)).toBe(50000);
      expect(rentalService.calculateRentalCost('harian', 50000, 10)).toBe(500000);

      expect(() => rentalService.validateDuration('harian', 0)).toThrow();
      expect(() => rentalService.validateDuration('harian', -3)).toThrow();
    });

    it('sewa bulanan maksimal 1 bulan (30 hari) dan menghitung harga 25 * daily_price', () => {
      expect(() => rentalService.validateDuration('bulanan', 1)).not.toThrow();
      expect(() => rentalService.validateDuration('bulanan', 30)).not.toThrow();

      expect(rentalService.calculateRentalCost('bulanan', 50000, 30)).toBe(
        1250000
      );
      expect(rentalService.calculateRentalCost('bulanan', 100000)).toBe(
        2500000
      );
    });

    it('sewa bulanan menolak durasi lebih dari 1 bulan per transaksi', () => {
      expect(() => rentalService.validateDuration('bulanan', 2)).toThrow();
      expect(() => rentalService.validateDuration('bulanan', 31)).toThrow();
      expect(() => rentalService.validateDuration('bulanan', 60)).toThrow();
      expect(() =>
        rentalService.calculateRentalCost('bulanan', 50000, 2)
      ).toThrow();
    });
  });

  describe('Perhitungan Biaya Isi Listrik EV ((max - current) * kwh_price)', () => {
    it('menghitung biaya listrik penuh untuk mobil_listrik di garasi mobil_listrik (E)', () => {
      const listrik = rentalService.calculateElectricityCost({
        vehicleType: 'mobil_listrik',
        garageType: 'mobil_listrik',
        maxBatteryKwh: 75,
        currentBatteryKwh: 25,
        kwhPrice: 2500,
      });
      // (75 - 25) * 2500 = 125.000
      expect(listrik).toBe(125000);
    });

    it('biaya listrik harus 0 jika mobil_listrik masuk ke garasi mobil biasa (C)', () => {
      const listrik = rentalService.calculateElectricityCost({
        vehicleType: 'mobil_listrik',
        garageType: 'mobil',
        maxBatteryKwh: 75,
        currentBatteryKwh: 25,
        kwhPrice: 2500,
      });
      expect(listrik).toBe(0);
    });

    it('biaya listrik harus 0 untuk kendaraan non-EV', () => {
      expect(
        rentalService.calculateElectricityCost({
          vehicleType: 'mobil',
          garageType: 'mobil',
        })
      ).toBe(0);
      expect(
        rentalService.calculateElectricityCost({
          vehicleType: 'sepeda',
          garageType: 'sepeda',
        })
      ).toBe(0);
    });

    it('menghitung total biaya gabungan sewa + listrik secara akurat', () => {
      const breakdown = rentalService.calculateTotalCost({
        rentalType: 'bulanan',
        dailyPrice: 100000,
        vehicleType: 'mobil_listrik',
        garageType: 'mobil_listrik',
        maxBatteryKwh: 60,
        currentBatteryKwh: 10,
        kwhPrice: 3000,
      });

      expect(breakdown).toEqual({
        rentalCost: 2500000, // 25 * 100.000
        electricityCost: 150000, // (60 - 10) * 3.000
        totalCost: 2650000,
      });
    });

    it('menolak input kendaraan mobil_listrik jika current_battery_kwh > max_battery_kwh', () => {
      expect(() =>
        rentalService.validateVehicleInput({
          vehicleType: 'mobil_listrik',
          licensePlate: 'B 1234 EV',
          vehicleBrand: 'Hyundai Ioniq 5',
          maxBatteryKwh: 70,
          currentBatteryKwh: 80,
        })
      ).toThrow(/current_battery_kwh/i);
    });

    it('mengizinkan sepeda tanpa nomor plat dan mewajibkan nomor plat untuk selain sepeda', () => {
      expect(() =>
        rentalService.validateVehicleInput({
          vehicleType: 'sepeda',
          licensePlate: null,
          vehicleBrand: 'Polygon Strattos',
        })
      ).not.toThrow();

      expect(() =>
        rentalService.validateVehicleInput({
          vehicleType: 'sepeda_motor',
          licensePlate: '',
          vehicleBrand: 'Honda Vario 160',
        })
      ).toThrow(/plat/i);
    });
  });

  describe('Perhitungan Tanggal Selesai Otomatis & Biaya Perpanjangan Sewa', () => {
    it('menghitung tanggal selesai sewa harian secara presisi termasuk lintas bulan/tahun', () => {
      expect(rentalService.calculateEndDate('2026-11-21', 'harian', 5)).toBe(
        '2026-11-26'
      );
      expect(rentalService.calculateEndDate('2026-11-21', 'harian', 15)).toBe(
        '2026-12-06'
      );
      expect(rentalService.calculateEndDate('2026-12-20', 'harian', 20)).toBe(
        '2027-01-09'
      );
    });

    it('menghitung tanggal selesai sewa bulanan sesuai tanggal yang sama di bulan berikutnya', () => {
      expect(rentalService.calculateEndDate('2026-11-21', 'bulanan')).toBe(
        '2026-12-21'
      );
      expect(rentalService.calculateEndDate('2026-12-15', 'bulanan')).toBe(
        '2027-01-15'
      );
      // Penyesuaian akhir bulan saat tanggal tidak tersedia di bulan Februari
      expect(rentalService.calculateEndDate('2026-01-31', 'bulanan')).toBe(
        '2026-02-28'
      );
    });

    it('menghitung selisih hari perpanjangan dan biaya tambahan dengan benar', () => {
      const ext = rentalService.calculateExtension(
        '2026-11-25',
        '2026-12-02',
        60000
      );
      expect(ext).toEqual({
        additionalDays: 7,
        additionalCost: 420000,
      });
    });

    it('menolak perpanjangan jika tanggal selesai baru <= tanggal selesai saat ini', () => {
      expect(() =>
        rentalService.calculateExtension('2026-11-25', '2026-11-25', 60000)
      ).toThrow();
      expect(() =>
        rentalService.calculateExtension('2026-11-25', '2026-11-24', 60000)
      ).toThrow();
    });
  });

  describe('Filter Laporan Sewa Garasi (4 Filter Lengkap)', () => {
    const sampleRentals: RentalWithDetails[] = [
      {
        id: 'r1',
        user_id: 'u1',
        garage_id: 'g1',
        vehicle_type: 'sepeda',
        license_plate: null,
        vehicle_brand: 'Brompton',
        max_battery_kwh: null,
        current_battery_kwh: null,
        rental_type: 'harian',
        duration_days: 5,
        start_date: '2026-11-21',
        end_date: '2026-11-26',
        rental_cost: 75000,
        electricity_cost: 0,
        total_cost: 75000,
        payment_proof_url: 'https://example.com/p1.jpg',
        status: 'active',
        created_at: '2026-11-21T08:00:00Z',
        garage: {
          id: 'g1',
          code: 'S001',
          type: 'sepeda',
          daily_price: 15000,
          kwh_price: 0,
          status: 'used',
        },
      },
      {
        id: 'r2',
        user_id: 'u2',
        garage_id: 'g2',
        vehicle_type: 'mobil_listrik',
        license_plate: 'B 888 EV',
        vehicle_brand: 'BYD Seal',
        max_battery_kwh: 80,
        current_battery_kwh: 20,
        rental_type: 'bulanan',
        duration_days: 30,
        start_date: '2026-11-10',
        end_date: '2026-12-10',
        rental_cost: 2500000,
        electricity_cost: 120000,
        total_cost: 2620000,
        payment_proof_url: 'https://example.com/p2.jpg',
        status: 'active',
        created_at: '2026-11-10T08:00:00Z',
        garage: {
          id: 'g2',
          code: 'E001',
          type: 'mobil_listrik',
          daily_price: 100000,
          kwh_price: 2000,
          status: 'used',
        },
      },
      {
        id: 'r3',
        user_id: 'u1',
        garage_id: 'g3',
        vehicle_type: 'mobil',
        license_plate: 'B 123 ABC',
        vehicle_brand: 'Toyota Innova',
        max_battery_kwh: null,
        current_battery_kwh: null,
        rental_type: 'harian',
        duration_days: 3,
        start_date: '2026-10-05',
        end_date: '2026-10-08',
        rental_cost: 240000,
        electricity_cost: 0,
        total_cost: 240000,
        payment_proof_url: 'https://example.com/p3.jpg',
        status: 'completed',
        created_at: '2026-10-05T08:00:00Z',
        garage: {
          id: 'g3',
          code: 'C001',
          type: 'mobil',
          daily_price: 80000,
          kwh_price: 0,
          status: 'available',
        },
      },
    ];

    it('filter 1: per bulan dalam tahun tertentu', () => {
      const res = rentalService.filterRentals(sampleRentals, {
        year: 2026,
        month: 11,
      });
      expect(res.map((r) => r.id)).toEqual(['r1', 'r2']);
    });

    it('filter 2: per hari dalam bulan tertentu', () => {
      const resByParts = rentalService.filterRentals(sampleRentals, {
        year: 2026,
        month: 11,
        day: 21,
      });
      expect(resByParts.map((r) => r.id)).toEqual(['r1']);

      const resByExact = rentalService.filterRentals(sampleRentals, {
        exactDate: '2026-10-05',
      });
      expect(resByExact.map((r) => r.id)).toEqual(['r3']);
    });

    it('filter 3: per tipe garasi', () => {
      const res = rentalService.filterRentals(sampleRentals, {
        garageType: 'mobil_listrik',
      });
      expect(res.map((r) => r.id)).toEqual(['r2']);
    });

    it('filter 4: per penyewa', () => {
      const res = rentalService.filterRentals(sampleRentals, {
        userId: 'u1',
      });
      expect(res.map((r) => r.id)).toEqual(['r1', 'r3']);
    });
  });
});
