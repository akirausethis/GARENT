-- ==============================================================================
-- GARENT (Garage Rental) — Database Schema & Initial Seeder for Supabase PostgreSQL
-- Skema Sertifikasi: LSP Pemrogram (Uji Kompetensi)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if needed (Clean Migration)
DROP TABLE IF EXISTS rental_extensions CASCADE;
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS garages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Menyimpan data Admin dan Penyewa dengan alur verifikasi NIK/KTP
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'penyewa' CHECK (role IN ('admin', 'penyewa')),
    nik TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_status ON users(role, verification_status);
CREATE INDEX idx_users_email ON users(email);

-- ------------------------------------------------------------------------------
-- Table 2: garages
-- Menyimpan inventaris unit garasi dengan kode unik (S001..S999, C001..C999, E001..E999)
-- ------------------------------------------------------------------------------
CREATE TABLE garages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- S001, C001, E001, dst.
    type TEXT NOT NULL CHECK (type IN ('sepeda', 'mobil', 'mobil_listrik')),
    sequence_number INT NOT NULL CHECK (sequence_number BETWEEN 1 AND 999),
    daily_price NUMERIC(12, 2) NOT NULL CHECK (daily_price > 0),
    kwh_price NUMERIC(10, 2) DEFAULT NULL, -- Wajib untuk mobil_listrik
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_garage_type_sequence UNIQUE(type, sequence_number)
);

CREATE INDEX idx_garages_type_status ON garages(type, status);
CREATE INDEX idx_garages_code ON garages(code);

-- ------------------------------------------------------------------------------
-- Table 3: rentals
-- Transaksi sewa garasi oleh penyewa yang telah disetujui (APPROVED)
-- ------------------------------------------------------------------------------
CREATE TABLE rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sepeda', 'sepeda_motor', 'mobil', 'mobil_listrik')),
    plate_number TEXT DEFAULT NULL, -- Opsional/null jika sepeda
    vehicle_brand_type TEXT NOT NULL,
    max_battery_kwh NUMERIC(6, 2) DEFAULT NULL,
    current_battery_kwh NUMERIC(6, 2) DEFAULT NULL,
    rental_type TEXT NOT NULL CHECK (rental_type IN ('harian', 'bulanan')),
    duration_days INT NOT NULL CHECK (duration_days >= 1),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rental_cost NUMERIC(12, 2) NOT NULL CHECK (rental_cost >= 0),
    electricity_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (electricity_cost >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost > 0),
    payment_proof_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'extended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rentals_user_id ON rentals(user_id);
CREATE INDEX idx_rentals_garage_id ON rentals(garage_id);
CREATE INDEX idx_rentals_dates ON rentals(start_date, end_date);
CREATE INDEX idx_rentals_status ON rentals(status);

-- ------------------------------------------------------------------------------
-- Table 4: rental_extensions
-- Riwayat perpanjangan masa sewa garasi yang diproses oleh Admin
-- ------------------------------------------------------------------------------
CREATE TABLE rental_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    old_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    additional_days INT NOT NULL CHECK (additional_days >= 1),
    additional_cost NUMERIC(12, 2) NOT NULL CHECK (additional_cost > 0),
    payment_proof_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rental_extensions_rental_id ON rental_extensions(rental_id);
CREATE INDEX idx_rental_extensions_admin_id ON rental_extensions(admin_id);

-- ------------------------------------------------------------------------------
-- 5. Supabase Storage Setup: Bucket 'payment-proofs'
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-proofs',
    'payment-proofs',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policy: Siapa saja dapat melihat bukti bayar (public bucket)
CREATE POLICY "Public Access Payment Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Storage Policy: Izinkan upload bukti bayar
CREATE POLICY "Allow Upload Payment Proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');

-- ------------------------------------------------------------------------------
-- 6. Initial Seed Data
-- ------------------------------------------------------------------------------

-- Seed Admin Default: admin@garasi.com / admin123
INSERT INTO users (id, email, password_hash, role, nik, full_name, phone_number, verification_status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@garasi.com',
    '$2b$10$alM6/DPJZAMqMX6oIUwLjeJV5apQwNLZIlYqP5TwCdKoLQLtnd6sy', -- hash of admin123
    'admin',
    NULL,
    'Administrator GARENT',
    '081234567890',
    'approved'
) ON CONFLICT (email) DO NOTHING;

-- Seed Penyewa Demo Terverifikasi: budi@gmail.com / admin123
INSERT INTO users (id, email, password_hash, role, nik, full_name, phone_number, verification_status)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'budi@gmail.com',
    '$2b$10$alM6/DPJZAMqMX6oIUwLjeJV5apQwNLZIlYqP5TwCdKoLQLtnd6sy',
    'penyewa',
    '3171012345670001',
    'Budi Santoso',
    '081298765432',
    'approved'
) ON CONFLICT (email) DO NOTHING;

-- Seed Penyewa Demo Pending: siti@gmail.com / admin123
INSERT INTO users (id, email, password_hash, role, nik, full_name, phone_number, verification_status)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'siti@gmail.com',
    '$2b$10$alM6/DPJZAMqMX6oIUwLjeJV5apQwNLZIlYqP5TwCdKoLQLtnd6sy',
    'penyewa',
    '3273019876540002',
    'Siti Rahmawati',
    '081311223344',
    'pending'
) ON CONFLICT (email) DO NOTHING;

-- Seed Garasi Sepeda: S001 s/d S005 (Tarif Rp 10.000/hari)
INSERT INTO garages (code, type, sequence_number, daily_price, status) VALUES
('S001', 'sepeda', 1, 10000.00, 'available'),
('S002', 'sepeda', 2, 10000.00, 'available'),
('S003', 'sepeda', 3, 10000.00, 'available'),
('S004', 'sepeda', 4, 10000.00, 'available'),
('S005', 'sepeda', 5, 10000.00, 'available')
ON CONFLICT (code) DO NOTHING;

-- Seed Garasi Mobil: C001 s/d C005 (Tarif Rp 50.000/hari)
INSERT INTO garages (code, type, sequence_number, daily_price, status) VALUES
('C001', 'mobil', 1, 50000.00, 'available'),
('C002', 'mobil', 2, 50000.00, 'available'),
('C003', 'mobil', 3, 50000.00, 'available'),
('C004', 'mobil', 4, 50000.00, 'available'),
('C005', 'mobil', 5, 50000.00, 'available')
ON CONFLICT (code) DO NOTHING;

-- Seed Garasi Mobil Listrik: E001 s/d E003 (Tarif Rp 75.000/hari, Listrik Rp 2.500/kWh)
INSERT INTO garages (code, type, sequence_number, daily_price, kwh_price, status) VALUES
('E001', 'mobil_listrik', 1, 75000.00, 2500.00, 'available'),
('E002', 'mobil_listrik', 2, 75000.00, 2500.00, 'available'),
('E003', 'mobil_listrik', 3, 75000.00, 2500.00, 'available')
ON CONFLICT (code) DO NOTHING;
