/**
 * @file AuthService.ts
 * @description OOP Service Class handling authentication, registration with KTP/NIK validation,
 * password hashing via bcryptjs, and identity verification approval queue.
 * Satisfies LSP Pemrogram UK 3, UK 4, and UK 8.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ForbiddenError, UnauthorizedError, ConflictError, ValidationError } from "@/domain/errors";

export interface RegisterPenyewaInput {
  nik: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

/**
 * Service Class untuk autentikasi pengguna dan alur verifikasi berkas identitas KTP.
 */
export class AuthService {
  /**
   * Mendaftarkan pengguna baru dengan peran 'penyewa':
   * - Validasi NIK tepat 16 digit numerik.
   * - Enkripsi password menggunakan bcryptjs (cost factor 10).
   * - Status awal akun SELALU 'pending'.
   */
  public async registerPenyewa(input: RegisterPenyewaInput) {
    const { nik, fullName, phoneNumber, email, password } = input;

    // 1. Validasi format NIK 16 digit
    if (!/^\d{16}$/.test(nik.trim())) {
      throw new Error("Nomor Induk Kependudukan (NIK) harus terdiri dari tepat 16 digit angka.");
    }

    if (!fullName || fullName.trim().length < 3) {
      throw new Error("Nama lengkap harus terdiri dari minimal 3 karakter.");
    }

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      throw new Error("Nomor telepon harus terdiri dari minimal 10 digit.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Format alamat email tidak valid.");
    }

    if (!password || password.length < 8) {
      throw new Error("Kata sandi harus terdiri dari minimal 8 karakter.");
    }

    // 2. Cek duplikasi email
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new Error("Alamat email ini sudah terdaftar. Silakan gunakan email lain atau login.");
    }

    // 3. Cek duplikasi NIK
    const existingNik = await prisma.user.findUnique({
      where: { nik: nik.trim() },
    });
    if (existingNik) {
      throw new Error("Nomor Induk Kependudukan (NIK) ini sudah pernah didaftarkan di sistem.");
    }

    // 4. Hash kata sandi
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Simpan user dengan status 'pending'
    return prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "penyewa",
        nik: nik.trim(),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        verificationStatus: "pending",
      },
      select: {
        id: true,
        email: true,
        nik: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });
  }

  /**
   * Melakukan autentikasi kredensial pengguna (Admin & Penyewa):
   * - Memverifikasi email dan password hash.
   * - Memblokir login bagi akun Penyewa yang masih berstatus 'pending' atau 'rejected'.
   */
  public async loginUser(input: LoginUserInput) {
    const { email, password } = input;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Temukan user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError("Email atau kata sandi yang Anda masukkan salah.");
    }

    // 2. Verifikasi kecocokan kata sandi
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Email atau kata sandi yang Anda masukkan salah.");
    }

    // 3. Blokir penyewa yang belum diverifikasi
    if (user.role === "penyewa") {
      if (user.verificationStatus === "pending") {
        throw new ForbiddenError(
          "Login ditolak: Akun Anda masih dalam antrean verifikasi KTP/NIK oleh Admin. Mohon tunggu proses peninjauan."
        );
      }
      if (user.verificationStatus === "rejected") {
        throw new ForbiddenError(
          "Login ditolak: Pendaftaran akun Anda telah ditolak oleh Admin. Silakan hubungi pengelola operasional garasi."
        );
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      verificationStatus: user.verificationStatus,
    };
  }

  /**
   * Memproses verifikasi pendaftar baru oleh Admin (menerima atau menolak).
   */
  public async verifyPenyewa(userId: string, decision: "approved" | "rejected") {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.role !== "penyewa") {
      throw new Error("Akun pemohon sewa tidak ditemukan.");
    }

    return prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: decision },
      select: {
        id: true,
        email: true,
        fullName: true,
        nik: true,
        verificationStatus: true,
      },
    });
  }

  /**
   * Mengambil daftar pemohon penyewa untuk antrean verifikasi Admin.
   */
  public async getApplicants(status?: "pending" | "approved" | "rejected") {
    return prisma.user.findMany({
      where: {
        role: "penyewa",
        ...(status ? { verificationStatus: status } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        nik: true,
        verificationStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================================================================
  // LSP Service Layer Compatibility Methods
  // ============================================================================

  public validateLoginInput(email: string, password: string): void {
    const cleanEmail = email?.trim() ?? "";
    const cleanPassword = password ?? "";

    if (!cleanEmail) {
      throw new Error("Email wajib diisi.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      throw new Error("Format email tidak valid (harus mengandung @ dan domain yang benar).");
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error("Password minimal harus 6 karakter.");
    }
  }

  public validateRegistrationInput(input: {
    nik: string;
    fullName: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): void {
    const nik = input.nik?.trim() ?? "";
    const fullName = input.fullName?.trim() ?? "";
    const phone = input.phone?.trim() ?? "";
    const email = input.email?.trim() ?? "";
    const password = input.password ?? "";

    if (!nik || !/^\d{8,20}$/.test(nik)) {
      throw new Error("NIK (No. KTP) wajib diisi berupa angka 8-20 digit.");
    }
    if (!fullName || fullName.length < 2) {
      throw new Error("Nama lengkap wajib diisi minimal 2 karakter.");
    }
    if (!phone || !/^[0-9+\-\s]{8,20}$/.test(phone)) {
      throw new Error("Nomor telepon tidak valid (minimal 8 digit).");
    }
    if (!email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email)) {
      throw new Error("Email harus menggunakan format @gmail.com yang valid.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password minimal harus 6 karakter.");
    }
    if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
      throw new Error("Konfirmasi password tidak cocok.");
    }
  }

  public canTenantRent(user: { role: string; status?: string; verificationStatus?: string }): boolean {
    const status = user.status || user.verificationStatus;
    return user.role === "penyewa" && status === "approved";
  }

  public ensureTenantApproved(user: { role: string; status?: string; verificationStatus?: string }): void {
    const status = user.status || user.verificationStatus;
    if (user.role !== "penyewa") {
      throw new Error("Hanya akun dengan role penyewa yang dapat menyewa garasi.");
    }
    if (status === "pending") {
      throw new Error(
        "Akun Anda berstatus pending dan belum diverifikasi Admin. Anda belum dapat menyewa garasi."
      );
    }
    if (status === "rejected") {
      throw new Error("Akun Anda ditolak oleh Admin sehingga tidak dapat menyewa garasi.");
    }
  }
}
