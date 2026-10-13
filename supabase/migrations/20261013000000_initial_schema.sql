-- Migration: 20261013000000_initial_schema.sql
-- Labour & Farm Operations Management System
-- Schema conforms to 05_DATABASE_DESIGN.md and 08_SECURITY_PRIVACY_AND_ACCESS.md

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

-- 1. farms table
create table public.farms (
  id uuid primary key default gen_random_uuid(),
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

create trigger tr_farms_updated_at
before update on public.farms
for each row execute function public.handle_updated_at();

-- 2. farm_memberships table
create table public.farm_memberships (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','payroll','supervisor','partner_viewer','tractor_operator')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

create trigger tr_farm_memberships_updated_at
before update on public.farm_memberships
for each row execute function public.handle_updated_at();

-- 3. labourers table
create table public.labourers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  labour_code text not null,
  full_name text not null,
  phone text null,
  work_category text null,
  start_date date not null default current_date,
  end_date date null,
  wage_basis text not null check (wage_basis in ('daily','hourly','piece_rate')),
  base_rate numeric(14,2) not null check (base_rate >= 0),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, labour_code)
);

create index idx_labourers_farm_active on public.labourers(farm_id, is_active);

-- 4. attendance_records table
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  labourer_id uuid not null references public.labourers(id) on delete restrict,
  work_date date not null,
  shift_code text not null default 'regular',
  status text not null check (status in ('present','half_day','absent','leave','holiday','other')),
  payable_units numeric(8,2) not null default 0 check (payable_units >= 0),
  hours_worked numeric(8,2) null check (hours_worked is null or hours_worked >= 0),
  piece_quantity numeric(12,3) null check (piece_quantity is null or piece_quantity >= 0),
  task_name text null,
  field_name text null,
  supervisor_user_id uuid null references auth.users(id) on delete set null,
  approval_status text not null default 'draft' check (approval_status in ('draft','submitted','approved','rejected')),
  correction_reason text null,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, labourer_id, work_date, shift_code)
);

create index idx_attendance_date on public.attendance_records(farm_id, work_date);
create index idx_attendance_labourer on public.attendance_records(farm_id, labourer_id, work_date);

-- 5. payroll_periods table
create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  period_name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft','review','approved','finalized','reopened','void')),
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  finalized_at timestamptz null,
  calculation_version text not null default 'v1.0',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- 6. payroll_lines table
create table public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  labourer_id uuid not null references public.labourers(id) on delete restrict,
  attendance_snapshot jsonb not null default '{}'::jsonb,
  wage_basis text not null check (wage_basis in ('daily','hourly','piece_rate')),
  rate_snapshot numeric(14,2) not null check (rate_snapshot >= 0),
  units numeric(12,3) not null default 0 check (units >= 0),
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  additions numeric(14,2) not null default 0 check (additions >= 0),
  other_deductions numeric(14,2) not null default 0 check (other_deductions >= 0),
  advance_recovery numeric(14,2) not null default 0 check (advance_recovery >= 0),
  net_payable numeric(14,2) not null check (net_payable >= 0),
  calculation_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, labourer_id)
);

-- 7. payroll_payments table
create table public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  payroll_line_id uuid not null references public.payroll_lines(id) on delete cascade,
  paid_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash','bank_transfer','upi','cheque')),
  reference text null,
  recorded_by uuid null references auth.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

-- 8. advances table
create table public.advances (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  labourer_id uuid not null references public.labourers(id) on delete restrict,
  issued_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  purpose text null,
  payment_method text not null default 'cash',
  payment_reference text null,
  status text not null default 'posted' check (status in ('posted','void')),
  issued_by uuid null references auth.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. advance_allocations table
create table public.advance_allocations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  advance_id uuid not null references public.advances(id) on delete cascade,
  payroll_line_id uuid null references public.payroll_lines(id) on delete set null,
  allocation_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  allocation_type text not null check (allocation_type in ('payroll_recovery','cash_repayment','adjustment')),
  recorded_by uuid null references auth.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

-- 10. machinery table
create table public.machinery (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  asset_code text not null,
  name text not null,
  asset_type text not null default 'tractor',
  ownership_type text not null check (ownership_type in ('owned','hired')),
  registration_reference text null,
  make text null,
  model text null,
  meter_type text not null check (meter_type in ('hour_meter','odometer','none')),
  initial_meter numeric(12,2) null default 0 check (initial_meter >= 0),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, asset_code)
);

-- 11. machinery_usage table
create table public.machinery_usage (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  machinery_id uuid not null references public.machinery(id) on delete restrict,
  work_date date not null default current_date,
  operator_name text null,
  operator_user_id uuid null references auth.users(id) on delete set null,
  field_name text null,
  task_name text not null,
  start_time timestamptz null,
  end_time timestamptz null,
  start_meter numeric(12,2) null check (start_meter is null or start_meter >= 0),
  end_meter numeric(12,2) null check (end_meter is null or end_meter >= 0),
  duration_minutes integer null check (duration_minutes is null or duration_minutes >= 0),
  work_quantity numeric(12,3) null,
  fuel_quantity numeric(12,3) null check (fuel_quantity is null or fuel_quantity >= 0),
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_meter is null or start_meter is null or end_meter >= start_meter)
);

create index idx_machinery_usage_date on public.machinery_usage(farm_id, work_date);

-- 12. machinery_expenses table
create table public.machinery_expenses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  machinery_id uuid null references public.machinery(id) on delete set null,
  usage_id uuid null references public.machinery_usage(id) on delete set null,
  expense_date date not null default current_date,
  category text not null check (category in ('fuel','repair','maintenance','servicing','parts','lubricant','hired_service','other')),
  amount numeric(14,2) not null check (amount >= 0),
  quantity numeric(12,3) null,
  unit text null,
  vendor text null,
  payment_method text not null default 'cash',
  payment_reference text null,
  receipt_path text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 13. audit_logs table (append-only)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  occurred_at timestamptz not null default now(),
  reason text null,
  request_id text null,
  changes jsonb null
);

create index idx_audit_logs_occurred on public.audit_logs(farm_id, occurred_at desc);

-- 14. sync_jobs table (outbox for Google Sheets)
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('insert','update','delete')),
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz null,
  last_error text null,
  last_attempt_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

-- 15. export_jobs table
create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  report_type text not null,
  period_start date null,
  period_end date null,
  financial_year_label text null,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed')),
  storage_path text null,
  sha256_checksum text null,
  row_counts jsonb null,
  totals jsonb null,
  requested_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  error_message text null
);

-- 16. annual_close_manifests table
create table public.annual_close_manifests (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  financial_year_label text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'locked' check (status in ('preview','processing','verified','locked','reopened')),
  pdf_export_job_id uuid null references public.export_jobs(id) on delete set null,
  sheets_verified_at timestamptz null,
  record_counts jsonb not null default '{}'::jsonb,
  financial_totals jsonb not null default '{}'::jsonb,
  backup_reference text null,
  closed_by uuid null references auth.users(id) on delete set null,
  closed_at timestamptz not null default now(),
  notes text null,
  created_at timestamptz not null default now(),
  unique (farm_id, financial_year_label)
);

-- Enable RLS on all tables
alter table public.farms enable row level security;
alter table public.farm_memberships enable row level security;
alter table public.labourers enable row level security;
alter table public.attendance_records enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_lines enable row level security;
alter table public.payroll_payments enable row level security;
alter table public.advances enable row level security;
alter table public.advance_allocations enable row level security;
alter table public.machinery enable row level security;
alter table public.machinery_usage enable row level security;
alter table public.machinery_expenses enable row level security;
alter table public.audit_logs enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.export_jobs enable row level security;
alter table public.annual_close_manifests enable row level security;

-- Helper security function: check active membership in farm
create or replace function public.is_farm_member(target_farm_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.farm_memberships
    where farm_id = target_farm_id
      and user_id = auth.uid()
      and is_active = true
  );
end;
$$ language plpgsql security definer;

-- Helper security function: get member role
create or replace function public.get_farm_role(target_farm_id uuid)
returns text as $$
declare
  user_role text;
begin
  select role into user_role from public.farm_memberships
  where farm_id = target_farm_id
    and user_id = auth.uid()
    and is_active = true;
  return user_role;
end;
$$ language plpgsql security definer;

-- Standard RLS Policies:
-- Read for all active members
create policy "Members can view farm data" on public.farms
  for select using (public.is_farm_member(id));

create policy "Members can view labourers" on public.labourers
  for select using (public.is_farm_member(farm_id));

create policy "Admins/Owners can modify labourers" on public.labourers
  for all using (public.get_farm_role(farm_id) in ('owner', 'admin'));

create policy "Members can view attendance" on public.attendance_records
  for select using (public.is_farm_member(farm_id));

create policy "Supervisors/Admins/Owners can record attendance" on public.attendance_records
  for insert with check (public.get_farm_role(farm_id) in ('owner', 'admin', 'supervisor'));

create policy "Supervisors/Admins/Owners can update draft attendance" on public.attendance_records
  for update using (public.get_farm_role(farm_id) in ('owner', 'admin', 'supervisor'));

-- Partner Viewer is restricted from all mutating actions
-- Partner Viewer can only SELECT
