# Labour & Farm Operations Management System
**Documentation package version:** 1.0  
**Target stack:** React + TypeScript + Node.js serverless functions + Supabase + Netlify + Google Sheets  
**Primary users:** Owner/Admin, Partners, Supervisor, Accountant/Payroll Operator, Tractor Operator (optional restricted role)

## Purpose
A standalone, mobile-friendly application to record labour attendance, wages/payroll, advances, user access, and tractor/machinery usage and expenses. Owners and partners can view up-to-date information according to their permissions. Supabase is the system of record; Google Sheets is a reporting/export mirror.

## Documents in this package
1. `01_PRD.md` — product requirements and scope
2. `02_FUNCTIONAL_REQUIREMENTS.md` — detailed functional requirements and acceptance criteria
3. `03_TECHNICAL_REQUIREMENTS.md` — stack, constraints, quality requirements
4. `04_SYSTEM_ARCHITECTURE.md` — deployment, components, data flows
5. `05_DATABASE_DESIGN.md` — relational schema and key constraints
6. `06_UI_UX_DESIGN.md` — page map, layouts, interaction and responsive design
7. `07_API_AND_INTEGRATIONS.md` — API contracts and Google Sheets/PDF integration
8. `08_SECURITY_PRIVACY_AND_ACCESS.md` — roles, security, audit and data retention
9. `09_TESTING_STRATEGY.md` — test plan and acceptance strategy
10. `10_DEPLOYMENT_AND_OPERATIONS.md` — Netlify/Supabase setup and operational runbook
11. `11_PHASED_IMPLEMENTATION_PLAN.md` — phased build plan and milestones
12. `12_DEVELOPMENT_RULES_AND_AI_AGENT_PROMPT.md` — implementation conventions and reusable agent instructions
13. `13_TASK_TRACKER.md` — actionable task backlog and release checklist

## Key architecture decisions
- **Supabase Postgres is the source of truth.** Google Sheets is a secondary reporting copy, not a database replacement.
- **Netlify hosts the React static application and Node.js serverless functions.** Do not build a long-running Express server and expect it to stay alive on Netlify.
- **Supabase Auth + Row Level Security (RLS)** protect the database. Never expose the Supabase service-role key in browser code.
- **Financial year:** India FY runs 1 April through 31 March; e.g. FY 2026–27 is 1 April 2026 to 31 March 2027.
- **Year-end archive:** generate and verify the annual PDF and Sheets export, then lock/archive the closed FY. Do **not** automatically hard-delete prior-year records by default. Destructive deletion requires an explicit retention policy, successful verification, a backup, and authorized approval.
- **Offline use:** the first release assumes a reliable internet connection. Do not claim that entries made offline are safely synced unless an offline queue and conflict strategy are implemented and tested.

## Suggested implementation order
PRD → requirements → schema/RLS → core screens → attendance and payroll calculations → tractor logs → reports/PDF → Sheets sync → year-end close → security and deployment validation.

## Definition of MVP
An authenticated owner can manage labourers, record attendance, calculate payable wages, record and settle advances, log tractor hours and expenses, invite partners with read-only access, view reports, export PDFs, and produce a year-end archive pack. Every sensitive write is permission-checked and auditable.

## Decisions to confirm before production
- Wage basis: daily, hourly, piece-rate, or a combination.
- Attendance units: full day/half day/hours and permitted correction workflow.
- Payroll period: weekly, fortnightly, monthly, or custom.
- Tractor usage billing: owned machinery only, hired machinery too, or both.
- Whether partners can download reports or only view dashboards.
- Google account that owns the reporting spreadsheet and who may access it.
- Applicable local payroll, tax, accounting and record-retention requirements. Obtain local professional advice before using reports as statutory records.
