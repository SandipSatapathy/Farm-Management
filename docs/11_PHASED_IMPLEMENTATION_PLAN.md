# 11 — Phased Development Plan

A realistic solo/small-team estimate is approximately 6–10 weeks for a well-tested MVP, depending on availability and the final wage rules. Estimates exclude major offline mode, biometric hardware, GPS tracking or statutory payroll integrations.

## Phase 0 — Discovery and decisions (2–4 days)
**Deliverables**
- Confirm wage basis, half-day/overtime policy, payroll cadence, shifts and correction rules.
- Confirm tractor hour-meter/odometer behavior and hired tractor requirements.
- Confirm partner access and whether partners may download payroll PDFs.
- Confirm Sheets ownership, tabs and sharing.
- Agree on retention policy and annual close sign-off.

**Exit criteria:** signed-off business rules and sample calculations.

## Phase 1 — Project foundation and security (3–5 days)
- Create repo, React/TypeScript/Vite app and Netlify configuration.
- Create Supabase project, migrations, Auth and membership schema.
- Implement RLS, route guards, shared layout, error handling and audit primitives.
- Set up CI and deployment preview.

**Exit criteria:** role test users; cross-farm and partner mutation tests pass.

## Phase 2 — Master data and user management (3–5 days)
- Farm settings, labourer CRUD, machinery CRUD.
- Invite/deactivate users and role assignment.
- Search, filters, pagination and audit history.

**Exit criteria:** master data works on mobile/desktop; historical records preserved on deactivation.

## Phase 3 — Attendance (4–6 days)
- Daily crew entry, bulk attendance, shifts and status/unit rules.
- Approval/correction workflow.
- Attendance register and dashboard metrics.

**Exit criteria:** duplicates blocked; corrections reasoned and audited.

## Phase 4 — Advances and payroll (6–9 days)
- Advance issuance and balance ledger.
- Payroll preview and wage calculation engine.
- Payroll approval/finalization, payments, partial payments and recoveries.
- Immutable finalized payroll and adjustment flow.

**Exit criteria:** calculation test vectors and reconciliation tests pass.

## Phase 5 — Tractor usage and expenses (4–6 days)
- Usage logs, meter/time validation and overlap warnings.
- Fuel/repair/maintenance expenses and receipt references.
- Tractor-wise and category-wise reports.

**Exit criteria:** time and meter deltas reconcile; expenses aggregate correctly.

## Phase 6 — Reports and PDF (4–6 days)
- Dashboard summaries and filtered reports.
- PDF generation and private storage.
- CSV export where useful.
- Report metadata, checksum and signed download.

**Exit criteria:** PDF totals match the database for test datasets; access tests pass.

## Phase 7 — Google Sheets sync (3–5 days)
- Service account setup and stable sheet schema.
- Outbox jobs, UUID upsert, retries and sync health screen.
- Reconciliation by counts/totals.

**Exit criteria:** duplicate retry and API failure tests pass.

## Phase 8 — Financial-year close and archive (3–5 days)
- FY selector, validation, reconciliation and close manifest.
- Annual PDF pack and Sheets verification.
- Lock FY, owner-only reopen with reason.
- Retention/deletion remains disabled unless a separate policy is approved.

**Exit criteria:** close is idempotent, verified and does not delete records.

## Phase 9 — Hardening and launch (4–7 days)
- End-to-end and security tests.
- Restore drill and operational documentation.
- Mobile usability pass, accessibility and performance.
- Partner onboarding and owner training.

**Exit criteria:** all release gates in Testing Strategy pass.

## Recommended milestone releases
- **M1:** authentication, roles, labourers and attendance.
- **M2:** advances, payroll and payments.
- **M3:** tractor usage, expenses and reports.
- **M4:** PDF, Sheets sync and annual close.
- **M5:** security hardening and production launch.

## Change control
Any new feature should include user story, acceptance criteria, data model impact, permissions, migration impact, test cases and documentation updates before implementation.
