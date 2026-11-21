import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { StatusVerifikasi } from "@/domain/types";
import { NotFoundError } from "@/domain/errors";

const verificationActionSchema = z.object({
  userId: z.string().uuid("ID Pengguna tidak valid."),
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as StatusVerifikasi | null;

    const whereClause: {
      role: "PENYEWA";
      statusVerifikasi?: StatusVerifikasi;
    } = {
      role: "PENYEWA",
    };

    if (status) {
      whereClause.statusVerifikasi = status;
    }

    const applicants = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        nik: true,
        namaLengkap: true,
        email: true,
        noTelepon: true,
        statusVerifikasi: true,
        verifiedById: true,
        createdAt: true,
        verifiedBy: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ applicants });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();

    const body = await req.json();
    const data = verificationActionSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser || targetUser.role !== "PENYEWA") {
      throw new NotFoundError("Akun penyewa yang dimaksud tidak ditemukan.");
    }

    const newStatus: StatusVerifikasi = data.action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        statusVerifikasi: newStatus,
        verifiedById: adminSession.userId,
      },
      select: {
        id: true,
        email: true,
        namaLengkap: true,
        nik: true,
        statusVerifikasi: true,
        verifiedById: true,
      },
    });

    const actionText = newStatus === "APPROVED" ? "disetujui" : "ditolak";
    return successResponse({
      message: `Akun penyewa atas nama ${updatedUser.namaLengkap} berhasil ${actionText}.`,
      user: updatedUser,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
