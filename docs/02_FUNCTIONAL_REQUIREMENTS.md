# 02 — Functional Requirements and Acceptance Criteria

Priority notation: **P0** release blocker, **P1** important, **P2** later enhancement.

## FR-001 Authentication and sessions (P0)
- Sign in using Supabase Auth email/password; password reset must be supported.
- Admin can invite users; public self-registration is disabled by default.
- Inactive users lose access promptly.
- Acceptance: unauthenticated requests cannot read or mutate protected data.

## FR-002 User management and roles (P0)
- Store display name, email, role, active state, farm access and last activity where available.
- Owner can invite, deactivate, and change roles.
- Prevent the last active owner from being deactivated or demoted.
- Partner role is read-only by default.
- Acceptance: permission tests prove a partner cannot insert/update/delete operational records.

## FR-003 Farm and settings (P0)
- Configure farm name, address/region, currency (default INR), timezone (default Asia/Kolkata), financial-year start (default 1 April), wage units, attendance units and payroll period.
- Store configuration changes in audit history.
- Acceptance: reports use the configured timezone and FY boundaries.

## FR-004 Labourer directory (P0)
- Fields: labour code, full name, phone (optional), start date, work category, wage basis, base rate, active status, notes (optional).
- Do not require Aadhaar or other sensitive identity documents for MVP.
- Search/filter by name, code, category and active state.
- Preserve historical transactions after a labourer is deactivated.
- Acceptance: deactivation prevents new attendance but does not erase historical payroll.

## FR-005 Attendance entry (P0)
- Record labourer, work date, shift (optional), status, attendance unit/quantity, hours (if applicable), task/field, supervisor, notes and timestamps.
- Status options: Present, Half day, Absent, Leave, Holiday, Other (configurable).
- Prevent duplicates by labourer + date + shift, unless multiple shifts are enabled.
- Bulk entry for a date/crew and edit with reason.
- Approval/correction window is configurable; closed payroll periods require authorized reopening.
- Acceptance: validation prevents invalid negative hours and duplicate active entries.

## FR-006 Wage calculation rules (P0)
- Support daily, hourly and piece-rate wage bases in schema; MVP may launch with the business's chosen basis first.
- Daily: payable units × daily rate. Hourly: approved hours × hourly rate. Piece-rate: approved quantity × piece rate.
- Rules for half-day, overtime, holidays and rounding must be configured and documented before payroll use.
- Do not silently infer overtime or statutory deductions.
- Acceptance: each payroll line stores the input quantities, rate, formula/rule version and calculated amount.

## FR-007 Payroll periods and approval (P0)
- Create draft payroll period with start/end dates.
- Generate payroll lines from approved attendance and wage settings.
- Show gross wages, additions, deductions, advance recovery, other authorized deductions, net payable, paid amount and balance.
- Require review/approval before marking a period finalized.
- Finalized periods are immutable except through a controlled reversal/adjustment workflow.
- Record payment date, method, reference and partial payments.
- Acceptance: payroll totals equal the sum of their lines and payment allocations; repeated calculation does not duplicate lines.

## FR-008 Advances (P0)
- Record labourer, issue date, amount, payment method/reference, purpose, issuer, status and notes.
- Recover advances through explicit payroll allocations or manual repayment records.
- Prevent recovery exceeding the outstanding balance.
- Show total issued, recovered and outstanding by labourer and period.
- Acceptance: advance balance = issued amount − posted recoveries − repayments/refunds, with no negative balance absent an authorized correction.

## FR-009 Tractor/machinery register (P0)
- Fields: asset code, name, type, registration/reference (optional), ownership (owned/hired), make/model, meter type (hour meter/odometer/none), initial meter, active state, notes.
- Preserve history after deactivation.
- Acceptance: unique asset code per farm and valid meter configuration.

## FR-010 Tractor usage logs (P0)
- Record tractor, date, operator, field/location, task, start/end time, start/end meter, computed duration, work quantity (optional), fuel quantity (optional), notes and recorder.
- Validate end time after start time and end meter ≥ start meter.
- Flag overlapping logs for the same tractor and suspicious meter regressions.
- Acceptance: duration and meter deltas are calculated consistently and can be audited.

## FR-011 Tractor expenses (P0)
- Categories: fuel, repair, maintenance, hired service, parts, lubricant, transport, other.
- Fields: tractor, date, category, amount, quantity/unit (optional), vendor/payee, payment method/reference, receipt attachment/reference, notes.
- Allow expenses not tied to a specific tractor only if categorized as general farm expense in a later phase.
- Acceptance: reports group expenses by tractor, category and date range; amounts cannot be negative.

## FR-012 Dashboard (P0)
- Show current-period attendance, estimated/approved wages, outstanding advances, payroll unpaid balance, tractor hours, expense totals and recent activity.
- Filters: date range, financial year, tractor and labour category where relevant.
- Partners see only authorized summary and detail views.
- Acceptance: figures link to underlying records and use a consistent date range.

## FR-013 Reports (P0)
- Labour attendance register, labour-wise wage statement, payroll register, advance ledger, outstanding advance statement, tractor usage log, tractor expense register, expense-by-category report, partner summary and annual financial-year report.
- Support date filters, grouping and CSV export where practical.
- Acceptance: report totals match database queries for the same filters.

## FR-014 PDF export (P0)
- Generate well-formatted PDFs with farm name, report title, period, generated timestamp, timezone, page numbers, totals and filter summary.
- For annual close include attendance, payroll, advances, tractor usage, tractor expenses, reconciliation summary and record counts.
- Store generated PDF in private object storage (recommended Supabase Storage) and store checksum, generation time, FY, and creator.
- Acceptance: generated PDF is downloadable only by authorized users and its manifest is retained.

## FR-015 Google Sheets mirror (P1)
- Sync selected operational tables to a spreadsheet owned by a controlled Google account.
- Prefer append/update by stable record UUID; do not use row number as identity.
- Record sync status, attempts, last error and last success.
- Retry transient failures with backoff; provide a manual retry.
- Acceptance: retrying sync does not create duplicate records and data differences are reportable.

## FR-016 Financial-year close and archive (P0)
- Identify FY records by business date, not creation timestamp.
- Preview counts and totals; validate unapproved attendance/payroll and outstanding advances.
- Generate annual PDF, reconcile report totals, export required Sheets tabs, verify sync, and create a database backup/export manifest.
- Lock closed FY from normal edits. Corrections require owner-authorized reopening or adjustment workflow.
- Default behavior is **archive and retain**, not hard-delete.
- Any later deletion must be a separate, explicit retention job requiring configured legal retention period, verified backup, successful PDF and Sheets verification, owner approval and a dry-run summary.
- Acceptance: no record is permanently deleted by the normal annual-close workflow.

## FR-017 Audit trail (P0)
- Log actor, timestamp, action, entity/table, record UUID, changed fields (redacted as needed), reason, request correlation ID and source.
- Audit events should be append-only for application users.
- Acceptance: create/update/delete/approve/close/export actions are auditable.

## FR-018 Notifications (P2)
- Optional reminders for unrecorded attendance, pending payroll approval, failed sync, and year-end close.
- Email delivery provider and consent/configuration to be selected.

## FR-019 Attachments (P1)
- Optional receipts and documents stored in private Supabase Storage.
- Use signed, short-lived download URLs and validate type/size.
- Do not put service keys or public links in documents.

## FR-020 Search, filtering and pagination (P0)
- Server-side pagination for large tables, validated sort fields and filters.
- Acceptance: lists remain responsive as data grows; queries do not fetch the entire database to the browser.
