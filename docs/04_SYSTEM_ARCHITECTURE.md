# 04 — System Architecture and Data Flow

## 1. Logical architecture

```text
User browser / mobile browser
        |
        | HTTPS
        v
Netlify static site (React + TypeScript + Vite)
        |                         \
        | Supabase Auth + RLS      \ HTTPS requests for privileged workflows
        v                           v
Supabase Postgres/Auth/Storage <--- Netlify Node.js Functions
        |                                  |
        |                                  +--> Google Sheets API
        |                                  +--> PDF generation / private storage
        +--> reporting queries / realtime subscriptions
```

### Responsibilities
- **React client:** forms, validation for usability, navigation, dashboards, role-aware display.
- **Supabase Auth:** identity and session lifecycle.
- **Supabase Postgres + RLS:** authoritative operational data and access control.
- **Netlify Functions:** actions requiring secrets or elevated orchestration, such as Google Sheets sync, annual close, signed export generation and privileged administrative workflows.
- **Supabase Storage:** private PDFs and receipts.
- **Google Sheets:** read/reporting mirror, not a second source of truth.

## 2. Request patterns
1. Ordinary reads: client uses Supabase client; RLS enforces membership and permissions.
2. Ordinary writes: client may write directly only where safe RLS policies and database constraints enforce the rule. Prefer server-side functions for payroll finalization, payment posting, annual close and integrations.
3. Privileged operation: client sends authenticated request to Netlify Function; function validates JWT, validates payload, checks role/membership, executes transactional database operation, writes audit event, and returns a safe result.
4. Realtime: subscribe to authorized table changes or refresh dashboard queries on a short interval. Do not treat browser state as authoritative.
5. Google sync: write transaction and a sync/outbox job in one database transaction; a retryable function processes pending jobs and upserts rows using UUID.
6. PDF: request report; server creates a consistent snapshot, renders PDF, uploads to private storage, stores report metadata/checksum, and returns an authorized download route or short-lived signed URL.

## 3. Data flows

### Attendance
Supervisor selects date and crew → server/client validates required fields → insert attendance under RLS → audit metadata is written → dashboards refresh → Sheets sync job is queued.

### Payroll
Accountant creates period → system loads approved attendance and applicable wage-rate snapshots → calculation preview → authorized reviewer approves → atomic finalization stores payroll lines and calculation version → payments/advance recoveries are posted as separate ledger allocations → audit and Sheets sync jobs are queued.

### Tractor usage and expenses
Operator selects tractor → enters task, field, start/end times and meter readings → validation checks overlap and meter progression → usage log saved → expense entries linked to tractor and/or usage → reports aggregate duration, meter delta and cost.

### Financial-year close
Owner selects FY → pre-close validation and totals → generate annual report snapshot → PDF stored and checksum calculated → export required Sheets tabs and verify row counts/totals → store close manifest → lock FY → retain source data. Deletion is not part of close.

## 4. Suggested code layout

```text
src/
  app/                 # router, providers, app shell
  components/          # reusable UI
  features/
    auth/
    dashboard/
    labourers/
    attendance/
    payroll/
    advances/
    tractors/
    expenses/
    reports/
    settings/
    year-end/
  lib/                 # Supabase client, date/money utilities
  types/
  styles/
netlify/
  functions/
    payroll-preview.ts
    payroll-finalize.ts
    export-report.ts
    sheets-sync.ts
    year-end-preview.ts
    year-end-close.ts
supabase/
  migrations/
  tests/
  seed.sql
```

## 5. Architecture rules
- No secret or privileged key in frontend code.
- No persistent state in Netlify function memory.
- Use transactions or database functions for multi-step financial operations.
- Use idempotency keys for payroll posting, payments, exports and sync jobs.
- Validate tenant/farm scope on every privileged operation.
- Store audit records with the same transaction as the business action where possible.
- Keep date handling explicit: store business date separately from UTC timestamps.
