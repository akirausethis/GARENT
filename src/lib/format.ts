/**
 * @file format.ts
 * @description Standard currency, date, and string formatting utilities for GARENT.
 * Complies with anti-AI-slop design specifications (tabular nums, Indonesian Rupiah).
 */

/**
 * Memformat angka numerik ke format mata uang Rupiah Indonesia (Rp 150.000).
 *
 * @param amount - Nilai nominal numerik.
 * @returns String terformat Rupiah Indonesia.
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "Rp 0";
  }
  const numeric = Math.round(Number(amount));
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Memformat objek Date atau string ISO ke format tanggal standar Indonesia (misal: 21 Nov 2026).
 *
 * @param date - Tanggal masukan.
 * @returns String tanggal terformat.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Memformat objek Date atau string ISO ke format tanggal dan waktu (misal: 21 Nov 2026, 14:30 WIB).
 *
 * @param date - Tanggal masukan.
 * @returns String tanggal dan waktu terformat.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return (
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " WIB"
  );
}
