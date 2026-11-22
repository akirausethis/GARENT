/**
 * @file api-response.ts
 * @description Standardized API response formatter with domain error mapping.
 * Satisfies LSP Pemrogram UK 8 (Error Handling).
 */

import { NextResponse } from "next/server";
import { DomainError } from "../domain/errors";
import { ZodError } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Mengembalikan respons sukses dengan payload data terformat.
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Mengonversi pengecualian domain atau validasi Zod menjadi respons JSON HTTP yang rapi.
 */
export function errorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => e.message).join(", ");
    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  console.error("Unhandled API error:", error);
  const message = error instanceof Error ? error.message : "Terjadi kesalahan internal pada server.";
  
  // Deteksi status HTTP berbasis pesan domain umum
  let status = 500;
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("sesi anda telah berakhir") || lowerMsg.includes("belum login") || lowerMsg.includes("unauthorized")) {
    status = 401;
  } else if (
    lowerMsg.includes("akses ditolak") ||
    lowerMsg.includes("menunggu proses verifikasi") ||
    lowerMsg.includes("antrean verifikasi") ||
    lowerMsg.includes("hanya dapat diakses oleh admin") ||
    lowerMsg.includes("khusus untuk akun penyewa") ||
    lowerMsg.includes("forbidden")
  ) {
    status = 403;
  } else if (
    lowerMsg.includes("wajib") ||
    lowerMsg.includes("tidak valid") ||
    lowerMsg.includes("harus") ||
    lowerMsg.includes("melebihi")
  ) {
    status = 400;
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}
