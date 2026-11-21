import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UnauthorizedError } from "@/domain/errors";

const loginSchema = z.object({
  email: z.string().trim().email("Format alamat email tidak valid.").toLowerCase(),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    // 1. Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Email atau kata sandi yang Anda masukkan salah.");
    }

    // 2. Verifikasi kata sandi dengan bcrypt
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Email atau kata sandi yang Anda masukkan salah.");
    }

    // 3. Penegakan aturan bisnis verifikasi identitas Penyewa
    if (user.role === "PENYEWA") {
      if (user.statusVerifikasi === "PENDING") {
        throw new UnauthorizedError(
          "Login ditolak: Akun Anda masih berstatus PENDING verifikasi KTP/NIK oleh Admin. Mohon tunggu proses peninjauan sebelum dapat masuk ke sistem."
        );
      }
      if (user.statusVerifikasi === "REJECTED") {
        throw new UnauthorizedError(
          "Login ditolak: Pendaftaran akun Anda telah DITOLAK oleh Admin. Silakan hubungi pengelola operasional garasi untuk bantuan."
        );
      }
    }

    // 4. Buat sesi JWT HTTP-only
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      statusVerifikasi: user.statusVerifikasi,
      namaLengkap: user.namaLengkap,
    });

    return successResponse({
      message: "Login berhasil! Selamat datang di sistem GARASIKU.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        namaLengkap: user.namaLengkap,
        statusVerifikasi: user.statusVerifikasi,
      },
      redirectTo: user.role === "ADMIN" ? "/admin" : "/penyewa/sewa-baru",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
