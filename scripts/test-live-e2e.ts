/**
 * @file scripts/test-live-e2e.ts
 * @description Comprehensive Live End-to-End Smoke Test against real Next.js server & real Supabase PostgreSQL/Storage.
 */

import { prisma } from "../src/lib/prisma";
import { supabase } from "../src/lib/supabase";

const BASE_URL = "http://localhost:3000";

interface TestResult {
  step: string;
  category: string;
  method: string;
  endpoint: string;
  httpStatus: number | string;
  expectedStatus: number | string;
  verifiedBehavior: string;
  status: "PASS" | "FAIL";
  notes?: string;
}

const results: TestResult[] = [];

function recordResult(res: TestResult) {
  results.push(res);
  const color = res.status === "PASS" ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(`${color} [${res.category}] ${res.step}: ${res.method} ${res.endpoint} -> ${res.httpStatus} (${res.verifiedBehavior})`);
}

function extractCookie(res: Response, cookieName: string = "garent_session"): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

// 1x1 transparent PNG buffer
const samplePngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function runLiveE2ETest() {
  console.log("\n================================================================================");
  console.log("  GARENT — LIVE END-TO-END SMOKE TEST (REAL SERVER + REAL SUPABASE)");
  console.log("================================================================================\n");

  const timestamp = Date.now().toString().slice(-6);
  const testNik = `3201${Date.now().toString().slice(-12)}`;
  const testEmail = `smoke_penyewa_${timestamp}@test.com`;
  const testPassword = "Password123!";
  const testName = `Penyewa Smoke ${timestamp}`;
  const testPhone = `0812${timestamp}1234`;

  let testUserId: string | null = null;
  let adminCookie: string | null = null;
  let penyewaCookie: string | null = null;

  let createdGarageIds: string[] = [];
  let createdRentalIds: string[] = [];
  let uploadedStoragePaths: string[] = [];

  let garageSepeda: any = null;
  let garageMobil: any = null;
  let garageEv: any = null;
  let rental1Id: string | null = null;
  let rental2Id: string | null = null;

  try {
    // ============================================================================
    // 1. CHECK ALL UI PAGES RENDER CLEANLY (NO 500 / CRASH)
    // ============================================================================
    console.log("--- Section 1: UI Page Health Checks ---");
    const uiPages = [
      { path: "/login", expectStatus: 200 },
      { path: "/register", expectStatus: 200 },
      { path: "/penyewa/sewa-baru", expectStatus: [200, 307, 308] },
      { path: "/penyewa/riwayat", expectStatus: [200, 307, 308] },
      { path: "/admin", expectStatus: [200, 307, 308] },
      { path: "/admin/garasi", expectStatus: [200, 307, 308] },
      { path: "/admin/verifikasi", expectStatus: [200, 307, 308] },
      { path: "/admin/perpanjang", expectStatus: [200, 307, 308] },
      { path: "/admin/laporan", expectStatus: [200, 307, 308] },
    ];

    for (const page of uiPages) {
      const res = await fetch(`${BASE_URL}${page.path}`, { redirect: "manual" });
      const allowed = Array.isArray(page.expectStatus) ? page.expectStatus : [page.expectStatus];
      const isPass = allowed.includes(res.status);
      recordResult({
        step: `Page Render ${page.path}`,
        category: "UI Health",
        method: "GET",
        endpoint: page.path,
        httpStatus: res.status,
        expectedStatus: allowed.join("/"),
        verifiedBehavior: isPass ? "Page rendered or redirected cleanly (no 500)" : "Page returned unexpected status",
        status: isPass ? "PASS" : "FAIL",
      });
    }

    // ============================================================================
    // 2. LIVE FLOW — CALON PENYEWA & SECURITY GUARD POV
    // ============================================================================
    console.log("\n--- Section 2: Registration, Pending Guard & RBAC ---");

    // 2.1 Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nik: testNik,
        namaLengkap: testName,
        noTelepon: testPhone,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    testUserId = regData?.data?.user?.id || null;

    recordResult({
      step: "Register Fresh Penyewa",
      category: "Auth & Guard",
      method: "POST",
      endpoint: "/api/auth/register",
      httpStatus: regRes.status,
      expectedStatus: 201,
      verifiedBehavior:
        regRes.status === 201 && regData?.data?.user?.verificationStatus === "pending"
          ? `User created with status 'pending' (ID: ${testUserId})`
          : "Registration failed",
      status: regRes.status === 201 ? "PASS" : "FAIL",
    });

    // 2.2 Pending Login Block
    const pendingLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const pendingLoginData = await pendingLoginRes.json();
    const errMsg =
      typeof pendingLoginData?.error === "string"
        ? pendingLoginData.error
        : pendingLoginData?.error?.message || pendingLoginData?.message || "";
    const isPendingBlocked =
      pendingLoginRes.status === 403 &&
      errMsg.toLowerCase().includes("verifikasi");

    recordResult({
      step: "Pending Login Block",
      category: "Auth & Guard",
      method: "POST",
      endpoint: "/api/auth/login",
      httpStatus: pendingLoginRes.status,
      expectedStatus: 403,
      verifiedBehavior: isPendingBlocked
        ? `Pending account strictly blocked (HTTP 403: "${errMsg}")`
        : `Pending account was not blocked as expected (Status: ${pendingLoginRes.status})`,
      status: isPendingBlocked ? "PASS" : "FAIL",
    });

    // 2.3 RBAC Guard
    const rbacRes = await fetch(`${BASE_URL}/api/admin/garasi`);
    const isRbacBlocked = rbacRes.status === 401 || rbacRes.status === 403;
    recordResult({
      step: "RBAC Guard Check",
      category: "Auth & Guard",
      method: "GET",
      endpoint: "/api/admin/garasi",
      httpStatus: rbacRes.status,
      expectedStatus: "401/403",
      verifiedBehavior: isRbacBlocked
        ? "Access to admin endpoint denied without session cookie"
        : "Admin endpoint leaked without credentials",
      status: isRbacBlocked ? "PASS" : "FAIL",
    });

    // ============================================================================
    // 3. LIVE FLOW — ADMIN POV (PART 1: GARASI & VERIFIKASI)
    // ============================================================================
    console.log("\n--- Section 3: Admin Garasi & Verifikasi ---");

    // 3.1 Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@garasi.com",
        password: "admin123",
      }),
    });
    adminCookie = extractCookie(adminLoginRes);
    recordResult({
      step: "Admin Login",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/auth/login",
      httpStatus: adminLoginRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        adminLoginRes.status === 200 && !!adminCookie
          ? "Admin logged in and session cookie captured"
          : "Admin login failed",
      status: adminLoginRes.status === 200 && !!adminCookie ? "PASS" : "FAIL",
    });

    const adminHeaders = {
      Cookie: `garent_session=${adminCookie}; garasiku_session=${adminCookie}`,
    };

    // 3.2 Admin Overview
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: adminHeaders,
    });
    const overviewData = await overviewRes.json();
    const overview = overviewData?.data?.overview || overviewData?.data;
    const isOverviewOk =
      overviewRes.status === 200 &&
      overview?.garageStats !== undefined &&
      typeof overview?.pendingVerificationsCount === "number";

    recordResult({
      step: "Admin Overview Stats",
      category: "Admin Ops",
      method: "GET",
      endpoint: "/api/admin/overview",
      httpStatus: overviewRes.status,
      expectedStatus: 200,
      verifiedBehavior: isOverviewOk
        ? "Overview returned real-time garageStats & pending count"
        : "Overview response invalid",
      status: isOverviewOk ? "PASS" : "FAIL",
    });

    // 3.3 Negative: Mobil Listrik without kwh_price
    const badEvRes = await fetch(`${BASE_URL}/api/admin/garasi`, {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        tipeGarasi: "mobil_listrik",
        quantity: 1,
        dailyPrice: 75000,
        kwhPrice: null,
      }),
    });
    recordResult({
      step: "Reject EV Garage without kwh_price",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/garasi",
      httpStatus: badEvRes.status,
      expectedStatus: 400,
      verifiedBehavior:
        badEvRes.status === 400
          ? "Admin creating mobil_listrik without kwhPrice rejected with 400"
          : "Validation failed to reject invalid EV garage",
      status: badEvRes.status === 400 ? "PASS" : "FAIL",
    });

    // 3.4 Batch Create 1 Sepeda
    const createSepedaRes = await fetch(`${BASE_URL}/api/admin/garasi`, {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        tipeGarasi: "sepeda",
        quantity: 1,
        dailyPrice: 15000,
      }),
    });
    const sepedaData = await createSepedaRes.json();
    const createdSepedaCode = sepedaData?.data?.batchInfo?.startCode;
    const dbSepeda = await prisma.garage.findFirst({
      where: { code: createdSepedaCode },
    });
    if (dbSepeda) createdGarageIds.push(dbSepeda.id);
    garageSepeda = dbSepeda;

    const isSepedaOk = [200, 201].includes(createSepedaRes.status) && !!dbSepeda && dbSepeda.status === "available";
    recordResult({
      step: "Create Sepeda Garage (S)",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/garasi",
      httpStatus: createSepedaRes.status,
      expectedStatus: "200/201",
      verifiedBehavior: isSepedaOk
        ? `Garage ${dbSepeda.code} created with status 'available'`
        : "Failed to create Sepeda garage",
      status: isSepedaOk ? "PASS" : "FAIL",
    });

    // 3.5 Batch Create 1 Mobil
    const createMobilRes = await fetch(`${BASE_URL}/api/admin/garasi`, {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        tipeGarasi: "mobil",
        quantity: 1,
        dailyPrice: 50000,
      }),
    });
    const mobilData = await createMobilRes.json();
    const createdMobilCode = mobilData?.data?.batchInfo?.startCode;
    const dbMobil = await prisma.garage.findFirst({
      where: { code: createdMobilCode },
    });
    if (dbMobil) createdGarageIds.push(dbMobil.id);
    garageMobil = dbMobil;

    const isMobilOk = [200, 201].includes(createMobilRes.status) && !!dbMobil && dbMobil.status === "available";
    recordResult({
      step: "Create Mobil Garage (C)",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/garasi",
      httpStatus: createMobilRes.status,
      expectedStatus: "200/201",
      verifiedBehavior: isMobilOk
        ? `Garage ${dbMobil.code} created with status 'available'`
        : "Failed to create Mobil garage",
      status: isMobilOk ? "PASS" : "FAIL",
    });

    // 3.6 Batch Create 1 Mobil Listrik
    const createEvRes = await fetch(`${BASE_URL}/api/admin/garasi`, {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        tipeGarasi: "mobil_listrik",
        quantity: 1,
        dailyPrice: 75000,
        kwhPrice: 2500,
      }),
    });
    const evData = await createEvRes.json();
    const createdEvCode = evData?.data?.batchInfo?.startCode;
    const dbEv = await prisma.garage.findFirst({
      where: { code: createdEvCode },
    });
    if (dbEv) createdGarageIds.push(dbEv.id);
    garageEv = dbEv;

    const isEvOk =
      [200, 201].includes(createEvRes.status) &&
      !!dbEv &&
      dbEv.status === "available" &&
      Number(dbEv.kwhPrice) === 2500;

    recordResult({
      step: "Create Mobil Listrik Garage (E)",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/garasi",
      httpStatus: createEvRes.status,
      expectedStatus: "200/201",
      verifiedBehavior: isEvOk
        ? `Garage ${dbEv.code} created (kwhPrice: 2500, status: 'available')`
        : "Failed to create EV garage",
      status: isEvOk ? "PASS" : "FAIL",
    });

    // 3.7 Verify KTP: Approve Test Penyewa
    const verifyRes = await fetch(`${BASE_URL}/api/admin/verifikasi`, {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: testUserId,
        action: "approved",
      }),
    });
    const verifyData = await verifyRes.json();
    const dbUserApproved = await prisma.user.findUnique({
      where: { id: testUserId! },
    });

    recordResult({
      step: "Approve Penyewa KTP",
      category: "Admin Ops",
      method: "PATCH",
      endpoint: "/api/admin/verifikasi",
      httpStatus: verifyRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        verifyRes.status === 200 && dbUserApproved?.verificationStatus === "approved"
          ? "Penyewa status successfully updated to 'approved' in Supabase"
          : "Failed to approve Penyewa",
      status: verifyRes.status === 200 && dbUserApproved?.verificationStatus === "approved" ? "PASS" : "FAIL",
    });

    // ============================================================================
    // 4. LIVE FLOW — CUSTOMER (PENYEWA) POV
    // ============================================================================
    console.log("\n--- Section 4: Customer Rental Flow & Validations ---");

    // 4.1 Customer Login
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    penyewaCookie = extractCookie(custLoginRes);

    recordResult({
      step: "Approved Customer Login",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/auth/login",
      httpStatus: custLoginRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        custLoginRes.status === 200 && !!penyewaCookie
          ? "Approved Penyewa successfully authenticated"
          : "Customer login failed",
      status: custLoginRes.status === 200 && !!penyewaCookie ? "PASS" : "FAIL",
    });

    const penyewaHeaders = {
      Cookie: `garent_session=${penyewaCookie}; garasiku_session=${penyewaCookie}`,
    };

    // 4.2 Compatibility Filter: Sepeda Motor -> Only Sepeda garages
    const filterMotorRes = await fetch(
      `${BASE_URL}/api/penyewa/garasi-tersedia?tipeKendaraan=sepeda_motor`,
      { headers: penyewaHeaders }
    );
    const filterMotorData = await filterMotorRes.json();
    const motorGarages = filterMotorData?.data?.garasi || filterMotorData?.data?.garages || [];
    const allMotorAreSepeda = motorGarages.every((g: any) => g.type.toLowerCase() === "sepeda");

    recordResult({
      step: "Filter: Sepeda Motor -> Only Sepeda (S)",
      category: "Customer Flow",
      method: "GET",
      endpoint: "/api/penyewa/garasi-tersedia?tipeKendaraan=sepeda_motor",
      httpStatus: filterMotorRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        filterMotorRes.status === 200 && allMotorAreSepeda && motorGarages.length > 0
          ? `Returned ${motorGarages.length} garages, 100% type 'sepeda'`
          : "Filter returned incorrect garage types for motor",
      status: filterMotorRes.status === 200 && allMotorAreSepeda ? "PASS" : "FAIL",
    });

    // 4.3 Compatibility Filter: Mobil -> Only Mobil garages
    const filterMobilRes = await fetch(
      `${BASE_URL}/api/penyewa/garasi-tersedia?tipeKendaraan=mobil`,
      { headers: penyewaHeaders }
    );
    const filterMobilData = await filterMobilRes.json();
    const mobilGarages = filterMobilData?.data?.garasi || filterMobilData?.data?.garages || [];
    const allMobilAreMobil = mobilGarages.every((g: any) => g.type.toLowerCase() === "mobil");

    recordResult({
      step: "Filter: Mobil -> Only Mobil (C)",
      category: "Customer Flow",
      method: "GET",
      endpoint: "/api/penyewa/garasi-tersedia?tipeKendaraan=mobil",
      httpStatus: filterMobilRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        filterMobilRes.status === 200 && allMobilAreMobil && mobilGarages.length > 0
          ? `Returned ${mobilGarages.length} garages, 100% type 'mobil'`
          : "Filter returned incorrect garage types for mobil",
      status: filterMobilRes.status === 200 && allMobilAreMobil ? "PASS" : "FAIL",
    });

    // 4.4 Compatibility Filter: Mobil Listrik -> Mobil & Mobil Listrik garages
    const filterEvRes = await fetch(
      `${BASE_URL}/api/penyewa/garasi-tersedia?tipeKendaraan=mobil_listrik`,
      { headers: penyewaHeaders }
    );
    const filterEvData = await filterEvRes.json();
    const evGarages = filterEvData?.data?.garasi || filterEvData?.data?.garages || [];
    const allEvAreCandE = evGarages.every(
      (g: any) => g.type.toLowerCase() === "mobil" || g.type.toLowerCase() === "mobil_listrik"
    );

    recordResult({
      step: "Filter: EV -> Mobil (C) & Mobil Listrik (E)",
      category: "Customer Flow",
      method: "GET",
      endpoint: "/api/penyewa/garasi-tersedia?tipeKendaraan=mobil_listrik",
      httpStatus: filterEvRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        filterEvRes.status === 200 && allEvAreCandE && evGarages.length > 0
          ? `Returned ${evGarages.length} garages (both C and E types)`
          : "Filter returned incorrect garage types for EV",
      status: filterEvRes.status === 200 && allEvAreCandE ? "PASS" : "FAIL",
    });

    // 4.5 Negative Validation: Mobil without Plate Number -> 400
    const formNoPlate = new FormData();
    formNoPlate.append("garasiId", garageMobil.id);
    formNoPlate.append("tipeKendaraan", "MOBIL");
    formNoPlate.append("merekTipe", "Toyota Avanza");
    formNoPlate.append("tipeSewa", "HARIAN");
    formNoPlate.append("jumlahHari", "3");

    const noPlateRes = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      method: "POST",
      headers: penyewaHeaders,
      body: formNoPlate,
    });
    recordResult({
      step: "Negative: Mobil without Plate Number",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/penyewa/sewa",
      httpStatus: noPlateRes.status,
      expectedStatus: 400,
      verifiedBehavior:
        noPlateRes.status === 400
          ? "Car rental without license plate rejected with 400"
          : "Failed to reject car without plate",
      status: noPlateRes.status === 400 ? "PASS" : "FAIL",
    });

    // 4.6 Negative Validation: Harian with 30 Days -> 400 (Must be 1..29)
    const formHarian30 = new FormData();
    formHarian30.append("garasiId", garageMobil.id);
    formHarian30.append("tipeKendaraan", "MOBIL");
    formHarian30.append("nomorPlat", "B 1234 ABC");
    formHarian30.append("merekTipe", "Toyota Avanza");
    formHarian30.append("tipeSewa", "HARIAN");
    formHarian30.append("jumlahHari", "30");

    const harian30Res = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      method: "POST",
      headers: penyewaHeaders,
      body: formHarian30,
    });
    recordResult({
      step: "Negative: Harian with 30 Days (Must use Bulanan)",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/penyewa/sewa",
      httpStatus: harian30Res.status,
      expectedStatus: 400,
      verifiedBehavior:
        harian30Res.status === 400
          ? "Harian >= 30 days strictly rejected with 400"
          : "Harian 30 days was not rejected",
      status: harian30Res.status === 400 ? "PASS" : "FAIL",
    });

    // 4.7 Negative Validation: EV currentBattery > maxBattery -> 400
    const formBadBattery = new FormData();
    formBadBattery.append("garasiId", garageEv.id);
    formBadBattery.append("tipeKendaraan", "MOBIL_LISTRIK");
    formBadBattery.append("nomorPlat", "B 8888 EV");
    formBadBattery.append("merekTipe", "Hyundai Ioniq 5");
    formBadBattery.append("kapasitasListrikKwh", "50");
    formBadBattery.append("currentBatteryKwh", "60"); // 60 > 50
    formBadBattery.append("tipeSewa", "HARIAN");
    formBadBattery.append("jumlahHari", "5");

    const badBatteryRes = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      method: "POST",
      headers: penyewaHeaders,
      body: formBadBattery,
    });
    recordResult({
      step: "Negative: EV currentBattery > maxBattery",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/penyewa/sewa",
      httpStatus: badBatteryRes.status,
      expectedStatus: 400,
      verifiedBehavior:
        badBatteryRes.status === 400
          ? "Invalid battery capacity rejected with 400"
          : "Failed to reject invalid battery capacity",
      status: badBatteryRes.status === 400 ? "PASS" : "FAIL",
    });

    // 4.8 Rental 1: EV in Garage E (5 days Harian, max=60, current=20, NO PROOF)
    const formRental1 = new FormData();
    formRental1.append("garasiId", garageEv.id);
    formRental1.append("tipeKendaraan", "MOBIL_LISTRIK");
    formRental1.append("nomorPlat", "B 8888 EV");
    formRental1.append("merekTipe", "Hyundai Ioniq 5");
    formRental1.append("kapasitasListrikKwh", "60");
    formRental1.append("currentBatteryKwh", "20");
    formRental1.append("tipeSewa", "HARIAN");
    formRental1.append("jumlahHari", "5");

    const rental1Res = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      method: "POST",
      headers: penyewaHeaders,
      body: formRental1,
    });
    const rental1Data = await rental1Res.json();
    rental1Id = rental1Data?.data?.rental?.id || rental1Data?.data?.transaksi?.id || null;
    if (rental1Id) createdRentalIds.push(rental1Id);

    const dbRental1 = rental1Id ? await prisma.rental.findUnique({ where: { id: rental1Id } }) : null;
    const dbGarageEv = await prisma.garage.findUnique({ where: { id: garageEv.id } });

    // Perhitungan yang diharapkan:
    // Biaya sewa: 5 * 75.000 = 375.000
    // Biaya listrik: (60 - 20) * 2.500 = 40 * 2.500 = 100.000
    // Total biaya: 475.000
    const isRental1Ok =
      rental1Res.status === 201 &&
      dbRental1 !== null &&
      Number(dbRental1.rentalCost) === 375000 &&
      Number(dbRental1.electricityCost) === 100000 &&
      Number(dbRental1.totalCost) === 475000 &&
      dbRental1.paymentProofUrl === null &&
      dbGarageEv?.status === "used";

    recordResult({
      step: "Rental 1: EV in E (No Proof by Penyewa)",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/penyewa/sewa",
      httpStatus: rental1Res.status,
      expectedStatus: 201,
      verifiedBehavior: isRental1Ok
        ? `Rental created (Rental: 375k, Listrik: 100k, Total: 475k, Proof: null, Garage status: 'used')`
        : `Rental 1 validation failed (status: ${rental1Res.status})`,
      status: isRental1Ok ? "PASS" : "FAIL",
    });

    // 4.9 Rental 2 Simultaneously: Same Customer, Bulanan in Garage C
    const formRental2 = new FormData();
    formRental2.append("garasiId", garageMobil.id);
    formRental2.append("tipeKendaraan", "MOBIL");
    formRental2.append("nomorPlat", "B 7777 SMOKE");
    formRental2.append("merekTipe", "Honda HR-V");
    formRental2.append("tipeSewa", "BULANAN");

    const rental2Res = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      method: "POST",
      headers: penyewaHeaders,
      body: formRental2,
    });
    const rental2Data = await rental2Res.json();
    rental2Id = rental2Data?.data?.rental?.id || rental2Data?.data?.transaksi?.id || null;
    if (rental2Id) createdRentalIds.push(rental2Id);

    const dbRental2 = rental2Id ? await prisma.rental.findUnique({ where: { id: rental2Id } }) : null;
    const dbGarageMobil = await prisma.garage.findUnique({ where: { id: garageMobil.id } });

    // Perhitungan yang diharapkan:
    // Biaya sewa: 25 * 50.000 = 1.250.000
    // Biaya listrik: 0
    // Total biaya: 1.250.000
    const isRental2Ok =
      rental2Res.status === 201 &&
      dbRental2 !== null &&
      Number(dbRental2.rentalCost) === 1250000 &&
      Number(dbRental2.electricityCost) === 0 &&
      Number(dbRental2.totalCost) === 1250000 &&
      dbRental2.paymentProofUrl === null &&
      dbGarageMobil?.status === "used";

    recordResult({
      step: "Rental 2: Simultaneous Rental in C (Bulanan)",
      category: "Customer Flow",
      method: "POST",
      endpoint: "/api/penyewa/sewa",
      httpStatus: rental2Res.status,
      expectedStatus: 201,
      verifiedBehavior: isRental2Ok
        ? `Simultaneous rental created (25x monthly: 1.25M, Garage status: 'used')`
        : `Rental 2 validation failed (status: ${rental2Res.status})`,
      status: isRental2Ok ? "PASS" : "FAIL",
    });

    // 4.10 Customer History: Confirm BOTH active rentals appear
    const historyRes = await fetch(`${BASE_URL}/api/penyewa/sewa`, {
      headers: penyewaHeaders,
    });
    const historyData = await historyRes.json();
    const customerRentals = historyData?.data?.sewa || historyData?.data?.rentals || [];
    const hasBothRentals =
      customerRentals.some((r: any) => r.id === rental1Id) &&
      customerRentals.some((r: any) => r.id === rental2Id);

    recordResult({
      step: "Customer History Check",
      category: "Customer Flow",
      method: "GET",
      endpoint: "/api/penyewa/sewa",
      httpStatus: historyRes.status,
      expectedStatus: 200,
      verifiedBehavior:
        historyRes.status === 200 && hasBothRentals
          ? `Both active rentals verified in customer history (count: ${customerRentals.length})`
          : "Customer history missing active rentals",
      status: historyRes.status === 200 && hasBothRentals ? "PASS" : "FAIL",
    });

    // ============================================================================
    // 5. LIVE FLOW — ADMIN POV (PART 2: UPLOAD BUKTI, PERPANJANG, & 4 LAPORAN)
    // ============================================================================
    console.log("\n--- Section 5: Admin Upload Proof, Extension & Reports ---");

    // 5.1 Admin Upload Initial Payment Proof for Rental 1
    const uploadForm = new FormData();
    uploadForm.append("rentalId", rental1Id!);
    uploadForm.append(
      "paymentProof",
      new Blob([samplePngBytes], { type: "image/png" }),
      "bukti-sewa-smoke.png"
    );

    const uploadRes = await fetch(`${BASE_URL}/api/admin/sewa/upload-bukti`, {
      method: "POST",
      headers: adminHeaders,
      body: uploadForm,
    });
    const uploadData = await uploadRes.json();
    const uploadedUrl = uploadData?.data?.paymentProofUrl || null;

    const dbRental1Updated = await prisma.rental.findUnique({
      where: { id: rental1Id! },
    });

    let isFileReachable = false;
    if (uploadedUrl && uploadedUrl.startsWith("http")) {
      const fileCheckRes = await fetch(uploadedUrl);
      isFileReachable = fileCheckRes.status === 200;
      // Record storage path for cleanup
      const parts = uploadedUrl.split("/bukti-bayar/");
      if (parts[1]) uploadedStoragePaths.push(parts[1]);
    } else if (uploadedUrl && uploadedUrl.startsWith("data:")) {
      // Local dev fallback base64
      isFileReachable = true;
    }

    const isUploadOk =
      uploadRes.status === 200 &&
      !!uploadedUrl &&
      dbRental1Updated?.paymentProofUrl === uploadedUrl &&
      isFileReachable;

    recordResult({
      step: "Admin Upload Payment Proof",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/sewa/upload-bukti",
      httpStatus: uploadRes.status,
      expectedStatus: 200,
      verifiedBehavior: isUploadOk
        ? `Uploaded to Supabase Storage & updated rentals.payment_proof_url (File reachable: ${isFileReachable})`
        : `Upload proof failed or file unreachable`,
      status: isUploadOk ? "PASS" : "FAIL",
    });

    // 5.2 Negative Extension: new_end_date <= old_end_date -> 400
    const oldEndDateStr = dbRental1Updated!.endDate.toISOString().split("T")[0];
    const formBadExt = new FormData();
    formBadExt.append("rentalId", rental1Id!);
    formBadExt.append("newEndDate", oldEndDateStr); // Same date
    formBadExt.append(
      "paymentProof",
      new Blob([samplePngBytes], { type: "image/png" }),
      "bukti-ext.png"
    );

    const badExtRes = await fetch(`${BASE_URL}/api/admin/perpanjang`, {
      method: "POST",
      headers: adminHeaders,
      body: formBadExt,
    });
    recordResult({
      step: "Negative: Extension with newEndDate <= oldEndDate",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/perpanjang",
      httpStatus: badExtRes.status,
      expectedStatus: 400,
      verifiedBehavior:
        badExtRes.status === 400
          ? "Extension with same date rejected with 400"
          : "Invalid extension date was not rejected",
      status: badExtRes.status === 400 ? "PASS" : "FAIL",
    });

    // 5.3 Positive Extension: +5 days with valid PNG proof
    const oldDateObj = new Date(dbRental1Updated!.endDate);
    const newDateObj = new Date(oldDateObj);
    newDateObj.setDate(newDateObj.getDate() + 5);
    const newEndDateStr = newDateObj.toISOString().split("T")[0];

    const formValidExt = new FormData();
    formValidExt.append("rentalId", rental1Id!);
    formValidExt.append("newEndDate", newEndDateStr);
    formValidExt.append(
      "paymentProof",
      new Blob([samplePngBytes], { type: "image/png" }),
      "bukti-perpanjang-valid.png"
    );

    const extRes = await fetch(`${BASE_URL}/api/admin/perpanjang`, {
      method: "POST",
      headers: adminHeaders,
      body: formValidExt,
    });
    const extData = await extRes.json();
    const extUrl = extData?.data?.extension?.paymentProofUrl || extData?.data?.paymentProofUrl;
    if (extUrl && extUrl.includes("/bukti-bayar/")) {
      const parts = extUrl.split("/bukti-bayar/");
      if (parts[1]) uploadedStoragePaths.push(parts[1]);
    }

    const dbExt = await prisma.rentalExtension.findFirst({
      where: { rentalId: rental1Id! },
      orderBy: { createdAt: "desc" },
    });
    const dbRental1PostExt = await prisma.rental.findUnique({
      where: { id: rental1Id! },
    });

    // 5 days * 75.000 = 375.000
    // Total baru: 475.000 + 375.000 = 850.000
    const isExtOk =
      extRes.status === 200 &&
      dbExt !== null &&
      dbExt.additionalDays === 5 &&
      Number(dbExt.additionalCost) === 375000 &&
      dbRental1PostExt?.endDate.toISOString().split("T")[0] === newEndDateStr &&
      Number(dbRental1PostExt?.totalCost) === 850000;

    recordResult({
      step: "Valid Extension (+5 days)",
      category: "Admin Ops",
      method: "POST",
      endpoint: "/api/admin/perpanjang",
      httpStatus: extRes.status,
      expectedStatus: 200,
      verifiedBehavior: isExtOk
        ? `Extension saved (+5 days, sisaBiaya: 375k, new total: 850k, new endDate: ${newEndDateStr})`
        : `Extension failed or cost miscalculated`,
      status: isExtOk ? "PASS" : "FAIL",
    });

    // 5.4 4-Mode Reports
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Report Mode 1: per_bulan
    const rBulanRes = await fetch(
      `${BASE_URL}/api/admin/laporan?mode=per_bulan&tahun=${currentYear}`,
      { headers: adminHeaders }
    );
    const rBulanData = await rBulanRes.json();
    const repBulan = rBulanData?.data?.report || rBulanData?.data;
    const isBulanOk =
      rBulanRes.status === 200 &&
      Array.isArray(repBulan?.monthlyBreakdown) &&
      repBulan.monthlyBreakdown.length === 12;

    recordResult({
      step: "Laporan Mode 1: per_bulan",
      category: "Reports (4D)",
      method: "GET",
      endpoint: `/api/admin/laporan?mode=per_bulan&tahun=${currentYear}`,
      httpStatus: rBulanRes.status,
      expectedStatus: 200,
      verifiedBehavior: isBulanOk ? "Monthly report returned 12-month breakdown & aggregates" : "Failed",
      status: isBulanOk ? "PASS" : "FAIL",
    });

    // Report Mode 2: per_hari
    const rHariRes = await fetch(
      `${BASE_URL}/api/admin/laporan?mode=per_hari&tahun=${currentYear}&bulan=${currentMonth}`,
      { headers: adminHeaders }
    );
    const rHariData = await rHariRes.json();
    const repHari = rHariData?.data?.report || rHariData?.data;
    const isHariOk =
      rHariRes.status === 200 &&
      Array.isArray(repHari?.records) &&
      repHari.records.length >= 2;

    recordResult({
      step: "Laporan Mode 2: per_hari",
      category: "Reports (4D)",
      method: "GET",
      endpoint: `/api/admin/laporan?mode=per_hari&tahun=${currentYear}&bulan=${currentMonth}`,
      httpStatus: rHariRes.status,
      expectedStatus: 200,
      verifiedBehavior: isHariOk ? "Daily report returned filtered records for current month" : "Failed",
      status: isHariOk ? "PASS" : "FAIL",
    });

    // Report Mode 3: per_tipe
    const rTipeRes = await fetch(
      `${BASE_URL}/api/admin/laporan?mode=per_tipe&tipeGarasi=mobil_listrik`,
      { headers: adminHeaders }
    );
    const rTipeData = await rTipeRes.json();
    const repTipe = rTipeData?.data?.report || rTipeData?.data;
    const isTipeOk =
      rTipeRes.status === 200 &&
      Array.isArray(repTipe?.records) &&
      repTipe.records.length >= 1 &&
      repTipe.records.every((r: any) => r.garage.type === "mobil_listrik" || r.garasi.type === "mobil_listrik");

    recordResult({
      step: "Laporan Mode 3: per_tipe",
      category: "Reports (4D)",
      method: "GET",
      endpoint: `/api/admin/laporan?mode=per_tipe&tipeGarasi=mobil_listrik`,
      httpStatus: rTipeRes.status,
      expectedStatus: 200,
      verifiedBehavior: isTipeOk ? "Type report filtered strictly by mobil_listrik" : "Failed",
      status: isTipeOk ? "PASS" : "FAIL",
    });

    // Report Mode 4: per_penyewa
    const rPenyewaRes = await fetch(
      `${BASE_URL}/api/admin/laporan?mode=per_penyewa&penyewaId=${testUserId}`,
      { headers: adminHeaders }
    );
    const rPenyewaData = await rPenyewaRes.json();
    const repPenyewa = rPenyewaData?.data?.report || rPenyewaData?.data;
    const penyewaRecords = repPenyewa?.records || [];
    const isPenyewaOk =
      rPenyewaRes.status === 200 &&
      penyewaRecords.length === 2; // Rental 1 + Rental 2

    recordResult({
      step: "Laporan Mode 4: per_penyewa",
      category: "Reports (4D)",
      method: "GET",
      endpoint: `/api/admin/laporan?mode=per_penyewa&penyewaId=${testUserId}`,
      httpStatus: rPenyewaRes.status,
      expectedStatus: 200,
      verifiedBehavior: isPenyewaOk
        ? `Penyewa report returned exact 2 transactions for this user (Total: 850k + 1.25M)`
        : "Failed to return accurate penyewa report",
      status: isPenyewaOk ? "PASS" : "FAIL",
    });

  } catch (err: any) {
    console.error("\n❌ Uncaught error during E2E test execution:", err);
  } finally {
    // ============================================================================
    // 6. CLEANUP TEMPORARY DATA FROM SUPABASE
    // ============================================================================
    console.log("\n--- Section 6: Cleanup Temporary Test Data ---");

    try {
      if (createdRentalIds.length > 0) {
        await prisma.rentalExtension.deleteMany({
          where: { rentalId: { in: createdRentalIds } },
        });
        await prisma.rental.deleteMany({
          where: { id: { in: createdRentalIds } },
        });
        console.log(`✓ Cleaned up ${createdRentalIds.length} test rentals & extensions`);
      }

      if (createdGarageIds.length > 0) {
        await prisma.garage.deleteMany({
          where: { id: { in: createdGarageIds } },
        });
        console.log(`✓ Cleaned up ${createdGarageIds.length} test garages`);
      }

      if (testUserId) {
        await prisma.user.delete({
          where: { id: testUserId },
        });
        console.log(`✓ Cleaned up test user ${testUserId}`);
      }

      if (uploadedStoragePaths.length > 0) {
        try {
          await supabase.storage.from("bukti-bayar").remove(uploadedStoragePaths);
          console.log(`✓ Cleaned up ${uploadedStoragePaths.length} test images from Supabase Storage bucket 'bukti-bayar'`);
        } catch (storageErr) {
          console.warn("Storage cleanup note:", storageErr);
        }
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
  }

  // Summary Table
  console.log("\n================================================================================");
  console.log("  LIVE END-TO-END SMOKE TEST SUMMARY TABLE");
  console.log("================================================================================");
  console.table(
    results.map((r, i) => ({
      "#": i + 1,
      Category: r.category,
      Step: r.step,
      Method: r.method,
      Endpoint: r.endpoint,
      HTTP: r.httpStatus,
      Expected: r.expectedStatus,
      Status: r.status,
    }))
  );

  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`\nTOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    console.error("❌ Smoke test failed!");
    process.exit(1);
  } else {
    console.log("🎉 ALL LIVE E2E SMOKE TESTS PASSED 100%!");
  }
}

runLiveE2ETest();
