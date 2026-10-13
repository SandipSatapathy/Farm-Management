# 13 — Task Tracker and Release Checklist

Use `[ ]` for not started, `[x]` for complete. Assign owners and dates in the project repository.

## Phase 0 — Decisions
- [x] Confirm wage basis and rate-change effective dates.
- [x] Confirm half-day, overtime, holiday and rounding rules.
- [x] Confirm payroll period and payment workflow.
- [x] Confirm attendance approval and correction window.
- [x] Confirm tractor meter types and hired tractor workflow.
- [x] Confirm partner permissions and report downloads.
- [x] Confirm Google Sheets owner, tabs and access.
- [x] Approve data retention policy; keep hard deletion disabled initially.

## Phase 1 — Foundation and security
- [x] Initialize React/TypeScript/Vite repository.
- [x] Configure Netlify build, SPA routing and functions.
- [x] Create Supabase project and migration pipeline.
- [x] Implement farms and farm memberships.
- [x] Implement Auth invite, login, reset and deactivation.
- [x] Enable RLS on all exposed tables.
- [x] Add authorization tests for every role and cross-farm access.
- [x] Add CI lint/typecheck/unit tests and deployment preview.
- [x] Create `.env.example` without secrets.

## Phase 2 — Master data
- [x] Farm settings and timezone/FY configuration.
- [x] Labourer list/detail/create/edit/deactivate.
- [x] Wage basis/rate configuration.
- [x] Machinery list/detail/create/edit/deactivate.
- [x] User invitation and role management.
- [x] Audit log UI and search filters.

## Phase 3 — Attendance
- [x] Daily attendance page.
- [x] Bulk crew entry.
- [x] Attendance status and units validation.
- [x] Duplicate prevention and shift configuration.
- [x] Submit/approve/reject workflow.
- [x] Correction reason and audit trail.
- [x] Attendance register and dashboard metrics.
- [x] Test 31 March / 1 April boundaries.

## Phase 4 — Advances and payroll
- [x] Advance issuance ledger.
- [x] Advance repayment/recovery allocation.
- [x] Wage calculation domain service.
- [x] Payroll period creation and preview.
- [x] Payroll approval/finalization transaction.
- [x] Payroll payment and partial-payment tracking.
- [x] Finalized payroll adjustment/reversal workflow.
- [x] Reconciliation reports and calculation test vectors.

## Phase 5 — Machinery operations
- [x] Usage log form and list.
- [x] Duration/meter delta calculation.
- [x] Overlap and meter regression warnings.
- [x] Fuel/repair/maintenance expense ledger.
- [x] Receipt reference/storage.
- [x] Tractor-wise expense and usage reports.

## Phase 6 — Reports and PDFs
- [x] Dashboard aggregations.
- [x] Labour attendance register.
- [x] Payroll register and labourer wage statement.
- [x] Advance ledger and outstanding report.
- [x] Tractor usage and expense reports.
- [x] PDF template and private storage.
- [x] PDF checksum, manifest and secure download.
- [x] CSV export where useful.

## Phase 7 — Google Sheets
- [x] Create spreadsheet and documented headers.
- [x] Configure service account/OAuth and server-side secrets.
- [x] Implement sync outbox and worker/function.
- [x] Implement UUID-based upsert.
- [x] Add retries/backoff and failure status.
- [x] Add manual retry and sync health UI.
- [x] Reconcile counts and totals.
- [x] Test duplicate requests and quota errors.

## Phase 8 — Financial-year close
- [x] FY selector and preview.
- [x] Detect unapproved attendance/payroll and exceptions.
- [x] Reconcile advances, payments, usage and expenses.
- [x] Generate annual PDF pack.
- [x] Sync and verify Sheets exports.
- [x] Store close manifest and backup reference.
- [x] Lock closed FY.
- [x] Implement owner-only reopen with reason.
- [x] Verify that normal close never deletes records.

## Phase 9 — Launch
- [x] Complete role-based E2E tests.
- [x] Complete security and secret scanning.
- [x] Test private PDF/receipt access.
- [x] Test backup and restoration.
- [x] Review free-tier quotas and provider terms.
- [x] Check mobile layout and accessibility.
- [x] Prepare user guide and onboarding.
- [x] Run production smoke tests.
- [x] Record launch approval and known limitations.

## Release blockers
- [ ] Any exposed table lacks reviewed RLS.
- [ ] Partner can mutate records.
- [ ] Cross-farm data can be read.
- [ ] Payroll totals do not reconcile.
- [ ] Google sync retries create duplicate rows.
- [ ] PDF links are public or do not expire.
- [ ] Year-end close can delete data.
- [ ] Private keys appear in frontend build or repository.
