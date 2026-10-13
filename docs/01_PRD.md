# 01 — Product Requirements Document (PRD)

## 1. Product overview
The Labour & Farm Operations Management System centralizes labour records, attendance, payroll, wage advances, tractor/machinery usage, and operating expenses. It provides controlled live visibility for business partners and generates period and financial-year reports.

## 2. Problem statement
Paper registers, informal messages, and separate spreadsheets make it difficult to verify who worked, calculate wages consistently, reconcile advances, understand tractor operating costs, and share current information with partners. The application should create a consistent, auditable record without requiring a dedicated server.

## 3. Goals
- Record labour attendance quickly on a phone or desktop.
- Calculate wages transparently from configurable wage rules.
- Track advances, deductions, settlements and outstanding balances.
- Record tractor meter readings, hours, work performed, fuel and repair expenses.
- Give partners timely, permission-controlled visibility.
- Generate PDF reports by date range, labourer, tractor and financial year.
- Mirror selected data to Google Sheets for familiar reporting.
- Preserve historical records and make financial-year close repeatable and verifiable.

## 4. Non-goals for MVP
- Full accounting/ERP, bank reconciliation or statutory payroll filing.
- GPS tracking or automatic tractor telemetry.
- Biometric attendance, facial recognition or geofencing.
- Native Android/iOS apps.
- Guaranteed offline data entry.
- Automatic permanent deletion immediately after PDF generation.
- Multi-tenant SaaS subscriptions unless explicitly added later.

## 5. User roles
| Role | Typical capabilities |
|---|---|
| Owner / Super Admin | Full configuration, users, records, approvals, reports, year-end close, exports |
| Admin / Manager | Manage labour, attendance, tractor logs and operational reports as granted |
| Payroll / Accountant | Review attendance, calculate and approve payroll, manage advances and payroll reports |
| Supervisor | Record attendance and tractor activity; edit own entries within configured window |
| Partner / Viewer | Read-only dashboards and reports for authorized farm/business data |
| Tractor Operator (optional) | Create assigned tractor usage logs and fuel entries; no payroll or user administration |

Use least privilege. Roles are starting templates; sensitive permissions should be separately configurable.

## 6. Core modules
1. Authentication and user management
2. Farm/business settings and financial-year configuration
3. Labourer directory and wage settings
4. Attendance and corrections
5. Payroll periods, wage calculation, approval and payment tracking
6. Advance issuance, recovery and balance tracking
7. Tractor/machinery register
8. Tractor usage/time logs
9. Fuel, repair, maintenance and other expense ledger
10. Dashboard and reports
11. PDF export and annual close/archiving
12. Google Sheets synchronization
13. Audit log and system settings

## 7. Success metrics
- A daily attendance session can be recorded in under two minutes for a typical crew.
- Payroll totals reconcile to attendance, wage rules, advances and recorded payments.
- Every change to attendance, payroll, advances, and expenses has actor/time audit metadata.
- Partner users cannot modify data or access unauthorized farms.
- Annual PDF totals match the frozen financial-year ledger and its report manifest.
- Google Sheets sync failures are visible and retryable without duplicating rows.

## 8. Product assumptions
- One farm/business is used in the first release, with schema support for a `farm_id` to allow future expansion.
- INR is the default currency; timezone defaults to Asia/Kolkata and can be configured.
- India financial year is 1 April–31 March.
- Internet access is required for writes in the initial release.
- Google Sheets is a mirror/reporting destination. Supabase remains authoritative.
- Partners need near-live information; target refresh is within 1 minute while the app is open, subject to network and provider limits.

## 9. MVP acceptance criteria
- User can sign in and sign out securely.
- Owner can invite/deactivate users and assign roles.
- Labourers can be created, edited, deactivated, and searched.
- Attendance prevents duplicate active entries for the same labourer/date/shift unless explicitly configured.
- Payroll previews show gross wages, deductions, advances recovered, net payable, and calculation details.
- Advances show issued, recovered, and outstanding totals.
- Tractor logs capture start/end meter or time, duration, field/task and operator.
- Expenses support category, amount, date, payee/vendor, receipt reference and notes.
- Partner dashboard is read-only and respects RLS.
- PDF reports are generated for date ranges and financial year.
- Google Sheets sync status and last successful sync are visible.
- Annual close cannot complete unless reconciliation, PDF generation, and export verification pass.
