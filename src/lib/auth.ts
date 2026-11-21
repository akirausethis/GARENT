/**
 * @file auth.ts
 * @description Secure Authentication & Session Guard using HTTP-only signed JWTs (jose).
 * Satisfies LSP Pemrogram UK 8 (Security & Error Handling).
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "garent_session";
const DEFAULT_SECRET = "garent-super-secret-jwt-signing-key-32chars-min!";
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || DEFAULT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string; // 'admin' | 'penyewa'
  statusVerifikasi: string; // 'pending' | 'approved' | 'rejected'
  namaLengkap: string;
}

/**
 * Membuat token JWT sesi terenkripsi dan menyimpannya di HTTP-only cookie.
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
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get("garasiku_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string).toLowerCase(),
      statusVerifikasi: (payload.statusVerifikasi as string).toLowerCase(),
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
  cookieStore.delete("garasiku_session");
}

/**
 * Penjaga rute: Memastikan pengguna sudah terautentikasi.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
  }
  return session;
}

/**
 * Penjaga rute khusus Penyewa:
 * Memastikan peran 'penyewa' dan status 'approved'.
 */
export async function requireApprovedPenyewa(): Promise<SessionPayload> {
  const session = await requireAuth();

  if (session.role.toLowerCase() !== "penyewa") {
    throw new Error("Akses khusus untuk akun Penyewa.");
  }

  if (session.statusVerifikasi.toLowerCase() === "pending") {
    throw new Error(
      "Akun Anda sedang dalam proses verifikasi KTP/NIK oleh Admin. Anda belum dapat melakukan penyewaan garasi hingga akun disetujui."
    );
  }

  if (session.statusVerifikasi.toLowerCase() === "rejected") {
    throw new Error(
      "Pendaftaran akun Anda ditolak oleh Admin. Silakan hubungi operator garasi untuk klarifikasi data NIK/KTP."
    );
  }

  return session;
}

/**
 * Penjaga rute khusus Admin:
 * Memastikan peran 'admin'.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role.toLowerCase() !== "admin") {
    throw new Error("Akses ditolak. Halaman ini hanya dapat diakses oleh Admin.");
  }
  return session;
}
