import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UnauthorizedError } from "@/domain/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      throw new UnauthorizedError("Tidak ada sesi login aktif.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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

    if (!user) {
      throw new UnauthorizedError("Pengguna tidak ditemukan.");
    }

    return successResponse({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
