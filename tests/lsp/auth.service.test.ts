import { describe, expect, it } from 'vitest';
import { translateError } from '@/lib/errors';
import { AuthService } from '@/services/AuthService';

describe('AuthService - Validasi Registrasi, Login & Status Verifikasi Penyewa', () => {
  const authService = new AuthService();

  it('menerima data registrasi penyewa yang valid menggunakan format @gmail.com', () => {
    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi.santoso@gmail.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    ).not.toThrow();
  });

  it('menolak registrasi jika email tidak menggunakan domain @gmail.com atau bukan format email', () => {
    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    ).toThrow(/@gmail\.com/i);

    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@yahoo.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    ).toThrow(/@gmail\.com/i);

    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budisantoso',
        password: 'password123',
        confirmPassword: 'password123',
      })
    ).toThrow(/@gmail\.com/i);
  });

  it('menolak registrasi jika NIK tidak valid, password < 6 karakter, atau konfirmasi password tidak cocok', () => {
    expect(() =>
      authService.validateRegistrationInput({
        nik: '123',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@gmail.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    ).toThrow(/NIK/i);

    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@gmail.com',
        password: '123',
        confirmPassword: '123',
      })
    ).toThrow(/minimal harus 6 karakter/i);

    expect(() =>
      authService.validateRegistrationInput({
        nik: '3201012111950001',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        email: 'budi@gmail.com',
        password: 'password123',
        confirmPassword: 'password456',
      })
    ).toThrow(/Konfirmasi password tidak cocok/i);
  });

  it('validasi login mengizinkan email admin@garasi.com dan @gmail.com, serta menolak bukan email atau password < 6 karakter', () => {
    expect(() =>
      authService.validateLoginInput('admin@garasi.com', 'admin123')
    ).not.toThrow();

    expect(() =>
      authService.validateLoginInput('budi@gmail.com', 'secret123')
    ).not.toThrow();

    expect(() =>
      authService.validateLoginInput('admin', 'admin123')
    ).toThrow(/Format email tidak valid/i);

    expect(() =>
      authService.validateLoginInput('admin@garasi.com', '12345')
    ).toThrow(/minimal harus 6 karakter/i);
  });

  it('penyewa berstatus pending atau rejected dilarang menyewa garasi', () => {
    expect(
      authService.canTenantRent({ role: 'penyewa', status: 'pending' })
    ).toBe(false);
    expect(
      authService.canTenantRent({ role: 'penyewa', status: 'rejected' })
    ).toBe(false);
    expect(
      authService.canTenantRent({ role: 'admin', status: 'approved' })
    ).toBe(false);
    expect(
      authService.canTenantRent({ role: 'penyewa', status: 'approved' })
    ).toBe(true);

    expect(() =>
      authService.ensureTenantApproved({ role: 'penyewa', status: 'pending' })
    ).toThrow(/pending/i);
    expect(() =>
      authService.ensureTenantApproved({ role: 'penyewa', status: 'rejected' })
    ).toThrow(/ditolak/i);
    expect(() =>
      authService.ensureTenantApproved({ role: 'penyewa', status: 'approved' })
    ).not.toThrow();
  });

  it('translateError menerjemahkan error teknis Supabase/PostgreSQL & jaringan ke Bahasa Indonesia', () => {
    expect(
      translateError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "users_email_key"',
      })
    ).toMatch(/Email sudah terdaftar/i);

    expect(
      translateError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "users_nik_key"',
      })
    ).toMatch(/NIK sudah terdaftar/i);

    expect(translateError(new Error('Failed to fetch'))).toMatch(
      /Koneksi ke server terputus/i
    );

    expect(
      translateError(new Error('The object exceeded the maximum allowed size'))
    ).toMatch(/maksimal 5 MB/i);
  });
});
