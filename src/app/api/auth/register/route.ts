import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthService } from "@/services/AuthService";
import { successResponse, errorResponse } from "@/lib/api-response";

const authService = new AuthService();

const registerSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Nomor KTP (NIK) harus terdiri dari tepat 16 digit angka."),
  namaLengkap: z.string().trim().min(3, "Nama lengkap harus terdiri dari minimal 3 karakter."),
  noTelepon: z
    .string()
    .trim()
    .min(10, "Nomor telepon harus terdiri dari minimal 10 digit.")
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor telepon Indonesia tidak valid."),
  email: z.string().trim().email("Format alamat email tidak valid.").toLowerCase(),
  password: z.string().min(8, "Kata sandi harus terdiri dari minimal 8 karakter."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse({
      nik: body.nik,
      namaLengkap: body.namaLengkap || body.fullName,
      noTelepon: body.noTelepon || body.phoneNumber,
      email: body.email,
      password: body.password,
    });

    const newUser = await authService.registerPenyewa({
      nik: data.nik,
      fullName: data.namaLengkap,
      phoneNumber: data.noTelepon,
      email: data.email,
      password: data.password,
    });

    return successResponse(
      {
        message:
          "Pendaftaran berhasil! Akun Anda sedang menunggu proses verifikasi identitas (KTP/NIK) oleh Admin.",
        user: newUser,
      },
      201
    );
  } catch (err) {
    return errorResponse(err);
  }
}
