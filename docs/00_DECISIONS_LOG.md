# 00 — Phase 0 Business Decisions Log

**Date:** 2026-10-13  
**Status:** Approved & Adopted for Implementation  
**Target Financial Year:** FY 2026–27 (1 April 2026 – 31 March 2027)  
**Currency & Timezone:** INR (₹), Asia/Kolkata  

---

## 1. Wage Basis & Rates
- **Primary Basis for MVP:** **Daily Rate (₹/day)** is the primary active operational basis.
- **Extended Support:** The database schema and calculation service fully support `hourly` (₹/hr) and `piece_rate` (₹/unit).
- **Rate Changes:** Wage rates set in the labourer profile apply to future attendance entries. Historical payroll records store immutable rate snapshots.

## 2. Attendance & Shift Policy
- **Attendance Units:**
  - Full Day (`present`): 1.0 unit (100% of daily base rate).
  - Half Day (`half_day`): 0.5 unit (50% of daily base rate).
  - Absent (`absent`): 0.0 units.
  - Leave (`leave`): 0.0 units (unpaid leave by default).
  - Holiday (`holiday`): 1.0 unit (paid public/farm holiday).
- **Shift Codes:** Defaults to `regular`. Additional shifts supported: `morning`, `evening`.
- **Duplicate Prevention:** Unique constraint on `(farm_id, labourer_id, work_date, shift_code)`.
- **Correction Window:** Supervisors can edit same-day entries. Once submitted or approved, edits require an explicit correction reason stored in the audit log. Once a payroll period is finalized, attendance is locked.

## 3. Payroll Cadence & Payments
- **Default Cadence:** Monthly payroll period (1st to last day of calendar month). Custom date ranges (weekly / fortnightly) can also be created.
- **Calculation Formula:**
  - `Gross Wage = (Payable Units × Base Rate) + Additions - Other Deductions`
  - `Advance Recovery = min(Outstanding Advance, Max Allowed Deduction, Gross Wage)`
  - `Net Payable = Gross Wage - Advance Recovery`
- **Immutability:** Finalizing a payroll period locks the calculation snapshot, rate snapshot, and attendance records.
- **Payments:** Supports partial and full disbursements with method (`Cash`, `UPI`, `Bank Transfer`, `Cheque`) and reference numbers.

## 4. Advance Issuance & Recovery
- **Issuance:** Recorded with amount, date, payment method, and purpose.
- **Recovery:** Automatically allocated during payroll finalization, or manual cash repayments.
- **Strict Constraint:** Cumulative recovery is validated to never exceed total advance issued (`Outstanding Balance = Issued - Recovered >= 0`).

## 5. Machinery & Tractor Operations
- **Machinery Types:** Supports both Owned machinery and Hired/Rented machinery.
- **Meter Types:**
  - `hour_meter` (Hours & Minutes) — typical for tractors and harvesters.
  - `odometer` (Kilometers) — for transport vehicles.
  - `none` — for implements and stationary motors.
- **Usage Validation:** Enforces `end_meter >= start_meter` and `end_time > start_time`. Warns on overlapping usage logs for the same machine.
- **Operating Expenses:** Categorized into `Fuel`, `Repair`, `Maintenance`, `Servicing`, `Lubricant`, `Hired Service`, and `Other`. Tracks vendor, receipt reference, and notes.

## 6. User Roles & Permission Boundaries
- **Owner / Super Admin:** Full rights; cannot be deactivated if last remaining owner; FY close authority.
- **Admin / Manager:** Full operational management (labour, attendance, machinery, expenses).
- **Payroll / Accountant:** Advance issuance, payroll preview, approval, and payment recording.
- **Supervisor:** Field attendance entry and tractor usage logging.
- **Partner / Viewer:** Read-only access to dashboards, reports, and machinery summaries. Strictly blocked from mutating operational data.
- **Tractor Operator:** Restricted entry for usage logs and fuel expenses.

## 7. Financial Year Close & Archiving
- **Boundaries:** 1 April to 31 March (e.g. FY 2026–27 is 2026-04-01 to 2027-03-31).
- **Close Requirements:**
  1. Pre-close validation (no unapproved attendance, draft payrolls, or unresolved balances).
  2. Full reconciliation of wages, payments, advances, and expenses.
  3. Generation of comprehensive Annual PDF Report with SHA-256 checksum.
  4. Google Sheets export verification.
  5. Permanent locking of closed FY records in Supabase.
- **Strict Archival Rule:** **No hard deletion.** Historical records are preserved permanently in Supabase for statutory, audit, and tax compliance.

## 8. Google Sheets Mirror
- **Architecture:** Outbox pattern (`sync_jobs`) with asynchronous worker.
- **Identity:** UUID-based row upsert (`record_id`).
- **Direction:** Supabase $\rightarrow$ Google Sheets (one-way read/reporting mirror only).

## 9. Unified Access Model & Security Authentication Gate
- **Single Operational View:** Based on user request, stripped away fragmented multi-view toggles and separate persona switching. All authorized farm personnel share the same comprehensive access to daily farm routine operations (Attendance, Advances, Payday slips, Machinery/Tractor logs).
- **Security Login Gate (`LoginPage.tsx`):** Unauthenticated sessions are blocked from the application. Only users with valid credentials (`admin` / `farmpassword`, `kisan2026`, etc.) can access farm records.
- **Mobile-First Tactile UX:** Fully responsive with $\ge 48\text{px}$ touch targets, sticky save actions, celebratory feedback (confetti), and clear 1-tap sign-out.

