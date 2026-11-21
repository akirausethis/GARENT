import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await destroySession();
  return successResponse({ message: "Anda telah berhasil keluar dari sistem." });
}
