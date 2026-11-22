import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AuthService } from "@/services/AuthService";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const authService = new AuthService();

const verificationActionSchema = z.object({
  userId: z.string().uuid("ID Pengguna tidak valid."),
  action: z.enum(["approved", "rejected", "APPROVE", "REJECT"]),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam && statusParam !== "ALL"
        ? (statusParam.toLowerCase() as "pending" | "approved" | "rejected")
        : undefined;

    const applicants = await authService.getApplicants(status);

    const formatted = applicants.map((a) => ({
      id: a.id,
      nik: a.nik,
      fullName: a.fullName,
      namaLengkap: a.fullName,
      email: a.email,
      phoneNumber: a.phoneNumber,
      noTelepon: a.phoneNumber,
      verificationStatus: a.verificationStatus.toLowerCase(),
      statusVerifikasi: a.verificationStatus.toUpperCase(),
      createdAt: a.createdAt.toISOString(),
    }));

    return successResponse({ applicants: formatted });
  } catch (err) {
    return errorResponse(err);
  }
}

async function processVerification(req: NextRequest) {
  await requireAdmin();

  const body = await req.json();
  const data = verificationActionSchema.parse(body);

  const decision: "approved" | "rejected" =
    data.action.toLowerCase() === "approve" || data.action.toLowerCase() === "approved"
      ? "approved"
      : "rejected";

  const updatedUser = await authService.verifyPenyewa(data.userId, decision);

  const actionText = decision === "approved" ? "disetujui" : "ditolak";
  return successResponse({
    message: `Akun penyewa atas nama ${updatedUser.fullName} berhasil ${actionText}.`,
    user: updatedUser,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    return await processVerification(req);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await processVerification(req);
  } catch (err) {
    return errorResponse(err);
  }
}
