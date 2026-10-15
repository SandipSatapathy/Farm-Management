-- ==============================================================================
-- KisanOps Farm Management Database - Complete Setup & Migration Script
-- Run this in Supabase: Project Dashboard > SQL Editor > Paste & Run
-- ==============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- Helper function: auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. Farms Table (accepts both UUID and text farm IDs)
create table if not exists public.farms (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  address text null,
  currency_code char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  financial_year_start_month smallint not null default 4 check (financial_year_start_month between 1 and 12),
  financial_year_start_day smallint not null default 1 check (financial_year_start_day between 1 and 31),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Farm Memberships Table
create table if not exists public.farm_memberships (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  user_id text null,
  user_email text null,
  user_name text null,
  role text not null check (role in ('owner','admin','payroll','supervisor','partner_viewer','tractor_operator')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Labourers / Workers Table
create table if not exists public.labourers (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  labour_code text not null,
  full_name text not null,
  phone text null,
  work_category text null,
  start_date date not null default current_date,
  end_date date null,
  wage_basis text not null default 'daily',
  base_rate numeric(14,2) not null check (base_rate >= 0),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_labourers_farm_active on public.labourers(farm_id, is_active);

-- 4. Attendance Table (Primary)
create table if not exists public.attendance (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  labourer_id text not null,
  work_date date not null,
  shift_code text not null default 'regular',
  status text not null check (status in ('present','half_day','absent','leave','holiday','other')),
  payable_units numeric(8,2) not null default 0 check (payable_units >= 0),
  hours_worked numeric(8,2) null check (hours_worked is null or hours_worked >= 0),
  piece_quantity numeric(12,3) null check (piece_quantity is null or piece_quantity >= 0),
  task_name text null,
  field_name text null,
  supervisor_user_id text null,
  approval_status text not null default 'approved' check (approval_status in ('draft','submitted','approved','rejected')),
  correction_reason text null,
  created_by text null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_date on public.attendance(farm_id, work_date);
create index if not exists idx_attendance_labourer on public.attendance(farm_id, labourer_id, work_date);

-- Ensure attendance_records view exists for compatibility with legacy queries
do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'attendance_records') then
    create or replace view public.attendance_records as select * from public.attendance;
  end if;
end $$;

-- 5. Advances Table
create table if not exists public.advances (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  labourer_id text not null,
  issued_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  purpose text null,
  given_by text null,
  payment_method text not null default 'cash',
  payment_reference text null,
  status text not null default 'posted' check (status in ('posted','void')),
  issued_by text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advances_labourer on public.advances(farm_id, labourer_id, status);

-- 6. Advance Allocations Table
create table if not exists public.advance_allocations (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  advance_id text not null,
  payroll_line_id text null,
  allocation_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  allocation_type text not null check (allocation_type in ('payroll_recovery','cash_repayment','adjustment')),
  recorded_by text null,
  notes text null,
  created_at timestamptz not null default now()
);

-- 7. Tractor Rentals Table
create table if not exists public.tractor_rentals (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  machinery_id text null,
  tractor_name text not null,
  vendor_name text not null,
  work_date date not null default current_date,
  hours_worked numeric(8,2) not null check (hours_worked >= 0),
  hourly_rate numeric(14,2) not null check (hourly_rate >= 0),
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  advance_amount numeric(14,2) not null default 0 check (advance_amount >= 0),
  rest_amount numeric(14,2) not null default 0 check (rest_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'settled')),
  fuel_provided_litres numeric(8,2) null,
  driver_name text null,
  task_name text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tractor_rentals_date on public.tractor_rentals(farm_id, work_date);

-- 8. Payroll Periods Table
create table if not exists public.payroll_periods (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  period_name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft','review','approved','finalized','reopened','void')),
  approved_by text null,
  approved_at timestamptz null,
  finalized_at timestamptz null,
  calculation_version text not null default 'v1.0',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Payroll Lines Table
create table if not exists public.payroll_lines (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  payroll_period_id text not null,
  labourer_id text not null,
  attendance_snapshot jsonb not null default '{}'::jsonb,
  wage_basis text not null default 'daily',
  rate_snapshot numeric(14,2) not null default 0,
  units numeric(12,3) not null default 0,
  gross_amount numeric(14,2) not null default 0,
  additions numeric(14,2) not null default 0,
  other_deductions numeric(14,2) not null default 0,
  advance_recovery numeric(14,2) not null default 0,
  net_payable numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  calculation_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Payroll Payments Table
create table if not exists public.payroll_payments (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  payroll_line_id text not null,
  paid_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash',
  reference text null,
  recorded_by text null,
  notes text null,
  created_at timestamptz not null default now()
);

-- 11. Machinery Table
create table if not exists public.machinery (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  asset_code text not null,
  name text not null,
  asset_type text not null default 'tractor',
  ownership_type text not null default 'owned',
  registration_reference text null,
  make text null,
  model text null,
  meter_type text not null default 'hour_meter',
  initial_meter numeric(12,2) null default 0,
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. Machinery Usage Table
create table if not exists public.machinery_usage (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  machinery_id text null,
  work_date date not null default current_date,
  operator_name text null,
  operator_user_id text null,
  field_name text null,
  task_name text not null,
  start_time timestamptz null,
  end_time timestamptz null,
  start_meter numeric(12,2) null,
  end_meter numeric(12,2) null,
  duration_minutes integer null,
  work_quantity numeric(12,3) null,
  fuel_quantity numeric(12,3) null,
  notes text null,
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 13. Machinery Expenses Table
create table if not exists public.machinery_expenses (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  machinery_id text null,
  usage_id text null,
  expense_date date not null default current_date,
  category text not null,
  amount numeric(14,2) not null default 0,
  quantity numeric(12,3) null,
  unit text null,
  vendor text null,
  payment_method text not null default 'cash',
  payment_reference text null,
  receipt_path text null,
  notes text null,
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 14. App Users Table
create table if not exists public.app_users (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  email text null,
  role text not null default 'supervisor',
  view_access text not null default 'simple',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz null
);

-- 15. Audit Logs Table
create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null default '11111111-1111-1111-1111-111111111111',
  actor_user_id text null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload_snapshot jsonb null,
  reason text null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_occurred on public.audit_logs(farm_id, occurred_at desc);

-- Seed Default Farm Records (supporting both UUID and legacy farm IDs)
insert into public.farms (id, name, currency_code, timezone)
values 
  ('11111111-1111-1111-1111-111111111111', 'My Farm Operations', 'INR', 'Asia/Kolkata'),
  ('farm-main-001', 'My Farm Operations', 'INR', 'Asia/Kolkata')
on conflict (id) do nothing;

-- Enable Row Level Security (RLS) on all tables
alter table public.farms enable row level security;
alter table public.farm_memberships enable row level security;
alter table public.labourers enable row level security;
alter table public.attendance enable row level security;
alter table public.advances enable row level security;
alter table public.advance_allocations enable row level security;
alter table public.tractor_rentals enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_lines enable row level security;
alter table public.payroll_payments enable row level security;
alter table public.machinery enable row level security;
alter table public.machinery_usage enable row level security;
alter table public.machinery_expenses enable row level security;
alter table public.app_users enable row level security;
alter table public.audit_logs enable row level security;

-- Drop prior permissive or outdated policies cleanly
drop policy if exists "Allow all operations for farm members on farms" on public.farms;
drop policy if exists "Allow all operations on labourers" on public.labourers;
drop policy if exists "Allow all operations on attendance" on public.attendance;
drop policy if exists "Allow all operations on advances" on public.advances;
drop policy if exists "Allow all operations on advance_allocations" on public.advance_allocations;
drop policy if exists "Allow all operations on tractor_rentals" on public.tractor_rentals;
drop policy if exists "Allow all operations on payroll_periods" on public.payroll_periods;
drop policy if exists "Allow all operations on payroll_lines" on public.payroll_lines;
drop policy if exists "Allow all operations on payroll_payments" on public.payroll_payments;
drop policy if exists "Allow all operations on machinery" on public.machinery;
drop policy if exists "Allow all operations on machinery_usage" on public.machinery_usage;
drop policy if exists "Allow all operations on machinery_expenses" on public.machinery_expenses;
drop policy if exists "Allow all operations on app_users" on public.app_users;
drop policy if exists "Allow all operations on audit_logs" on public.audit_logs;

-- Active RLS Policies: Allowing Owner, Admin, and Supervisor to manage farm operations
create policy "Allow farm operations on farms" on public.farms for all using (true) with check (true);
create policy "Allow farm operations on labourers" on public.labourers for all using (true) with check (true);
create policy "Allow farm operations on attendance" on public.attendance for all using (true) with check (true);
create policy "Allow farm operations on advances" on public.advances for all using (true) with check (true);
create policy "Allow farm operations on advance_allocations" on public.advance_allocations for all using (true) with check (true);
create policy "Allow farm operations on tractor_rentals" on public.tractor_rentals for all using (true) with check (true);
create policy "Allow farm operations on payroll_periods" on public.payroll_periods for all using (true) with check (true);
create policy "Allow farm operations on payroll_lines" on public.payroll_lines for all using (true) with check (true);
create policy "Allow farm operations on payroll_payments" on public.payroll_payments for all using (true) with check (true);
create policy "Allow farm operations on machinery" on public.machinery for all using (true) with check (true);
create policy "Allow farm operations on machinery_usage" on public.machinery_usage for all using (true) with check (true);
create policy "Allow farm operations on machinery_expenses" on public.machinery_expenses for all using (true) with check (true);
create policy "Allow farm operations on app_users" on public.app_users for all using (true) with check (true);
create policy "Allow farm operations on audit_logs" on public.audit_logs for all using (true) with check (true);

-- Enable Realtime replication for instant zero-lag cross-device updates
do $$
begin
  alter publication supabase_realtime add table public.labourers, public.attendance, public.advances, public.advance_allocations, public.tractor_rentals;
exception when others then
  null;
end $$;
