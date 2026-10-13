# 05 — Database Design

Use PostgreSQL in Supabase. Names below are proposed; implement with migrations and indexes. Every business table should include `id uuid primary key default gen_random_uuid()`, `farm_id uuid not null`, `created_at timestamptz not null default now()`, `updated_at timestamptz`, and actor fields where appropriate.

## 1. Entity relationship overview

```text
farms 1---* farm_memberships *---1 auth.users
farms 1---* labourers 1---* attendance_records
attendance_records *---1 payroll_lines *---1 payroll_periods
labourers 1---* advances 1---* advance_allocations *---1 payroll_lines
farms 1---* machinery 1---* machinery_usage
machinery 1---* machinery_expenses
farms 1---* audit_logs
farms 1---* export_jobs / annual_close_manifests
```

## 2. Tables

### `farms`
- `id uuid PK`
- `name text not null`
- `address text null`
- `currency_code char(3) not null default 'INR'`
- `timezone text not null default 'Asia/Kolkata'`
- `financial_year_start_month smallint not null default 4`
- `financial_year_start_day smallint not null default 1`
- `settings jsonb not null default '{}'`
- `created_at`, `updated_at`

### `farm_memberships`
- `id uuid PK`, `farm_id uuid FK`, `user_id uuid FK auth.users`
- `role text check in ('owner','admin','payroll','supervisor','partner_viewer','tractor_operator')`
- `permissions jsonb not null default '{}'`
- `is_active boolean not null default true`
- `created_at`, `updated_at`
- Unique (`farm_id`, `user_id`)

### `labourers`
- `id uuid PK`, `farm_id uuid FK`
- `labour_code text not null`, `full_name text not null`, `phone text null`
- `work_category text null`, `start_date date`, `end_date date null`
- `wage_basis text check in ('daily','hourly','piece_rate')`
- `base_rate numeric(14,2) not null check (base_rate >= 0)`
- `is_active boolean not null default true`, `notes text null`
- Unique (`farm_id`, `labour_code`)

### `attendance_records`
- `id uuid PK`, `farm_id uuid FK`, `labourer_id uuid FK`
- `work_date date not null`, `shift_code text not null default 'default'`
- `status text check in ('present','half_day','absent','leave','holiday','other')`
- `payable_units numeric(8,2) not null default 0 check (payable_units >= 0)`
- `hours_worked numeric(8,2) null check (hours_worked >= 0)`
- `piece_quantity numeric(12,3) null check (piece_quantity >= 0)`
- `task_name text null`, `field_name text null`, `supervisor_user_id uuid null`
- `approval_status text check in ('draft','submitted','approved','rejected')`
- `correction_reason text null`, `created_by uuid`, `updated_by uuid`
- Unique (`farm_id`, `labourer_id`, `work_date`, `shift_code`) for single-entry-per-shift model.
- Index (`farm_id`, `work_date`), (`farm_id`, `labourer_id`, `work_date`).

### `payroll_periods`
- `id uuid PK`, `farm_id uuid FK`, `period_name text`
- `start_date date not null`, `end_date date not null`, `status text check in ('draft','review','approved','finalized','reopened','void')`
- `approved_by uuid null`, `approved_at timestamptz null`, `finalized_at timestamptz null`
- `calculation_version text not null`, `notes text null`
- Check `end_date >= start_date`; prevent overlapping active periods if business rules require it.

### `payroll_lines`
- `id uuid PK`, `farm_id uuid FK`, `payroll_period_id uuid FK`, `labourer_id uuid FK`
- `attendance_snapshot jsonb not null`
- `wage_basis text not null`, `rate_snapshot numeric(14,2) not null`
- `units numeric(12,3) not null default 0`
- `gross_amount numeric(14,2) not null`
- `additions numeric(14,2) not null default 0`
- `other_deductions numeric(14,2) not null default 0`
- `advance_recovery numeric(14,2) not null default 0`
- `net_payable numeric(14,2) not null`
- `calculation_details jsonb not null`
- Unique (`payroll_period_id`, `labourer_id`) unless multiple job/rate lines are required.
- Check money fields are nonnegative except where explicit adjustment design allows credits.

### `payroll_payments`
- `id uuid PK`, `farm_id uuid FK`, `payroll_line_id uuid FK`
- `paid_at timestamptz not null`, `amount numeric(14,2) not null check (amount > 0)`
- `method text`, `reference text`, `recorded_by uuid`, `notes text`
- Payment total cannot exceed net payable unless an authorized overpayment/adjustment flow exists.

### `advances`
- `id uuid PK`, `farm_id uuid FK`, `labourer_id uuid FK`
- `issued_at timestamptz not null`, `amount numeric(14,2) not null check (amount > 0)`
- `purpose text`, `payment_method text`, `payment_reference text`
- `status text check in ('posted','void')`, `issued_by uuid`, `notes text`

### `advance_allocations`
- `id uuid PK`, `farm_id uuid FK`, `advance_id uuid FK`, `payroll_line_id uuid null FK`
- `allocation_date date not null`, `amount numeric(14,2) not null check (amount > 0)`
- `allocation_type text check in ('payroll_recovery','cash_repayment','adjustment')`
- `recorded_by uuid`, `notes text`
- Enforce cumulative posted allocations ≤ advance amount using a transaction/trigger or database function.

### `machinery`
- `id uuid PK`, `farm_id uuid FK`, `asset_code text not null`, `name text not null`
- `asset_type text not null default 'tractor'`, `ownership_type text check in ('owned','hired')`
- `registration_reference text null`, `make text null`, `model text null`
- `meter_type text check in ('hour_meter','odometer','none')`
- `initial_meter numeric(12,2) null check (initial_meter >= 0)`
- `is_active boolean not null default true`, `notes text`
- Unique (`farm_id`, `asset_code`)

### `machinery_usage`
- `id uuid PK`, `farm_id uuid FK`, `machinery_id uuid FK`
- `work_date date not null`, `operator_name text null`, `operator_user_id uuid null`
- `field_name text`, `task_name text not null`
- `start_time timestamptz null`, `end_time timestamptz null`
- `start_meter numeric(12,2) null`, `end_meter numeric(12,2) null`
- `duration_minutes integer null check (duration_minutes >= 0)`
- `work_quantity numeric(12,3) null`, `fuel_quantity numeric(12,3) null`
- `notes text`, `created_by uuid`
- Index (`farm_id`, `work_date`), (`machinery_id`, `work_date`).

### `machinery_expenses`
- `id uuid PK`, `farm_id uuid FK`, `machinery_id uuid null FK`, `usage_id uuid null FK`
- `expense_date date not null`, `category text not null`
- `amount numeric(14,2) not null check (amount >= 0)`
- `quantity numeric(12,3) null`, `unit text null`, `vendor text null`
- `payment_method text`, `payment_reference text`, `receipt_path text null`, `notes text`
- `created_by uuid`

### `audit_logs`
- `id uuid PK`, `farm_id uuid FK`, `actor_user_id uuid null`
- `action text not null`, `entity_type text not null`, `entity_id uuid null`
- `occurred_at timestamptz not null default now()`
- `reason text null`, `request_id text null`, `changes jsonb null`
- Access is read-only for normal application roles; prevent app users from updating/deleting audit rows.

### `sync_jobs`
- `id uuid PK`, `farm_id uuid FK`, `entity_type text not null`, `entity_id uuid not null`
- `operation text not null`, `status text check in ('pending','processing','succeeded','failed')`
- `attempt_count integer not null default 0`, `next_attempt_at timestamptz`
- `last_error text null`, `last_attempt_at timestamptz`, `completed_at timestamptz`
- Unique (`entity_type`, `entity_id`, `operation`) or use a deduplication key suitable for repeated updates.

### `export_jobs`
- `id uuid PK`, `farm_id uuid FK`, `report_type text not null`
- `period_start date`, `period_end date`, `financial_year_label text`
- `status text check in ('queued','processing','succeeded','failed')`
- `storage_path text null`, `sha256_checksum text null`, `row_counts jsonb`, `totals jsonb`
- `requested_by uuid`, `created_at timestamptz`, `completed_at timestamptz`, `error_message text`

### `annual_close_manifests`
- `id uuid PK`, `farm_id uuid FK`, `financial_year_label text not null`
- `start_date date not null`, `end_date date not null`
- `status text check in ('preview','processing','verified','locked','failed')`
- `pdf_export_job_id uuid null FK`, `sheets_verified_at timestamptz null`
- `record_counts jsonb`, `financial_totals jsonb`, `backup_reference text null`
- `closed_by uuid`, `closed_at timestamptz`, `notes text`
- Unique (`farm_id`, `financial_year_label`) for one official close manifest.

## 3. Financial year boundaries
For a selected year `Y`:
- Start date: `Y-04-01`
- End date: `(Y+1)-03-31`
- Label: `FY Y–(Y+1)` (for example, FY 2026–27).
Use half-open ranges internally where timestamps are involved: start inclusive, next 1 April exclusive. Store the business date on transactions.

## 4. Database and RLS requirements
- Enable RLS on every exposed table.
- Policies must require active `farm_memberships` for the row's `farm_id`.
- `partner_viewer`: SELECT only on approved/allowed data; no INSERT/UPDATE/DELETE.
- `supervisor`: attendance and usage writes within permitted farm scope; no payroll finalization.
- `payroll`: payroll/advance operations only within granted scope.
- `owner/admin`: full access subject to protected workflows and last-owner safeguard.
- Prefer security-definer database functions only where necessary; fix search_path, validate membership/role inside function, and minimize grants.
- Test unauthorized cross-farm reads and writes explicitly.
