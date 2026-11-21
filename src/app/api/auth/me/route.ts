import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      throw new Error("Belum ada sesi aktif.");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        nik: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        verificationStatus: true,
      },
    });

    if (!user) {
      throw new Error("Data pengguna tidak ditemukan.");
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        nik: user.nik,
        namaLengkap: user.fullName,
        fullName: user.fullName,
        noTelepon: user.phoneNumber,
        phoneNumber: user.phoneNumber,
        role: user.role,
        statusVerifikasi: user.verificationStatus,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
