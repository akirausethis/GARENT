import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GARENT (Garage Rental) database...");

  // 1. Hash passwords
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const penyewaPasswordHash = await bcrypt.hash("Penyewa123!", 10);

  // 2. Seed 1 Admin (admin@garasi.com / admin123)
  const admin = await prisma.user.upsert({
    where: { email: "admin@garasi.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "Administrator GARENT",
      phoneNumber: "081234567890",
      verificationStatus: "approved",
    },
    create: {
      email: "admin@garasi.com",
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "Administrator GARENT",
      phoneNumber: "081234567890",
      verificationStatus: "approved",
    },
  });
  console.log(`[Seed] Admin created: ${admin.email}`);

  // 3. Seed 2 Penyewa: 1 approved (budi@gmail.com), 1 pending (siti@gmail.com)
  const penyewaApproved = await prisma.user.upsert({
    where: { email: "budi@gmail.com" },
    update: {
      passwordHash: penyewaPasswordHash,
      role: "penyewa",
      nik: "3171012345670001",
      fullName: "Budi Santoso",
      phoneNumber: "081298765432",
      verificationStatus: "approved",
    },
    create: {
      email: "budi@gmail.com",
      passwordHash: penyewaPasswordHash,
      role: "penyewa",
      nik: "3171012345670001",
      fullName: "Budi Santoso",
      phoneNumber: "081298765432",
      verificationStatus: "approved",
    },
  });
  console.log(`[Seed] Approved Penyewa: ${penyewaApproved.email} (Status: approved)`);

  const penyewaPending = await prisma.user.upsert({
    where: { email: "siti@gmail.com" },
    update: {
      passwordHash: penyewaPasswordHash,
      role: "penyewa",
      nik: "3273019876540002",
      fullName: "Siti Rahmawati",
      phoneNumber: "081311223344",
      verificationStatus: "pending",
    },
    create: {
      email: "siti@gmail.com",
      passwordHash: penyewaPasswordHash,
      role: "penyewa",
      nik: "3273019876540002",
      fullName: "Siti Rahmawati",
      phoneNumber: "081311223344",
      verificationStatus: "pending",
    },
  });
  console.log(`[Seed] Pending Penyewa: ${penyewaPending.email} (Status: pending)`);

  // 4. Seed initial garages: S001–S005 (sepeda)
  for (let i = 1; i <= 5; i++) {
    const code = `S${String(i).padStart(3, "0")}`;
    await prisma.garage.upsert({
      where: { code },
      update: {
        dailyPrice: 10000,
      },
      create: {
        code,
        type: "sepeda",
        sequenceNumber: i,
        dailyPrice: 10000,
        status: "available",
      },
    });
  }
  console.log("[Seed] Garasi Sepeda: S001..S005 seeded.");

  // 5. Seed initial garages: C001–C005 (mobil)
  for (let i = 1; i <= 5; i++) {
    const code = `C${String(i).padStart(3, "0")}`;
    await prisma.garage.upsert({
      where: { code },
      update: {
        dailyPrice: 50000,
      },
      create: {
        code,
        type: "mobil",
        sequenceNumber: i,
        dailyPrice: 50000,
        status: "available",
      },
    });
  }
  console.log("[Seed] Garasi Mobil: C001..C005 seeded.");

  // 6. Seed initial garages: E001–E003 (mobil_listrik)
  for (let i = 1; i <= 3; i++) {
    const code = `E${String(i).padStart(3, "0")}`;
    await prisma.garage.upsert({
      where: { code },
      update: {
        dailyPrice: 75000,
        kwhPrice: 2500,
      },
      create: {
        code,
        type: "mobil_listrik",
        sequenceNumber: i,
        dailyPrice: 75000,
        kwhPrice: 2500,
        status: "available",
      },
    });
  }
  console.log("[Seed] Garasi Mobil Listrik: E001..E003 seeded.");

  console.log("GARENT Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
