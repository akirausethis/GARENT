export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function translateError(
  error: unknown,
  fallbackMessage = "Terjadi kesalahan pada sistem. Silakan coba lagi."
): string {
  if (!error) return fallbackMessage;

  let code = "";
  let rawMessage = "";
  let details = "";

  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message || "";
  } else if (typeof error === "object") {
    const pgErr = error as PostgrestLikeError;
    code = pgErr.code ?? "";
    rawMessage = pgErr.message ?? "";
    details = pgErr.details ?? "";
  }

  const combined = `${rawMessage} ${details}`.toLowerCase();

  if (code === "23505" || combined.includes("duplicate key value")) {
    if (combined.includes("nik")) {
      return "NIK sudah terdaftar di sistem. Silakan periksa kembali NIK Anda.";
    }
    if (combined.includes("email")) {
      return "Email sudah terdaftar di sistem. Silakan gunakan email lain atau masuk.";
    }
    if (combined.includes("code")) {
      return "Kode unit garasi bentrok di database. Silakan muat ulang dan coba lagi.";
    }
    return "Data yang dimasukkan sudah terdaftar di sistem.";
  }

  if (code === "23503") {
    return "Data referensi tidak ditemukan atau masih terkait dengan transaksi lain.";
  }

  if (code === "23514") {
    return "Data yang dimasukkan tidak memenuhi aturan validasi database.";
  }

  if (code === "22P02") {
    return "Format ID atau parameter data tidak valid.";
  }

  if (code === "PGRST116") {
    return "Data yang diminta tidak ditemukan.";
  }

  if (code === "PGRST205" || combined.includes("schema cache")) {
    return "Tabel database belum siap. Pastikan skema Supabase (schema.sql) telah dijalankan.";
  }

  if (
    combined.includes("failed to fetch") ||
    combined.includes("networkerror") ||
    combined.includes("fetch failed") ||
    combined.includes("network request failed") ||
    combined.includes("econnrefused") ||
    combined.includes("etimedout") ||
    combined.includes("timed out")
  ) {
    return "Koneksi ke server terputus. Periksa jaringan internet Anda lalu coba lagi.";
  }

  if (combined.includes("bucket not found")) {
    return "Bucket penyimpanan bukti bayar belum ditemukan di Supabase Storage.";
  }

  if (
    combined.includes("payload too large") ||
    combined.includes("maximum allowed size") ||
    combined.includes("entity too large")
  ) {
    return "Ukuran file bukti pembayaran melebihi batas maksimal 5 MB.";
  }

  if (combined.includes("mime type") || combined.includes("invalid image")) {
    return "Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WEBP).";
  }

  if (
    combined.includes("row-level security") ||
    combined.includes("permission denied")
  ) {
    return "Akses ke server atau penyimpanan ditolak oleh kebijakan keamanan.";
  }

  if (combined.includes("invalid api key") || combined.includes("jwt")) {
    return "Konfigurasi kredensial server tidak valid atau sudah kadaluarsa.";
  }

  // Jangan tampilkan error runtime JS mentah ke pengguna
  if (
    combined.includes("cannot read properties") ||
    combined.includes("is not a function") ||
    combined.includes("undefined is not") ||
    combined.includes("unexpected token")
  ) {
    return fallbackMessage;
  }

  const trimmed = rawMessage.trim();
  return trimmed || fallbackMessage;
}

export function validateImageFile(
  file: File | null | undefined,
  maxBytes = MAX_IMAGE_FILE_SIZE_BYTES
): string | null {
  if (!file) {
    return "File gambar bukti pembayaran wajib dipilih.";
  }

  const hasImageMime = Boolean(file.type && file.type.startsWith("image/"));
  const hasImageExt = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);

  if ((file.type && !hasImageMime) || (!file.type && !hasImageExt)) {
    return "Bukti pembayaran harus berupa file gambar (JPG, PNG, WEBP).";
  }

  if (file.size > maxBytes) {
    return "Ukuran file bukti pembayaran maksimal 5 MB.";
  }

  return null;
}
