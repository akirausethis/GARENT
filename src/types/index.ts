/**
 * @file index.ts
 * @description Core domain type definitions and DTO contracts for GARENT (Garage Rental).
 * Compliant with LSP Pemrogram UK 3, UK 4, and UK 7.
 */

export type UserRole = "admin" | "penyewa";

export type UserStatus = "pending" | "approved" | "rejected";

export type GarageType = "sepeda" | "mobil" | "mobil_listrik";

export type GarageStatus = "available" | "used";

export type VehicleType = "sepeda" | "sepeda_motor" | "mobil" | "mobil_listrik";

export type RentalType = "harian" | "bulanan";

export type RentalStatus = "active" | "extended" | "completed";

export interface User {
  id: string;
  nik: string | null;
  full_name: string;
  phone: string | null;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Garage {
  id: string;
  code: string;
  type: GarageType;
  daily_price: number;
  kwh_price: number;
  status: GarageStatus;
  created_at: string;
}

export interface Rental {
  id: string;
  user_id: string;
  garage_id: string;
  vehicle_type: VehicleType;
  license_plate: string | null;
  vehicle_brand: string;
  max_battery_kwh: number | null;
  current_battery_kwh: number | null;
  rental_type: RentalType;
  duration_days: number;
  start_date: string;
  end_date: string;
  rental_cost: number;
  electricity_cost: number;
  total_cost: number;
  payment_proof_url: string;
  status: RentalStatus;
  created_at: string;
}

export interface RentalExtension {
  id: string;
  rental_id: string;
  previous_end_date: string;
  new_end_date: string;
  additional_days: number;
  additional_cost: number;
  payment_proof_url: string;
  extended_by: string | null;
  created_at: string;
}

export interface RentalWithDetails extends Rental {
  user?: Pick<User, "id" | "nik" | "full_name" | "phone" | "email" | "status">;
  garage?: Pick<Garage, "id" | "code" | "type" | "daily_price" | "kwh_price" | "status">;
  extensions?: RentalExtension[];
}

export interface RegisterInput {
  nik: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface BulkCreateGarageInput {
  type: GarageType;
  quantity: number;
  dailyPrice: number;
  kwhPrice?: number;
}

export interface CreateRentalInput {
  userId: string;
  garageId: string;
  vehicleType: VehicleType;
  licensePlate?: string | null;
  vehicleBrand: string;
  maxBatteryKwh?: number | null;
  currentBatteryKwh?: number | null;
  rentalType: RentalType;
  durationDays?: number;
  startDate?: string;
  paymentProofUrl?: string;
}

export interface ExtendRentalInput {
  rentalId: string;
  adminId: string;
  newEndDate: string;
  paymentProofUrl: string;
}

export interface CostBreakdown {
  rentalCost: number;
  electricityCost: number;
  totalCost: number;
}

export interface ReportFilterInput {
  year?: number;
  month?: number;
  day?: number;
  exactDate?: string;
  garageType?: GarageType;
  userId?: string;
}
