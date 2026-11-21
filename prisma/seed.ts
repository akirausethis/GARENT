import { PrismaClient, Role, StatusVerifikasi, TipeGarasi, StatusGarasi } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GARASIKU development database...");

  // 1. Hash passwords (cost factor 10)
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const penyewaPasswordHash = await bcrypt.hash("Penyewa123!", 10);

  // 2. Upsert Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@garasi.com" },
    update: {},
    create: {
      email: "admin@garasi.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      namaLengkap: "Administrator Garasiku",
      noTelepon: "081234567890",
      statusVerifikasi: StatusVerifikasi.APPROVED,
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // 3. Upsert Approved Penyewa
  const penyewaApproved = await prisma.user.upsert({
    where: { email: "budi@gmail.com" },
    update: {},
    create: {
      email: "budi@gmail.com",
      passwordHash: penyewaPasswordHash,
      role: Role.PENYEWA,
      nik: "3171012345670001",
      namaLengkap: "Budi Santoso",
      noTelepon: "081298765432",
      statusVerifikasi: StatusVerifikasi.APPROVED,
      verifiedById: admin.id,
    },
  });
  console.log(`Approved Penyewa created: ${penyewaApproved.email}`);

  // 4. Upsert Pending Penyewa
  const penyewaPending = await prisma.user.upsert({
    where: { email: "siti@gmail.com" },
    update: {},
    create: {
      email: "siti@gmail.com",
      passwordHash: penyewaPasswordHash,
      role: Role.PENYEWA,
      nik: "3273019876540002",
      namaLengkap: "Siti Rahmawati",
      noTelepon: "081311223344",
      statusVerifikasi: StatusVerifikasi.PENDING,
    },
  });
  console.log(`Pending Penyewa created: ${penyewaPending.email}`);

  // 5. Seed Garasi Sepeda (S001 - S005)
  for (let i = 1; i <= 5; i++) {
    const kode = `S${String(i).padStart(3, "0")}`;
    await prisma.garasi.upsert({
      where: { kodeGarasi: kode },
      update: {},
      create: {
        kodeGarasi: kode,
        tipeGarasi: TipeGarasi.SEPEDA,
        nomorUrut: i,
        hargaSewaHarian: 10000,
        status: StatusGarasi.AVAILABLE,
      },
    });
  }
  console.log("Seeded S001..S005 (SEPEDA)");

  // 6. Seed Garasi Mobil Bensin (C001 - C005)
  for (let i = 1; i <= 5; i++) {
    const kode = `C${String(i).padStart(3, "0")}`;
    await prisma.garasi.upsert({
      where: { kodeGarasi: kode },
      update: {},
      create: {
        kodeGarasi: kode,
        tipeGarasi: TipeGarasi.MOBIL,
        nomorUrut: i,
        hargaSewaHarian: 50000,
        status: StatusGarasi.AVAILABLE,
      },
    });
  }
  console.log("Seeded C001..C005 (MOBIL)");

  // 7. Seed Garasi Mobil Listrik (E001 - E003)
  for (let i = 1; i <= 3; i++) {
    const kode = `E${String(i).padStart(3, "0")}`;
    await prisma.garasi.upsert({
      where: { kodeGarasi: kode },
      update: {},
      create: {
        kodeGarasi: kode,
        tipeGarasi: TipeGarasi.MOBIL_LISTRIK,
        nomorUrut: i,
        hargaSewaHarian: 75000,
        hargaListrikPerKwh: 2500,
        status: StatusGarasi.AVAILABLE,
      },
    });
  }
  console.log("Seeded E001..E003 (MOBIL_LISTRIK)");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
