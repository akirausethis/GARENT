# GARASIKU — Sistem Penyewaan Garasi Kendaraan

> **Full-Stack Web Application with Supabase, Prisma ORM & Relational Database**  
> Dibuat untuk pemenuhan standar Uji Sertifikasi Kompetensi BNSP / LSP Pemrogram (FR.IA.04A — 9 Unit Kompetensi).

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-38%20Tests%20Passing-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## 1. Visi Produk & Janji Layanan

**GARASIKU** adalah platform operasional manajemen fasilitas penyewaan garasi multi-tipe kendaraan (Sepeda/Motor, Mobil Bensin, dan Mobil Listrik dengan bay pengisian daya baterai).

### Prinsip Operasional Inti
$$\text{Verify Identity} \longrightarrow \text{Match Vehicle \& Bay} \longrightarrow \text{Calculate Transparently} \longrightarrow \text{Commit Atomically} \longrightarrow \text{Audit \& Report}$$

**Janji Produk:**
> *"Transparan, akurat, dan terverifikasi dari pendaftaran hingga laporan."*

---

## 2. Pemenuhan 9 Unit Kompetensi (UK) LSP Pemrogram (BNSP FR.IA.04A)

Aplikasi ini dibangun secara ketat agar asesor sertifikasi dapat meninjau implementasi konkret dari setiap unit kompetensi:

| No | Kode UK | Judul Unit Kompetensi | File Implementasi dalam Repositori |
|---|---|---|---|
| 1 | **J.620100.004.01** | Mengidentifikasi Elemen Pemasaran / Kebutuhan Bisnis | [`src/domain/types.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/types.ts), [`src/app/page.tsx`](file:///c:/Users/LENOVO/garasiku/src/app/page.tsx) — Pemisahan peran Penyewa & Admin, model bisnis sewa multi-tipe, dan kalkulasi transparan. |
| 2 | **J.620100.005.02** | Menerapkan Perintah Bahasa Pemrograman Tingkat Lanjut (Clean Code) | Seluruh kode di bawah [`src/`](file:///c:/Users/LENOVO/garasiku/src/) — Strict mode TypeScript, null safety, type narrowing, zero `any`, async/await deterministik. |
| 3 | **J.620100.016.01** | Membuat Program Terstruktur | [`src/domain/services/GaragePricingService.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/services/GaragePricingService.ts), [`src/domain/services/GarageCodeGenerator.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/services/GarageCodeGenerator.ts) — Modularisasi algoritma, penomoran sekuensial S/C/E, normalisasi tanggal. |
| 4 | **J.620100.017.02** | Mengimplementasikan Pemrograman Berorientasi Objek (OOP) | **Enkapsulasi**: [`GarasiEntity.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/entities/GarasiEntity.ts) (private fields, getters, setters)<br>**Pewarisan (Inheritance)**: [`GarasiMobilListrikEntity.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/entities/GarasiMobilListrikEntity.ts)<br>**Abstraksi & Polimorfisme**: [`IPricingCalculator.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/services/IPricingCalculator.ts) |
| 5 | **J.620100.019.02** | Menggunakan Library atau Komponen Pre-Existing | [`package.json`](file:///c:/Users/LENOVO/garasiku/package.json) — Prisma ORM, Supabase JS, bcryptjs, jose, zod, lucide-react, Tailwind CSS. |
| 6 | **J.620100.022.02** | Mengakses Basis Data Relasional | [`prisma/schema.prisma`](file:///c:/Users/LENOVO/garasiku/prisma/schema.prisma), [`src/lib/prisma.ts`](file:///c:/Users/LENOVO/garasiku/src/lib/prisma.ts) — 5 tabel relasional dengan Foreign Key, Enums, Indeks, dan `prisma.$transaction`. |
| 7 | **J.620100.025.02** | Membuat Dokumentasi Program | Dokumentasi lengkap TSDoc / JSDoc pada setiap file domain, kelas, metode, API endpoint, serta file README ini. |
| 8 | **J.620100.030.02** | Mengimplementasikan Penanganan Kesalahan (Error Handling) | [`src/domain/errors/index.ts`](file:///c:/Users/LENOVO/garasiku/src/domain/errors/index.ts), [`src/lib/api-response.ts`](file:///c:/Users/LENOVO/garasiku/src/lib/api-response.ts) — Hierarchy class domain errors (`ValidationError`, `CompatibilityError`, `CapacityExceededError`, `ConflictError`). |
| 9 | **J.620100.033.02** | Melaksanakan Pengujian Perangkat Lunak | [`src/tests/`](file:///c:/Users/LENOVO/garasiku/src/tests/) — 38 unit test Vitest berbasis Boundary Value Analysis (BVA) dan pola AAA (Arrange-Act-Assert). |

---

## 3. Daftar Komponen / Library Pre-Existing (Untuk Form LSP 2d)

| Nama Library / Package | Versi | Lisensi | Fungsi dalam Sistem GARASIKU |
|---|---|---|---|
| `next` | `15.1.7` | MIT | Framework React full-stack dengan App Router, Server Components, dan Middleware. |
| `react` & `react-dom` | `19.0.0` | MIT | Library inti untuk antarmuka deklaratif berbasis komponen. |
| `@prisma/client` & `prisma` | `6.4.1` | Apache-2.0 | Object-Relational Mapping (ORM) tipe aman untuk Supabase PostgreSQL. |
| `@supabase/supabase-js` | `2.49.1` | MIT | Client library untuk upload dan manajemen berkas bukti bayar ke Supabase Storage. |
| `bcryptjs` | `3.0.2` | MIT | Enkripsi hashing kata sandi satu arah yang aman dengan cost factor $\ge 10$. |
| `jose` | `6.0.8` | Panva | Penandatanganan dan verifikasi token sesi JWT pada HTTP-only Signed Cookies. |
| `zod` | `3.24.2` | MIT | Skema validasi data masukan API dan formulir di sisi server. |
| `tailwindcss` | `3.4.17` | MIT | Utility-first CSS framework untuk styling komponen anti-AI-slop. |
| `lucide-react` | `0.475.0` | ISC | Ikonografi vektor minimalis (stroke 1.5px) pengganti emoji. |
| `vitest` | `3.0.6` | MIT | Test runner modern berbasis ESM untuk unit testing deterministik. |

---

## 4. Arsitektur Basis Data Relasional (Supabase PostgreSQL via Prisma)

Sistem menggunakan 5 tabel normalisasi dengan integritas referensial ketat:

```
+--------------------+       1:N       +------------------------+       1:N       +-------------------------+
|       users        | <-------------> |     transaksi_sewa     | <-------------> |    perpanjangan_sewa    |
+--------------------+                 +------------------------+                 +-------------------------+
| id (PK)            |                 | id (PK)                |                 | id (PK)                 |
| email (UK)         |                 | penyewaId (FK -> User) |                 | transaksiSewaId (FK)    |
| passwordHash       |                 | garasiId (FK -> Garasi)|                 | adminId (FK -> User)    |
| role (Enum)        |                 | kendaraanId (FK, UK)   |                 | tanggalSelesaiLama      |
| nik (UK, Nullable) |                 | tipeSewa (Enum)        |                 | tanggalSelesaiBaru      |
| namaLengkap        |                 | jumlahHari (Nullable)  |                 | tambahanHari            |
| noTelepon          |                 | tanggalMulai           |                 | sisaBiaya (Decimal)     |
| statusVerifikasi   |                 | tanggalSelesai         |                 | buktiBayarUrl           |
| verifiedById (FK)  |                 | biayaSewa (Decimal)    |                 | createdAt               |
| createdAt          |                 | biayaListrik (Decimal) |                 +-------------------------+
+--------------------+                 | totalBiaya (Decimal)   |
                                       | buktiPelunasanUrl      |
                                       | createdAt              |
                                       +------------------------+
                                                    |
                                    +---------------+---------------+
                                    |                               |
                                1:N v                           1:1 v
                      +-------------------+           +-----------------------+
                      |      garasi       |           |       kendaraan       |
                      +-------------------+           +-----------------------+
                      | id (PK)           |           | id (PK)               |
                      | kodeGarasi (UK)   |           | tipeKendaraan (Enum)  |
                      | tipeGarasi (Enum) |           | nomorPlat (Nullable)  |
                      | nomorUrut (Int)   |           | merekTipe             |
                      | hargaSewaHarian   |           | kapasitasListrikKwh   |
                      | hargaListrikPerKwh|           +-----------------------+
                      | status (Enum)     |
                      | createdAt         |
                      +-------------------+
```

---

## 5. Aturan Bisnis & Rumus Baku Perhitungan

### A. Matriks Kompatibilitas Kendaraan & Garasi
- `SEPEDA` & `SEPEDA_MOTOR` $\longrightarrow$ **HANYA** Garasi `SEPEDA` (Prefix **S**).
- `MOBIL` (Bensin) $\longrightarrow$ **HANYA** Garasi `MOBIL` (Prefix **C**).
- `MOBIL_LISTRIK` $\longrightarrow$ Garasi `MOBIL` (Prefix **C**) **ATAU** Garasi `MOBIL_LISTRIK` (Prefix **E**).

### B. Penomoran Sekuensial Otomatis (Auto-Increment)
- Garasi Sepeda: `S001` s/d `S999`
- Garasi Mobil Bensin: `C001` s/d `C999` (contoh garasi ke-10 adalah `C010`)
- Garasi Mobil Listrik: `E001` s/d `E999`
- Batas kuantitas per jenis garasi: strictly **$\le 999$**. Melebihi batas melempar `CapacityExceededError`.

### C. Rumus Perhitungan Biaya
- **Sewa Harian**:
  $$\text{Biaya Sewa} = \text{jumlah\_hari} \times \text{harga\_sewa\_harian} \quad (1 \le \text{jumlah\_hari} \le 30)$$
- **Sewa Bulanan**:
  $$\text{Biaya Sewa} = 25 \times \text{harga\_sewa\_harian}$$
- **Pengisian Listrik EV (Mandatory Full Charging)**:
  - Jika `MOBIL_LISTRIK` menyewa garasi `MOBIL_LISTRIK` (E):
    $$\text{Biaya Listrik} = \text{kapasitas\_listrik\_kwh} \times \text{harga\_listrik\_per\_kwh}$$
  - Jika `MOBIL_LISTRIK` menyewa garasi reguler `MOBIL` (C) atau kendaraan non-EV:
    $$\text{Biaya Listrik} = 0$$
- **Total Biaya**:
  $$\text{Total Biaya} = \text{Biaya Sewa} + \text{Biaya Listrik}$$

### D. Perhitungan Perpanjangan Sewa
- $\text{tanggal\_selesai\_baru} > \text{tanggal\_selesai\_lama}$ (strictly greater)
- $\text{tambahan\_hari} = \text{tanggal\_selesai\_baru} - \text{tanggal\_selesai\_lama} > 0$
- $\text{sisa\_biaya} = \text{tambahan\_hari} \times \text{harga\_sewa\_harian} > 0$

---

## 6. Akun Bawaan / Demo Seed (Untuk Asesor LSP)

Database seed menyertakan akun siap pakai untuk pengujian:

| Peran (Role) | Email | Kata Sandi | Status Verifikasi | Keterangan |
|---|---|---|---|---|
| **ADMIN** | `admin@garasi.com` | `Admin123!` | `APPROVED` | Pengelola fasilitas, buat batch garasi, approve/reject KTP, perpanjangan, laporan. |
| **PENYEWA (Disetujui)** | `budi@gmail.com` | `Penyewa123!` | `APPROVED` | NIK: `3171012345670001`. Dapat langsung menyewa garasi, kalkulasi live, upload bukti. |
| **PENYEWA (Pending)** | `siti@gmail.com` | `Penyewa123!` | `PENDING` | NIK: `3273019876540002`. Akun baru mendaftar; login ditolak dengan alert informatif hingga disetujui Admin. |

---

## 7. Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- Node.js versi $\ge 18.18$ atau $\ge 20.x$ (Teruji pada Node `v24.14.1`)
- Proyek Supabase PostgreSQL aktif atau koneksi PostgreSQL lokal

### Langkah 1: Klon & Pasang Dependensi
```bash
git clone <url-repo> garasiku
cd garasiku
npm install
```

### Langkah 2: Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel dengan kredensial Supabase Anda:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_STORAGE_BUCKET="bukti-bayar"
JWT_SECRET="garasiku-super-secret-jwt-signing-key-32chars-min!"
```

### Langkah 3: Konfigurasi Supabase Storage
1. Buka dashboard proyek Supabase Anda: **Storage** $\longrightarrow$ **New Bucket**.
2. Beri nama bucket: `bukti-bayar`.
3. Set centang **Public Bucket** agar gambar bukti pembayaran dapat diakses via URL publik.

### Langkah 4: Migrasi Skema & Seeding Basis Data
```bash
# Generate Prisma Client
npx prisma generate

# Terapkan skema tabel ke Supabase PostgreSQL
npx prisma db push

# Masukkan data awal demo (Admin, 2 Penyewa, Garasi S001-S005, C001-C005, E001-E003)
npm run prisma:seed
```

### Langkah 5: Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada alamat: [http://localhost:3000](http://localhost:3000)

---

## 8. Verifikasi Kualitas Perangkat Lunak (UK 9)

Eksekusi seluruh perintah pengujian untuk memverifikasi kepatuhan sistem:

### 1. Unit Testing (Vitest — 38 Skenario Uji Lulus 100%)
```bash
npm test
```
**Cakupan Skenario Uji:**
- `garageCodeGenerator.test.ts` (11 tests): Format S001, C001, E001, C010; batch berurutan; BVA batas 999; reject 1000 dengan `CapacityExceededError`; reject input negatif.
- `garasiEntity.test.ts` (8 tests): Enkapsulasi OOP, penolakan harga negatif, kalkulasi sewa bulanan 25x, pewarisan EV `GarasiMobilListrikEntity`, perhitungan biaya isi penuh baterai.
- `pricingService.test.ts` (19 tests): Seluruh kombinasi matriks kompatibilitas kendaraan & garasi; validasi plat nomor & kWh; BVA durasi harian (0, 1, 30, 31 hari); EV di garasi C vs garasi E; BVA perpanjangan tanggal lama vs tanggal baru.

### 2. Pengecekan Type-Safety TypeScript (Zero Errors)
```bash
npx tsc --noEmit
```

### 3. Pengecekan Kualitas Kode (ESLint Clean)
```bash
npm run lint
```

### 4. Kompilasi Produksi Next.js
```bash
npm run build
```

---

## 9. Desain Antarmuka (Anti-AI-Slop Craft)

Aplikasi ini menerapkan standar desain operasional industri (terinspirasi dari Linear dan Stripe Dashboard):
- **Warna Dasar**: Slate Dingin Netral (`#F8FAFC`), Kartu Putih Bersih (`#FFFFFF`), Garis Hairline 1px (`#E2E8F0`).
- **Aksen Interaktif**: Deep Architectural Slate (`#0F172A`) dan Restrained Steel Blue (`#0369A1`).
- **Status Pills Semantik**:
  - `AVAILABLE` / `APPROVED`: Latar `#ECFDF5`, Teks `#065F46`, Border `#A7F3D0`
  - `USED` / `PENDING`: Latar `#FFFBEB`, Teks `#92400E`, Border `#FDE68A`
  - `REJECTED` / Error: Latar `#FEF2F2`, Teks `#991B1B`, Border `#FECACA`
- **Tipografi Numerik**: Seluruh angka harga Rupiah, tanggal, dan kode garasi menggunakan font tabular (`tabular-nums`) untuk keterbacaan operasional yang presisi.
- **Bebas AI-Slop**: Zero gradien ungu/neon, zero glassmorphism buram, zero emoji dalam tombol/navigasi, zero grafik mock palsu yang tidak bersumber dari baris transaksi asli.
