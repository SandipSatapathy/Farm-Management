# 06 — UI/UX Design Specification

## 1. Design direction
- Product feel: clean, practical farm operations dashboard; professional rather than decorative.
- Responsive-first, designed for one-handed phone entry in fields.
- Default theme: light, high contrast, large touch targets; optional dark theme later.
- Use status text plus icons/colors; never rely on color alone.
- Forms should save quickly, clearly display validation and confirm irreversible operations.
- Currency shown as INR (₹) by default; use locale-aware number/date formatting and explicit FY labels.

## 2. Navigation / information architecture
Desktop sidebar:
1. Dashboard
2. Labourers
3. Attendance
4. Payroll
5. Advances
6. Tractors & Machinery
7. Usage Logs
8. Expenses
9. Reports & PDF
10. Financial Year Close
11. Users & Roles (owner/admin only)
12. Settings
13. Audit Log (owner/admin only)

Mobile: bottom navigation for Dashboard, Attendance, Labourers, More; remaining sections under a menu.

## 3. Global shell
- Top bar: farm/business selector (future multi-farm), selected financial year/date range, sync health indicator, user menu.
- Sidebar collapses on small screens.
- Main content: page title, primary action, filters, KPI row, table/list, empty state.
- Global states: loading skeleton, no data, permission denied, offline/network error, save success, save failure.
- Unsaved form warning for navigation where practical.

## 4. Page specifications

### 4.1 Sign-in / password reset
- Email and password; show/hide password; forgot password; loading/error states.
- No public sign-up by default.
- Password reset uses Supabase Auth redirect allow-list.

### 4.2 Dashboard
KPI cards:
- Present today / expected labourers
- Wage estimate for selected period
- Payroll unpaid balance
- Outstanding advances
- Tractor operating hours
- Tractor expenses for selected period
Below: attendance trend, expense category breakdown, recent activity, pending approvals, Sheets sync status.
Filters: Today / 7 days / This month / Financial year / custom date range.
Partner role sees read-only cards and reports only.

### 4.3 Labourer list and detail
List columns: Code, Name, Category, Wage basis/rate, Active, Recent attendance, Outstanding advance, actions.
Actions: Add labourer, edit, view ledger, deactivate.
Detail tabs: Profile, Attendance, Payroll, Advances, Audit/history.
Avoid showing sensitive fields that are not required.

### 4.4 Attendance
- Date selector prominent; crew/day mode.
- Mobile layout: labourer row/card with Present / Half day / Absent / Leave controls, hours/units input only when relevant.
- Desktop table supports bulk status setting and keyboard navigation.
- Clearly distinguish Draft, Submitted, Approved, Rejected.
- Correction modal requires a reason after approval or payroll closure.
- Show duplicate and invalid-time warnings inline.

### 4.5 Payroll
- Period selector and Create payroll preview action.
- Preview table: labourer, wage basis, units/hours, rate snapshot, gross, additions, deductions, advance recovery, net payable, paid, balance.
- Summary: gross, recoveries, deductions, net payable, paid and outstanding.
- Approval flow: Draft → Review → Approved → Finalized.
- Finalize confirmation summarizes record count and totals. Finalized payroll is not directly editable.
- Payment entry supports partial payments and method/reference.

### 4.6 Advances
- Ledger table: date, labourer, issued, recovered, outstanding, issuer, reference.
- Issue advance form with amount, date, method, purpose.
- Recovery form shows current outstanding and prevents over-recovery.
- Detail view lists each recovery allocation.

### 4.7 Tractors and machinery
- Asset cards/table: asset code, name, owned/hired, meter type, latest reading, current status.
- Detail tabs: Overview, Usage, Expenses, Maintenance/history.
- Meter history should show previous reading and next reading to detect regressions.

### 4.8 Usage logs
- Fast-entry form: tractor, date, operator, field, task, start/end time, meter readings, fuel quantity, notes.
- Calculate duration and meter delta visibly.
- Warn on overlapping times, end-before-start and meter regression.
- Permit draft saving only if clearly marked; reports must distinguish drafts from approved logs if approval is enabled.

### 4.9 Expenses
- Category, tractor, date, amount, vendor, payment method, reference, receipt and notes.
- Summary cards: total, fuel, repairs, maintenance, other.
- Filter by tractor/category/date.
- Receipt preview must use authorized signed URL.

### 4.10 Reports and PDF
- Report selector, date/FY filters, grouping and preview.
- Show data timestamp, selected filters, totals and record count before export.
- Export PDF and CSV actions.
- PDF list shows report name, period, creator, generated time, status and download action.

### 4.11 Financial-year close
Wizard steps:
1. Select FY
2. Pre-close validation
3. Reconcile attendance/payroll/advances/tractor logs/expenses
4. Generate PDF pack
5. Sync and verify Google Sheets
6. Record backup/export manifest
7. Lock FY and show close certificate
- Display blocking issues and exact counts/totals.
- No hard-delete control on the normal close screen.
- If a separate retention purge is ever implemented, it must be in a protected admin area with policy, backup verification, dry-run report, explicit typed confirmation and second approval.

### 4.12 User management
- Invite user by email, select role and farm scope.
- Table: name/email, role, active state, invitation status, last activity.
- Warn before removing owner/admin rights; enforce last-owner safeguard.

### 4.13 Settings
- Farm profile, timezone, currency, FY start, wage rules, attendance units, payroll cadence, Google Sheets connection status and export settings.
- Hide secret values; show connection status and test connection actions.

## 5. Reusable components
- `PageHeader`, `DateRangeFilter`, `FinancialYearSelector`, `KpiCard`, `DataTable`, `MobileRecordCard`, `StatusBadge`, `MoneyText`, `ConfirmDialog`, `EmptyState`, `FormField`, `AuditTimeline`, `SyncStatusIndicator`, `ReportPreview`, `PermissionGate`.
- Forms use schema validation and consistent server-error mapping.
- Table pagination and sorting happen server-side for larger datasets.

## 6. Visual tokens (starting point)
- Font: system UI / Inter-like sans-serif fallback.
- Spacing scale: 4, 8, 12, 16, 24, 32 px.
- Radius: 8–12 px for cards and controls.
- Touch target: aim for at least 44 × 44 CSS px.
- Use neutral surfaces, dark text, one primary green/blue accent, amber for warning, red for destructive/error states.
- Charts must include labels/legends and accessible summaries.

## 7. Responsive breakpoints
- Mobile: < 640 px; cards and single-column forms.
- Tablet: 640–1024 px; compact navigation and two-column forms.
- Desktop: > 1024 px; sidebar and dense tables.
- Verify at 360 px wide and at common desktop widths.

## 8. Interaction rules
- Never silently discard unsaved data.
- Confirm payroll finalization, FY locking, user deactivation and any retention purge.
- Use optimistic UI only for reversible low-risk actions; use server confirmation for money movement and close operations.
- Display who made a correction and why.
- All date ranges show explicit local dates, not ambiguous relative wording alone.
