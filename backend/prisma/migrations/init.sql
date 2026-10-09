-- ========================================================
-- ELECTRA EV RENTAL - POSTGRESQL INITIAL DATABASE MIGRATION
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "BodyType" AS ENUM ('CITY_CAR', 'COMPACT_SUV', 'MPV');
CREATE TYPE "PortType" AS ENUM ('CCS2', 'GB_T', 'TYPE_2');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
CREATE TYPE "ServiceType" AS ENUM ('LEPAS_KUNCI', 'DENGAN_DRIVER');
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING_WHATSAPP', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- 1. Tabel Master Kendaraan (Vehicles)
CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "brand" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "body_type" "BodyType" NOT NULL,
    "license_plate" VARCHAR(20) UNIQUE NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Spesifikasi Teknis Khusus EV (Vehicle Specs)
CREATE TABLE IF NOT EXISTS "vehicle_specs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicle_id" UUID UNIQUE NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
    "battery_capacity_kwh" NUMERIC(5, 2) NOT NULL,
    "range_cltc_km" INT NOT NULL,
    "range_wltp_km" INT,
    "port_type" "PortType" NOT NULL,
    "max_ac_kw" NUMERIC(4, 1) NOT NULL DEFAULT 7.0,
    "max_dc_kw" NUMERIC(5, 1),
    "seating_capacity" INT NOT NULL,
    "portable_charger_included" BOOLEAN NOT NULL DEFAULT TRUE,
    "gbt_adapter_included" BOOLEAN NOT NULL DEFAULT FALSE,
    "charging_time_ac_hours" NUMERIC(4, 1) NOT NULL,
    "charging_time_dc_minutes" INT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Paket Tarif Rental (Rental Rates)
CREATE TABLE IF NOT EXISTS "rental_rates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
    "service_type" "ServiceType" NOT NULL,
    "daily_rate" DECIMAL(12, 2) NOT NULL,
    "deposit_amount" DECIMAL(12, 2) NOT NULL,
    "overtime_hourly_rate" DECIMAL(12, 2) NOT NULL,
    CONSTRAINT "unique_vehicle_service" UNIQUE ("vehicle_id", "service_type")
);

-- 4. Pelanggan (Customers)
CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "phone_whatsapp" VARCHAR(30) UNIQUE NOT NULL,
    "email" VARCHAR(100),
    "identity_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Data Reservasi (Inquiries)
CREATE TABLE IF NOT EXISTS "inquiries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "inquiry_code" VARCHAR(30) UNIQUE NOT NULL,
    "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id") ON DELETE RESTRICT,
    "service_type" "ServiceType" NOT NULL,
    "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "duration_days" INT NOT NULL,
    "pickup_location" VARCHAR(200) NOT NULL,
    "return_location" VARCHAR(200) NOT NULL,
    "customer_notes" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING_WHATSAPP',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Log SoC Baterai & Serah Terima (Battery Logs)
CREATE TABLE IF NOT EXISTS "battery_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "inquiry_id" UUID UNIQUE NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id") ON DELETE RESTRICT,
    "handover_soc_pct" INT NOT NULL CHECK ("handover_soc_pct" >= 0 AND "handover_soc_pct" <= 100),
    "handover_odometer_km" DECIMAL(9, 2) NOT NULL,
    "return_soc_pct" INT CHECK ("return_soc_pct" >= 0 AND "return_soc_pct" <= 100),
    "return_odometer_km" DECIMAL(9, 2),
    "recovery_fee_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    "officer_notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS "idx_vehicles_status_active" ON "vehicles"("status", "is_active");
CREATE INDEX IF NOT EXISTS "idx_inquiries_code" ON "inquiries"("inquiry_code");
CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers"("phone_whatsapp");
CREATE INDEX IF NOT EXISTS "idx_battery_logs_inquiry" ON "battery_logs"("inquiry_id");
