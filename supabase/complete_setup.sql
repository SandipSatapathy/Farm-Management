-- ==============================================================================
-- KisanOps Farm Management Database - Complete Setup Script
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

-- 1. Farms Table
create table if not exists public.farms (
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

-- 2. Farm Memberships Table
create table if not exists public.farm_memberships (
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

-- 3. Labourers / Workers Table
create table if not exists public.labourers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  labour_code text not null,
  full_name text not null,
  phone text null,
  work_category text null,
  start_date date not null default current_date,
  end_date date null,
  wage_basis text not null default 'daily' check (wage_basis in ('daily','hourly','piece_rate')),
  base_rate numeric(14,2) not null check (base_rate >= 0),
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, labour_code)
);

create index if not exists idx_labourers_farm_active on public.labourers(farm_id, is_active);

-- 4. Attendance Records Table
create table if not exists public.attendance_records (
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
  approval_status text not null default 'approved' check (approval_status in ('draft','submitted','approved','rejected')),
  correction_reason text null,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, labourer_id, work_date, shift_code)
);

create index if not exists idx_attendance_date on public.attendance_records(farm_id, work_date);
create index if not exists idx_attendance_labourer on public.attendance_records(farm_id, labourer_id, work_date);

-- 5. Advances Table (with Given By)
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  labourer_id uuid not null references public.labourers(id) on delete restrict,
  issued_at timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  purpose text null,
  given_by text null,
  payment_method text not null default 'cash',
  payment_reference text null,
  status text not null default 'posted' check (status in ('posted','void')),
  issued_by uuid null references auth.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advances_labourer on public.advances(farm_id, labourer_id, status);

-- 6. Advance Allocations / Repayments Table
create table if not exists public.advance_allocations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  advance_id uuid not null references public.advances(id) on delete cascade,
  payroll_line_id uuid null,
  allocation_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  allocation_type text not null check (allocation_type in ('payroll_recovery','cash_repayment','adjustment')),
  recorded_by uuid null references auth.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

-- 7. Hired Tractor Rentals Table
create table if not exists public.tractor_rentals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
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

-- 8. Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload_snapshot jsonb null,
  reason text null,
  occurred_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.farms enable row level security;
alter table public.labourers enable row level security;
alter table public.attendance_records enable row level security;
alter table public.advances enable row level security;
alter table public.advance_allocations enable row level security;
alter table public.tractor_rentals enable row level security;
alter table public.audit_logs enable row level security;

-- Open policies for authenticated and anon client access within the farm
create policy "Allow all operations for farm members on farms" on public.farms for all using (true) with check (true);
create policy "Allow all operations on labourers" on public.labourers for all using (true) with check (true);
create policy "Allow all operations on attendance" on public.attendance_records for all using (true) with check (true);
create policy "Allow all operations on advances" on public.advances for all using (true) with check (true);
create policy "Allow all operations on advance_allocations" on public.advance_allocations for all using (true) with check (true);
create policy "Allow all operations on tractor_rentals" on public.tractor_rentals for all using (true) with check (true);
create policy "Allow all operations on audit_logs" on public.audit_logs for all using (true) with check (true);

-- Insert Default Farm if none exists
insert into public.farms (id, name, currency_code, timezone)
values ('11111111-1111-1111-1111-111111111111', 'My Farm Operations', 'INR', 'Asia/Kolkata')
on conflict (id) do nothing;
