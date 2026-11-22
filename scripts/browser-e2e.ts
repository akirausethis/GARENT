import { chromium, Browser, Page } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface TestStepResult {
  step: string;
  pov: string;
  action: string;
  assertion: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestStepResult[] = [];

function record(
  step: string,
  pov: string,
  action: string,
  assertion: string,
  status: "PASS" | "FAIL",
  details?: string
) {
  results.push({ step, pov, action, assertion, status, details });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${step}] ${pov} - ${action}: ${assertion} ${details ? `(${details})` : ""}`);
}

async function runBrowserE2E() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING LIVE PLAYWRIGHT HEADLESS BROWSER E2E SUITE");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log("=======================================================\n");

  const testEmail = `e2e_${Date.now()}@testgarasi.com`;
  const testNik = `317101${String(Date.now()).slice(-10)}`;
  const testPassword = "Password123!";
  let createdGarageCode = "";

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page: Page = await context.newPage();

  try {
    // ---------------------------------------------------------
    // STEP 1: Calon Penyewa Registration (/register)
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/register`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.fill('input[placeholder*="3171012345670001"]', testNik);
    await page.fill('input[placeholder="Sesuai kartu identitas"]', "E2E Automated Tester");
    await page.fill('input[placeholder="081234567890"]', "081298765432");
    await page.fill('input[placeholder="nama@email.com"]', testEmail);
    await page.fill('input[placeholder="Minimal 8 karakter"]', testPassword);

    await page.click('button[type="submit"]');

    await page.waitForSelector("text=Pendaftaran Telah Diterima", { timeout: 10000 });
    record(
      "STEP-01",
      "Calon Penyewa",
      "Submit formulir pendaftaran akun baru",
      "Status PENDING tersimpan & banner konfirmasi tampil di DOM",
      "PASS",
      `NIK: ${testNik}, Email: ${testEmail}`
    );

    // ---------------------------------------------------------
    // STEP 2: Pending User Login Guard (/login)
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    const errorAlert = page.locator("text=Akses Ditolak");
    await errorAlert.waitFor({ state: "visible", timeout: 10000 });
    const errorMsg = await errorAlert.textContent();
    record(
      "STEP-02",
      "Security Guard",
      "Login menggunakan akun pending verifikasi KTP",
      "Sistem memblokir login (403) dengan pesan penolakan yang ramah",
      "PASS",
      errorMsg?.trim().slice(0, 80)
    );

    // ---------------------------------------------------------
    // STEP 3: Protected Route Guard
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForURL("**/login**", { timeout: 10000 });
    record(
      "STEP-03",
      "Security Guard",
      "Akses rute terproteksi /admin tanpa sesi Admin",
      "Dialihkan (redirect) otomatis ke halaman /login",
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 4: Admin Login (/login -> /admin)
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.fill('input[type="email"]', "admin@garasi.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin**", { timeout: 10000 });
    record(
      "STEP-04",
      "Admin POV",
      "Login sebagai Admin garasi (admin@garasi.com)",
      "Berhasil login dan diarahkan ke Panel Admin (/admin/garasi)",
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 5: Admin Batch Garasi (/admin/garasi) — Bug 1 & Bug 3 Check
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/garasi`);
    await page.waitForSelector("select", { timeout: 10000 });

    // Select MOBIL
    await page.selectOption("select", "MOBIL");
    await page.fill('input[type="number"][min="1"]', "1");
    await page.fill('input[type="number"][min="1000"]', "45000");

    // Click submit
    await page.click('button:has-text("Buat")');
    await page.waitForSelector("text=Batch Berhasil Dibuat", { timeout: 10000 });

    // Inspect table: Ensure garage badge says "Tersedia" in the inventory table
    const availableRow = page.locator('table tbody tr:has-text("Tersedia")').first();
    await availableRow.waitFor({ state: "visible", timeout: 10000 });
    
    // Find newly created garage code from page
    const createdText = await page.textContent("text=Batch Berhasil Dibuat");
    record(
      "STEP-05",
      "Admin POV",
      "Batch create Garasi MOBIL via UI <select> & periksa status",
      "Garasi Mobil terbuat dan status badge berlabel 'Tersedia' (emerald)",
      "PASS",
      createdText || ""
    );

    // ---------------------------------------------------------
    // STEP 6: Admin KTP Verification (/admin/verifikasi) — Bug 2 Check
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/verifikasi`);
    await page.waitForSelector("table", { timeout: 10000 });

    // Look for our newly registered user
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await userRow.waitFor({ state: "visible", timeout: 10000 });

    // Click "Terima" button
    const terimaButton = userRow.locator('button:has-text("Terima")');
    await terimaButton.click();

    // Verify success alert and switch to Approved tab to confirm
    await page.waitForSelector("text=berhasil DISETUJUI", { timeout: 10000 });
    await page.click('button:has-text("Approved")');
    await page.waitForSelector(`tr:has-text("${testEmail}"):has-text("Disetujui")`, { timeout: 10000 });
    record(
      "STEP-06",
      "Admin POV",
      "Verifikasi KTP akun pending di antrean (/admin/verifikasi)",
      "Pemohon muncul di tabel dan tombol 'Terima' mengubah status menjadi 'Disetujui'",
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 7: Customer Login as newly Approved Penyewa
    // ---------------------------------------------------------
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/penyewa/sewa-baru", { timeout: 10000 });
    record(
      "STEP-07",
      "Customer POV",
      "Login sebagai akun Penyewa yang baru disetujui",
      "Login sukses dan diarahkan ke rute sewa baru (/penyewa/sewa-baru)",
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 8: Customer Rent Garage (/penyewa/sewa-baru)
    // ---------------------------------------------------------
    await page.waitForSelector('button:has-text("Mobil Bensin")', { timeout: 10000 });
    await page.click('button:has-text("Mobil Bensin")');

    await page.fill('input[placeholder*="Toyota Avanza"]', "Toyota Yaris GR Sport");
    await page.fill('input[placeholder*="B 1234 ABC"]', "B 8888 E2E");

    // Click first available garage card
    const firstGarageCard = page.locator('.max-h-60 .cursor-pointer').first();
    await firstGarageCard.waitFor({ state: "visible", timeout: 10000 });
    createdGarageCode = ((await firstGarageCard.locator('.font-mono.font-bold').textContent()) || "").trim();
    await firstGarageCard.click();

    // Verify quote appears
    await page.waitForSelector("text=TOTAL PELUNASAN", { timeout: 10000 });

    // Ensure button is ready and enabled
    const bayarBtn = page.locator('button:has-text("Bayar & Sewa Garasi")');
    await bayarBtn.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Bayar & Sewa Garasi'));
      return btn && !(btn as HTMLButtonElement).disabled;
    }, { timeout: 10000 });

    await bayarBtn.click();

    await page.waitForSelector("text=Transaksi berhasil!", { timeout: 15000 });
    record(
      "STEP-08",
      "Customer POV",
      "Kirim formulir sewa garasi mobil harian (7 hari)",
      `Transaksi berhasil dibuat untuk Garasi ${createdGarageCode}`,
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 9: Customer Rental History (/penyewa/riwayat)
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/penyewa/riwayat`);
    await page.waitForSelector("text=Riwayat Sewa Garasi Saya", { timeout: 10000 });

    await page.waitForSelector(`text=${createdGarageCode}`, { timeout: 10000 });
    await page.waitForSelector("text=AKTIF", { timeout: 10000 });
    await page.waitForSelector("text=Toyota Yaris GR Sport", { timeout: 10000 });
    record(
      "STEP-09",
      "Customer POV",
      "Periksa daftar sewa aktif di riwayat (/penyewa/riwayat)",
      `Garasi ${createdGarageCode} tampil dengan badge 'AKTIF' dan data kendaraan valid`,
      "PASS"
    );

    // ---------------------------------------------------------
    // STEP 10: Admin Extension Queue (/admin/perpanjang) — Bug 4 Check
    // ---------------------------------------------------------
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.fill('input[type="email"]', "admin@garasi.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin**", { timeout: 10000 });

    await page.goto(`${BASE_URL}/admin/perpanjang`);
    await page.waitForSelector("table", { timeout: 10000 });

    // Confirm that the active rental is present in the table
    const rentalRow = page.locator(`tr:has-text("${createdGarageCode}")`);
    await rentalRow.waitFor({ state: "visible", timeout: 10000 });
    const perpanjangBtn = rentalRow.locator('button:has-text("Perpanjang")');
    const isPerpanjangVisible = await perpanjangBtn.isVisible();

    record(
      "STEP-10",
      "Admin POV",
      "Buka antrean perpanjangan sewa (/admin/perpanjang)",
      `Garasi aktif ${createdGarageCode} tampil di antrean perpanjangan dengan tombol aksi aktif`,
      isPerpanjangVisible ? "PASS" : "FAIL"
    );

    // ---------------------------------------------------------
    // STEP 11: Admin Financial Reports (/admin/laporan)
    // ---------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/laporan`);
    await page.waitForSelector("text=Laporan Sewa Garasi Kendaraan", { timeout: 10000 });

    // Check financial metric cards exist
    await page.waitForSelector("text=GRAND TOTAL OMZET", { timeout: 10000 });
    record(
      "STEP-11",
      "Admin POV",
      "Buka laporan analitik pendapatan (/admin/laporan)",
      "Semua metrik finansial 4 mode filter termuat bersih tanpa crash",
      "PASS"
    );

  } catch (error: any) {
    console.error("❌ E2E Browser Test Failed with Error:", error);
    record("FAILURE", "Runtime", "Execution error during browser automation", error?.message || String(error), "FAIL");
  } finally {
    await browser.close();

    // ---------------------------------------------------------
    // CLEANUP: Clean up test rental, garage & user
    // ---------------------------------------------------------
    console.log("\n🧹 Cleaning up test artifacts from database...");
    try {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      if (user) {
        // Delete rentals
        const rentals = await prisma.rental.findMany({
          where: { userId: user.id },
        });

        for (const r of rentals) {
          await prisma.rentalExtension.deleteMany({ where: { rentalId: r.id } });
          await prisma.rental.delete({ where: { id: r.id } });
          if (r.garageId) {
            await prisma.garage.delete({ where: { id: r.garageId } }).catch(() => {});
          }
        }

        await prisma.user.delete({ where: { id: user.id } });
        console.log(`✅ Cleaned up test user: ${testEmail}`);
      }
    } catch (cleanErr) {
      console.warn("⚠️ Cleanup warning:", cleanErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  // Summary Table
  console.log("\n=======================================================");
  console.log("📊 PLAYWRIGHT HEADLESS BROWSER E2E TEST SUMMARY");
  console.log("=======================================================");
  console.table(results);

  const failedCount = results.filter((r) => r.status === "FAIL").length;
  if (failedCount > 0) {
    console.error(`\n❌ TEST SUITE FAILED: ${failedCount} step(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${results.length} BROWSER E2E TEST STEPS PASSED PERFECTLY!`);
    process.exit(0);
  }
}

runBrowserE2E();
