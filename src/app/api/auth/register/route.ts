import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { ConflictError } from "@/domain/errors";

const registerSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Nomor KTP (NIK) harus terdiri dari tepat 16 digit angka."),
  namaLengkap: z
    .string()
    .trim()
    .min(3, "Nama lengkap harus terdiri dari minimal 3 karakter."),
  noTelepon: z
    .string()
    .trim()
    .min(10, "Nomor telepon harus terdiri dari minimal 10 digit.")
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor telepon Indonesia tidak valid."),
  email: z
    .string()
    .trim()
    .email("Format alamat email tidak valid.")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Kata sandi harus terdiri dari minimal 8 karakter."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // 1. Cek apakah email sudah terdaftar
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictError("Alamat email ini sudah terdaftar. Silakan gunakan email lain atau login.");
    }

    // 2. Cek apakah NIK sudah terdaftar
    const existingNik = await prisma.user.findUnique({
      where: { nik: data.nik },
    });
    if (existingNik) {
      throw new ConflictError("Nomor Induk Kependudukan (NIK) ini sudah pernah didaftarkan.");
    }

    // 3. Enkripsi kata sandi menggunakan bcryptjs (cost factor 10)
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 4. Simpan ke database dengan status awal PENDING
    const newUser = await prisma.user.create({
      data: {
        nik: data.nik,
        namaLengkap: data.namaLengkap,
        noTelepon: data.noTelepon,
        email: data.email,
        passwordHash,
        role: "PENYEWA",
        statusVerifikasi: "PENDING",
      },
      select: {
        id: true,
        email: true,
        nik: true,
        namaLengkap: true,
        noTelepon: true,
        role: true,
        statusVerifikasi: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        message: "Pendaftaran berhasil! Akun Anda sedang menunggu proses verifikasi identitas (KTP/NIK) oleh Admin.",
        user: newUser,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
