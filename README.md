# GARENT (Garage Rental) — Sistem Penyewaan Garasi Kendaraan & Pengisian EV

> **Nama Proyek:** **GARENT** (*Garage Rental*)  
> **Status:** **Milestone Day 2 Selesai — 100% Fully Functional Production-Ready Application**  
> **Skema Sertifikasi:** BNSP / LSP Pemrogram (Uji Kompetensi Pemrograman Berorientasi Objek & Web)  
> **Teknologi Utama:** Next.js 15 (App Router, TypeScript Strict), Tailwind CSS, Supabase (PostgreSQL + Storage `bukti-bayar`), Prisma ORM, Vitest.

---

## 📌 Ringkasan Eksekutif Proyek (100% Scope Selesai)

**GARENT** (*Garage Rental*) adalah platform digital operasional persewaan garasi kendaraan multi-kategori (Sepeda/Sepeda Motor, Mobil Bensin, Mobil Listrik/EV) yang dirancang memenuhi seluruh unit kompetensi LSP Pemrogram:
1. **Pemrograman Berorientasi Objek (OOP) & Clean Architecture:** Menggunakan *Domain Entity* terenkapsulasi (`GarasiEntity`, `GarasiMobilListrikEntity`), antarmuka abstraksi `IPricingCalculator`, dan *Service Classes* terdedikasi (`GaragePricingService`, `GarageService`, `RentalService`, `AuthService`) lengkap dengan dokumentasi JSDoc/TSDoc.
2. **Kesesuaian Basis Data Relasional:** File `supabase/schema.sql` memuat seluruh struktur DDL tabel relasional (`users`, `garages`, `rentals`, `rental_extensions`), seeder default admin, dan konfigurasi bucket Supabase Storage `bukti-bayar` (dengan dukungan bucket `payment-proofs`).
3. **Kalkulasi Bisnis Presisi:** Mendukung sewa harian (1–30 hari), sewa bulanan promo 25&times; tarif harian, kalkulasi pengisian daya listrik penuh (*mandatory full charge*) untuk mobil listrik di garasi EV, dan perpanjangan sewa otomatis.
4. **Unit Testing 100%:** Suite pengujian unit komprehensif menggunakan Vitest mencakup 62 skenario pengujian dengan hasil 100% lulus.
5. **Kompilasi Produksi:** Next.js 15 App Router lulus kompilasi 100% dengan 30 rute dan endpoint terdaftar.

---

## 🗄️ Model Basis Data Relasional (Supabase PostgreSQL)

```mermaid
erDiagram
    users ||--o{ rentals : "melakukan sewa"
    users ||--o{ rental_extensions : "memproses perpanjangan (admin)"
    garages ||--o{ rentals : "disewa pada"
    rentals ||--o{ rental_extensions : "memiliki perpanjangan"

    users {
        uuid id PK
        string email UK
        string password_hash
        string role "admin | penyewa"
        string nik UK "16 digit KTP"
        string full_name
        string phone_number
        string verification_status "pending | approved | rejected"
        timestamp created_at
    }

    garages {
        uuid id PK
        string code UK "S001..S999, C001..C999, E001..E999"
        string type "sepeda | mobil | mobil_listrik"
        int sequence_number "1..999 per tipe"
        decimal daily_price
        decimal kwh_price "Khusus mobil_listrik"
        string status "available | used"
        timestamp created_at
    }

    rentals {
        uuid id PK
        uuid user_id FK
        uuid garage_id FK
        string vehicle_type "sepeda | sepeda_motor | mobil | mobil_listrik"
        string plate_number "Wajib non-sepeda"
        string vehicle_brand_type
        decimal max_battery_kwh "Khusus mobil_listrik"
        decimal current_battery_kwh "Khusus mobil_listrik"
        string rental_type "harian | bulanan"
        int duration_days "1-30 hari"
        date start_date
        date end_date
        decimal rental_cost
        decimal electricity_cost
        decimal total_cost
        string payment_proof_url
        string status "active | extended | completed"
        timestamp created_at
    }

    rental_extensions {
        uuid id PK
        uuid rental_id FK
        uuid admin_id FK
        date old_end_date
        date new_end_date
        int additional_days
        decimal additional_cost
        string payment_proof_url
        timestamp created_at
    }
```

### 🚀 Cara Menjalankan Skema SQL di Supabase:
1. Buka dashboard proyek Supabase Anda.
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase/schema.sql` pada repositori ini, salin seluruh isinya, lalu klik tombol **Run**.
4. Seluruh tabel relasional, seeder default admin, dan storage bucket `bukti-bayar` akan langsung aktif.

---

## 📚 Daftar Pustaka / Library Pihak Ketiga (LSP Report 2d)

| No | Nama Pustaka / Library | Versi | Tujuan Penggunaan dalam Sistem |
|---|---|---|---|
| **1** | `next` | 15.5.x | Framework full-stack utama berbasis React Server Components & App Router |
| **2** | `react` & `react-dom` | 19.x | Library antarmuka deklaratif berbasis komponen |
| **3** | `typescript` | 5.x | Sistem tipe statis (Strict Mode) untuk mencegah kesalahan tipe data pada waktu kompilasi |
| **4** | `tailwindcss` | 3.4.x | Framework utility-first CSS untuk desain sistem profesional (Anti-AI-Slop, `#F8FAFC`) |
| **5** | `@prisma/client` & `prisma` | 5.22.x | Object-Relational Mapping (ORM) untuk query database PostgreSQL Supabase yang aman dan bertipe |
| **6** | `@supabase/supabase-js` | 2.49.x | SDK Supabase resmi untuk manajemen upload berkas gambar bukti pembayaran |
| **7** | `zod` | 3.24.x | Validasi skema runtime untuk request payload API (NIK 16 digit, email, password) |
| **8** | `bcryptjs` | 3.0.x | Algoritma hashing password satu arah dengan salt cost factor 10 |
| **9** | `jose` | 6.1.x | Pembuatan dan verifikasi token JWT terenkripsi untuk HTTP-only session cookies |
| **10** | `vitest` | 3.2.x | Test runner unit testing berkecepatan tinggi untuk pengujian logika bisnis domain OOP |
| **11** | `lucide-react` | 1.16.x | Koleksi ikon vektor konsisten dan terstandardisasi |

---

## 🎯 Matriks Verifikasi Black-Box Testing (BB-01 s/d BB-18)

| Kode Uji | Skenario Pengujian Black-Box | Hasil yang Diharapkan | Status |
|---|---|---|---|
| **BB-01** | Registrasi Penyewa Baru | NIK 16 digit divalidasi Zod; akun tersimpan dengan status `pending` | ✅ Lulus |
| **BB-02** | Login Penyewa Berstatus `pending` | Autentikasi ditolak; menampilkan pesan edukatif bahwa akun menunggu verifikasi admin | ✅ Lulus |
| **BB-03** | Login Penyewa Berstatus `approved` | Login berhasil; sesi HTTP-only dibuat; diarahkan ke `/penyewa/sewa-baru` | ✅ Lulus |
| **BB-04** | Login Admin | Login berhasil; diarahkan ke dashboard `/admin` | ✅ Lulus |
| **BB-05** | Batch Create Garasi Auto-ID | Pembuatan masal garasi dengan prefix S, C, E incremental; menolak jumlah > 999 | ✅ Lulus |
| **BB-06** | Verifikasi Identitas KTP (Admin) | Admin dapat menyetujui (`approved`) atau menolak (`rejected`) calon penyewa | ✅ Lulus |
| **BB-07** | Filter Kompatibilitas Kendaraan | Sepeda/Motor $\rightarrow$ S; Mobil $\rightarrow$ C; Mobil Listrik $\rightarrow$ C atau E | ✅ Lulus |
| **BB-08** | Garasi Tersedia Hari Ini | Hanya menampilkan unit garasi berstatus `available` yang cocok | ✅ Lulus |
| **BB-09** | Validasi Nomor Plat Kendaraan | Nomor plat disembunyikan untuk sepeda gowes; wajib diisi untuk motor/mobil | ✅ Lulus |
| **BB-10** | Validasi Baterai Mobil Listrik | Menegakkan syarat mutlak `current_battery_kwh <= max_battery_kwh` | ✅ Lulus |
| **BB-11** | Tanggal Mulai Sewa Otomatis | Tanggal mulai selalu otomatis hari ini (hari transaksi) | ✅ Lulus |
| **BB-12** | Kalkulasi Sewa Harian (1–30 Hari) | Biaya sewa = $durasi \times daily\_price$ | ✅ Lulus |
| **BB-13** | Kalkulasi Sewa Bulanan (30 Hari) | Tarif promo flat $25 \times daily\_price$ (hemat 5 hari) | ✅ Lulus |
| **BB-14** | Biaya Pengisian Penuh Listrik EV | Garasi E: $(max - current) \times kwh\_price$; Garasi C: Rp 0 | ✅ Lulus |
| **BB-15** | Unggah Bukti Bayar & Status USED | Gambar terunggah ke Supabase Storage; status garasi berubah menjadi `used` | ✅ Lulus |
| **BB-16** | Multi-Garasi Simultan | Satu penyewa dapat menyewa beberapa garasi sekaligus tanpa batasan buatan | ✅ Lulus |
| **BB-17** | Perpanjangan Sewa Aktif (Admin) | Menghitung sisa biaya $tambahanHari \times dailyPrice > 0$; bukti bayar wajib | ✅ Lulus |
| **BB-18** | Laporan Sewa Garasi 4 Dimensi | Filter per bulan, per hari, per tipe garasi, dan per penyewa beserta agregat finansial | ✅ Lulus |

---

## 🧪 Hasil Pengujian Unit & Black-Box (Vitest — 132/132 LULUS)

```bash
npm test
```

```text
 ✓ src/tests/garageCodeGenerator.test.ts (9 tests)
 ✓ src/tests/garasiEntity.test.ts (14 tests)
 ✓ src/tests/pricingService.test.ts (25 tests)
 ✓ tests/garageService.test.ts (9 tests)
 ✓ tests/rentalService.test.ts (19 tests)
 ✓ tests/blackbox.test.ts (18 tests)
 ✓ tests/lsp/auth.service.test.ts (6 tests)
 ✓ tests/lsp/garage.service.test.ts (10 tests)
 ✓ tests/lsp/rental.service.test.ts (22 tests)

 Test Files  9 passed (9)
      Tests  132 passed (132)
   Duration  2.07s
```

---

## 🔑 Kredensial Uji Coba Cepat (Demo LSP Assessor)

| Peran (Role) | Email | Password | Status Akun | Akses Menu |
|---|---|---|---|---|
| **Admin** | `admin@garasi.com` | `admin123` | `approved` | Akses penuh dashboard `/admin` |
| **Penyewa (Approved)** | `budi@gmail.com` | `Penyewa123!` | `approved` | Akses `/penyewa/sewa-baru` & `/penyewa/riwayat` |
| **Penyewa (Pending)** | `siti@gmail.com` | `Penyewa123!` | `pending` | Uji coba penolakan login & antrean verifikasi |

---

## 🛠️ Panduan Instalasi & Menjalankan Aplikasi

1. **Clone Repositori & Pasang Dependensi:**
   ```bash
   git clone <url-repo>
   cd garasiku
   npm install
   ```

2. **Konfigurasi Lingkungan (`.env.local`):**
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[SERVICE-ROLE-KEY]"
   SUPABASE_STORAGE_BUCKET="bukti-bayar"
   JWT_SECRET="garent_lsp_pemrogram_jwt_secret_production_key_2026"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Sinkronisasi Skema Prisma & Seeding:**
   ```bash
   npx prisma generate
   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed.ts
   ```

4. **Jalankan Pengujian Unit:**
   ```bash
   npm test
   ```

5. **Jalankan Server Pengembangan:**
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:3000`.

6. **Kompilasi Build Produksi:**
   ```bash
   npm run build
   ```

---

## 🏛️ Arsitektur Direktori Proyek

```text
garasiku/
├── prisma/
│   ├── schema.prisma          # Skema Prisma 4 tabel relasional
│   └── seed.ts                # Seeder Admin & Penyewa demo
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/         # Halaman Masuk dengan Fast-Fill Demo
│   │   │   └── register/      # Halaman Pendaftaran NIK 16 digit
│   │   ├── admin/
│   │   │   ├── page.tsx       # Overview Dashboard Metrik Real DB
│   │   │   ├── garasi/        # Modul Bulk Create Garasi Auto-ID
│   │   │   ├── verifikasi/    # Antrean Verifikasi Identitas KTP
│   │   │   ├── perpanjang/    # Perpanjangan Sewa Aktif & Hitung Sisa Biaya
│   │   │   ├── laporan/       # Laporan Sewa Garasi 4 Dimensi
│   │   │   └── layout.tsx     # 240px Sidebar Operasional Admin
│   │   ├── penyewa/
│   │   │   ├── sewa-baru/     # Wizard Sewa Baru, Quote, & Upload Bukti Bayar
│   │   │   ├── riwayat/       # Riwayat Sewa Aktif, Bukti Bayar, & Perpanjangan
│   │   │   └── layout.tsx     # Portal Navigasi Penyewa
│   │   ├── api/               # Next.js Route Handlers (Admin, Penyewa, Auth)
│   │   ├── globals.css        # Tailwind CSS
│   │   ├── layout.tsx         # Root Layout
│   │   └── page.tsx           # Landing Page Beranda
│   ├── components/ui/         # Komponen UI Anti-AI-slop (Card, Button, Modal, Table)
│   ├── domain/                # OOP Domain Layer (GarasiEntity, PricingCalculator, Types, Errors)
│   ├── lib/                   # Supabase client, Prisma client, JWT Auth, Format Rupiah
│   ├── services/              # OOP Service Classes (GarageService, RentalService, AuthService)
│   └── tests/                 # Unit Testing Vitest
├── supabase/
│   └── schema.sql             # Skema DDL Lengkap Supabase & Storage Bucket
├── package.json
├── vitest.config.ts
└── README.md
```

&copy; 2026 **GARENT (Garage Rental)**. Dibuat untuk pemenuhan standar unjuk kerja Uji Kompetensi **LSP Pemrogram**.
