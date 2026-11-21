import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthService } from "@/services/AuthService";
import { createSession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().trim().email("Format alamat email tidak valid.").toLowerCase(),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await authService.loginUser(data);

    // Buat sesi JWT HTTP-only
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      statusVerifikasi: user.verificationStatus as any,
      namaLengkap: user.fullName,
    });

    return successResponse({
      message: "Login berhasil! Selamat datang di sistem GARENT (Garage Rental).",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        namaLengkap: user.fullName,
        statusVerifikasi: user.verificationStatus,
      },
      redirectTo: user.role === "admin" ? "/admin/garasi" : "/penyewa/sewa-baru",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
