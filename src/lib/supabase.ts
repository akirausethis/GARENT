/**
 * @file supabase.ts
 * @description Supabase client and storage upload management for payment receipts.
 * Strictly enforces file validation (MIME type JPG/PNG/WEBP, <= 5 MB size) and secret isolation.
 */

import { createClient } from "@supabase/supabase-js";
import { ValidationError } from "../domain/errors";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "bukti-bayar";

export const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Memvalidasi dan mengunggah berkas bukti pembayaran ke Supabase Storage.
 *
 * @param file - Berkas file gambar (File atau Blob) dari form upload.
 * @param folder - Subdirektori penyimpanan (misal: 'sewa' atau 'perpanjangan').
 * @returns URL publik berkas yang tersimpan di storage.
 * @throws {ValidationError} Apabila ukuran file > 5 MB atau tipe file bukan gambar.
 */
export async function uploadPaymentProof(file: File, folder: string = "sewa"): Promise<string> {
  // 1. Validasi tipe MIME (JPG, PNG, WEBP)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError(
      `Format berkas '${file.type}' tidak didukung. Harap unggah berkas gambar dengan format JPG, PNG, atau WEBP.`
    );
  }

  // 2. Validasi ukuran berkas (maksimal 5 MB)
  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new ValidationError(
      `Ukuran berkas melebihi batas maksimum 5 MB (ukuran berkas Anda: ${sizeMb} MB).`
    );
  }

  // 3. Buat nama berkas acak yang aman (UUID + ekstensi asli)
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId = crypto.randomUUID();
  const filePath = `${folder}/${uniqueId}.${extension}`;

  // 4. Jika menggunakan konfigurasi Supabase asli
  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project") &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("dummy") &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder");

  if (isConfigured) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error("Gagal mengunggah berkas ke Supabase Storage:", error);
      throw new ValidationError(`Gagal mengunggah bukti bayar ke server: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  // Fallback untuk local dev mode jika kredensial Supabase Storage belum diset
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

/**
 * Alias bahasa Indonesia untuk LSP Pemrogram compliance.
 */
export const uploadBuktiBayar = uploadPaymentProof;
