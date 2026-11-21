/**
 * @file auth.ts
 * @description Secure Authentication & Session Guard using HTTP-only signed JWTs (jose).
 * Satisfies LSP Pemrogram UK 8 (Security & Error Handling).
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role, StatusVerifikasi } from "../domain/types";
import { UnauthorizedError, ForbiddenError } from "../domain/errors";

const COOKIE_NAME = "garasiku_session";
const DEFAULT_SECRET = "garasiku-super-secret-jwt-signing-key-32chars-min!";
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || DEFAULT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  statusVerifikasi: StatusVerifikasi;
  namaLengkap: string;
}

/**
 * Membuat token JWT sesi terenkripsi dan menyimpannya di HTTP-only cookie.
 *
 * @param payload - Informasi identitas pengguna yang disimpan dalam sesi.
 * @returns Token JWT terformat.
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 jam
  });

  return token;
}

/**
 * Membaca dan memverifikasi token sesi dari HTTP-only cookie.
 *
 * @returns Data sesi terverifikasi atau null jika sesi kedaluwarsa/tidak ada.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as Role,
      statusVerifikasi: payload.statusVerifikasi as StatusVerifikasi,
      namaLengkap: payload.namaLengkap as string,
    };
  } catch {
    return null;
  }
}

/**
 * Menghapus sesi pengguna dengan menghapus cookie sesi.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Penjaga rute: Memastikan pengguna sudah terautentikasi.
 *
 * @returns Data sesi pengguna.
 * @throws {UnauthorizedError} Jika tidak ada sesi valid.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("Sesi Anda telah berakhir. Silakan login kembali.");
  }
  return session;
}

/**
 * Penjaga rute khusus Penyewa:
 * Memastikan pengguna memiliki peran PENYEWA dan status verifikasi APPROVED.
 * Jika status masih PENDING atau REJECTED, akan dilemparkan pesan informatif bahasa Indonesia.
 *
 * @returns Data sesi Penyewa yang disetujui.
 * @throws {UnauthorizedError | ForbiddenError}
 */
export async function requireApprovedPenyewa(): Promise<SessionPayload> {
  const session = await requireAuth();

  if (session.role !== "PENYEWA") {
    throw new ForbiddenError("Akses khusus untuk akun Penyewa.");
  }

  if (session.statusVerifikasi === "PENDING") {
    throw new ForbiddenError(
      "Akun Anda sedang dalam proses verifikasi KTP/NIK oleh Admin. Anda belum dapat melakukan penyewaan garasi hingga akun disetujui."
    );
  }

  if (session.statusVerifikasi === "REJECTED") {
    throw new ForbiddenError(
      "Pendaftaran akun Anda ditolak oleh Admin. Silakan hubungi operator garasi untuk klarifikasi data NIK/KTP."
    );
  }

  return session;
}

/**
 * Penjaga rute khusus Admin:
 * Memastikan pengguna memiliki peran ADMIN.
 *
 * @returns Data sesi Admin.
 * @throws {ForbiddenError}
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new ForbiddenError("Akses ditolak. Halaman ini hanya dapat diakses oleh Admin.");
  }
  return session;
}
