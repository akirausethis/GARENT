import { destroySession } from "@/lib/auth";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  await destroySession();
  return successResponse({ message: "Sesi Anda telah berhasil diakhiri." });
}
