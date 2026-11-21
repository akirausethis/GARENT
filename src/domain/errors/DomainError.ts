/**
 * @file DomainError.ts
 * @description Hierarchy of typed domain errors for GARENT (Garage Rental).
 * Satisfies LSP Pemrogram UK 8 (Error Handling) and UK 7 (Code Documentation).
 */

/**
 * Kelas dasar error domain untuk seluruh pengecualian bisnis di GARENT.
 */
export abstract class DomainError extends Error {
  public abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Pengecualian ketika data input tidak valid atau melanggar aturan format.
 * (Contoh: jumlah hari sewa harian <= 0 atau > 30, plat nomor kosong untuk kendaraan bermotor).
 */
export class ValidationError extends DomainError {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika tipe kendaraan tidak kompatibel dengan tipe garasi.
 * (Contoh: Mobil bensin masuk ke Garasi Sepeda).
 */
export class CompatibilityError extends DomainError {
  public readonly statusCode = 422;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika kuantitas garasi melebihi kapasitas maksimum yang diizinkan (999).
 */
export class CapacityExceededError extends DomainError {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika terjadi konflik konkurensi atau data ganda.
 * (Contoh: Garasi baru saja disewa oleh penyewa lain, email/NIK sudah terdaftar).
 */
export class ConflictError extends DomainError {
  public readonly statusCode = 409;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika entitas yang dicari tidak ditemukan di sistem.
 */
export class NotFoundError extends DomainError {
  public readonly statusCode = 404;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika pengguna belum terautentikasi atau akun belum disetujui (PENDING/REJECTED).
 */
export class UnauthorizedError extends DomainError {
  public readonly statusCode = 401;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Pengecualian ketika pengguna tidak memiliki hak akses role tertentu (Forbidden).
 */
export class ForbiddenError extends DomainError {
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
  }
}
