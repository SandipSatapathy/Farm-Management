-- =============================================================================
-- FARMLOG - SUPABASE PRODUCTION CLOUD DATABASE SCHEMA
-- Instructions: Copy and Paste this entire script into your Supabase Dashboard:
-- SQL Editor -> New Query -> Run
-- =============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. FARMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    currency_code VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    financial_year_start_month INTEGER DEFAULT 4,
    financial_year_start_day INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Farm Entity
INSERT INTO farms (id, name, currency_code, timezone, settings)
VALUES ('farm-main-001', 'My Farm Operations', 'INR', 'Asia/Kolkata', '{"overtime_enabled": false, "default_payroll_cadence": "monthly"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. APP USERS & AUTHENTICATION TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator')),
    view_access VARCHAR(30) NOT NULL DEFAULT 'simple' CHECK (view_access IN ('simple', 'advanced')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Seed Default Production Users
INSERT INTO app_users (id, farm_id, username, password_hash, full_name, email, role, view_access, is_active)
VALUES 
  ('usr-supervisor', 'farm-main-001', 'supervisor', 'Supervisor@2026', 'Field Supervisor', 'supervisor@farm.local', 'supervisor', 'simple', TRUE),
  ('usr-admin', 'farm-main-001', 'admin', 'Admin@2026', 'Farm Administrator', 'admin@farm.local', 'owner', 'advanced', TRUE)
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    view_access = EXCLUDED.view_access;

-- -----------------------------------------------------------------------------
-- 3. FARM MEMBERSHIPS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farm_memberships (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'payroll', 'supervisor', 'partner_viewer', 'tractor_operator')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. LABOURERS (WORKER DIRECTORY) TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labourers (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    labour_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    work_category VARCHAR(100) DEFAULT 'General Labour',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    wage_basis VARCHAR(30) DEFAULT 'daily' CHECK (wage_basis IN ('daily', 'hourly', 'piece_rate')),
    base_rate NUMERIC(10, 2) NOT NULL DEFAULT 400.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_farm_labour_code UNIQUE (farm_id, labour_code)
);

CREATE INDEX IF NOT EXISTS idx_labourers_farm_id ON labourers(farm_id);
CREATE INDEX IF NOT EXISTS idx_labourers_active ON labourers(is_active);

-- -----------------------------------------------------------------------------
-- 5. ATTENDANCE RECORDS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    labourer_id VARCHAR(64) NOT NULL REFERENCES labourers(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift_code VARCHAR(30) DEFAULT 'regular',
    status VARCHAR(30) NOT NULL CHECK (status IN ('present', 'half_day', 'absent', 'leave', 'holiday', 'other')),
    payable_units NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    hours_worked NUMERIC(5, 2),
    piece_quantity NUMERIC(10, 2),
    task_name VARCHAR(255),
    field_name VARCHAR(255),
    supervisor_user_id VARCHAR(64),
    approval_status VARCHAR(30) DEFAULT 'approved' CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
    correction_reason TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_farm_labourer_date_shift UNIQUE (farm_id, labourer_id, work_date, shift_code)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_labourer ON attendance(labourer_id);

-- -----------------------------------------------------------------------------
-- 6. CASH ADVANCES (ADVANCE LEDGER) TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advances (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    labourer_id VARCHAR(64) NOT NULL REFERENCES labourers(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    purpose TEXT DEFAULT 'Cash advance',
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque')),
    payment_reference VARCHAR(100),
    status VARCHAR(30) DEFAULT 'posted' CHECK (status IN ('posted', 'void')),
    issued_by VARCHAR(255) DEFAULT 'Owner/Manager',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advances_labourer ON advances(labourer_id);
CREATE INDEX IF NOT EXISTS idx_advances_issued_at ON advances(issued_at);

-- -----------------------------------------------------------------------------
-- 7. ADVANCE ALLOCATIONS / RECOVERIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advance_allocations (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    advance_id VARCHAR(64) NOT NULL REFERENCES advances(id) ON DELETE CASCADE,
    payroll_line_id VARCHAR(64),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN ('payroll_recovery', 'cash_repayment', 'adjustment')),
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. HIRED TRACTOR & MACHINERY RENTAL LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tractor_rentals (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    machinery_id VARCHAR(64),
    tractor_name VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    hours_worked NUMERIC(6, 2) NOT NULL CHECK (hours_worked >= 0),
    hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    advance_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rest_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    fuel_provided_litres NUMERIC(6, 2) DEFAULT 0,
    task_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tractor_rentals_date ON tractor_rentals(work_date);
CREATE INDEX IF NOT EXISTS idx_tractor_rentals_vendor ON tractor_rentals(vendor_name);

-- -----------------------------------------------------------------------------
-- 9. MONTHLY PAYROLL PERIODS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_periods (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'finalized', 'reopened', 'void')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    calculation_version VARCHAR(30) DEFAULT 'v1',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. PAYROLL LINES (WORKER PAYSLIP) TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_lines (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    payroll_period_id VARCHAR(64) NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    labourer_id VARCHAR(64) NOT NULL REFERENCES labourers(id) ON DELETE CASCADE,
    attendance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    wage_basis VARCHAR(30) DEFAULT 'daily',
    rate_snapshot NUMERIC(10, 2) NOT NULL,
    units NUMERIC(6, 2) NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL,
    additions NUMERIC(10, 2) DEFAULT 0,
    other_deductions NUMERIC(10, 2) DEFAULT 0,
    advance_recovery NUMERIC(10, 2) DEFAULT 0,
    net_payable NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    calculation_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. PAYROLL PAYMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_payments (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    payroll_line_id VARCHAR(64) NOT NULL REFERENCES payroll_lines(id) ON DELETE CASCADE,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) DEFAULT 'cash' CHECK (method IN ('cash', 'bank_transfer', 'upi', 'cheque')),
    reference VARCHAR(100),
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. AUDIT TRAIL LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    actor_user_id VARCHAR(64),
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    request_id VARCHAR(100),
    changes JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_farm ON audit_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred ON audit_logs(occurred_at);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Ensures read and write permissions for the mobile app and web portal
-- -----------------------------------------------------------------------------
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tractor_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow anon read-write farms" ON farms;
    DROP POLICY IF EXISTS "Allow anon read-write app_users" ON app_users;
    DROP POLICY IF EXISTS "Allow anon read-write farm_memberships" ON farm_memberships;
    DROP POLICY IF EXISTS "Allow anon read-write labourers" ON labourers;
    DROP POLICY IF EXISTS "Allow anon read-write attendance" ON attendance;
    DROP POLICY IF EXISTS "Allow anon read-write advances" ON advances;
    DROP POLICY IF EXISTS "Allow anon read-write advance_allocations" ON advance_allocations;
    DROP POLICY IF EXISTS "Allow anon read-write tractor_rentals" ON tractor_rentals;
    DROP POLICY IF EXISTS "Allow anon read-write payroll_periods" ON payroll_periods;
    DROP POLICY IF EXISTS "Allow anon read-write payroll_lines" ON payroll_lines;
    DROP POLICY IF EXISTS "Allow anon read-write payroll_payments" ON payroll_payments;
    DROP POLICY IF EXISTS "Allow anon read-write audit_logs" ON audit_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create Open RLS Policies for Farm Operations
CREATE POLICY "Allow anon read-write farms" ON farms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write farm_memberships" ON farm_memberships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write labourers" ON labourers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write advances" ON advances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write advance_allocations" ON advance_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write tractor_rentals" ON tractor_rentals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write payroll_periods" ON payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write payroll_lines" ON payroll_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write payroll_payments" ON payroll_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for live updates across devices
ALTER PUBLICATION supabase_realtime ADD TABLE labourers, attendance, advances, tractor_rentals, payroll_periods, payroll_lines, app_users;
