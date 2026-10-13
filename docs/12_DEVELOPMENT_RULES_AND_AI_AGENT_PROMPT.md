# 12 — Development Rules and AI Agent Instructions

## 1. Non-negotiable rules
1. Use React + TypeScript + Vite for the frontend, Node.js serverless functions for privileged workflows, Supabase for database/auth/storage, Netlify for hosting, and Google Sheets as a reporting mirror.
2. Do not create a persistent Express server for Netlify hosting.
3. Supabase is the source of truth. Never let Google Sheets become an independent master database.
4. Never expose service-role keys, Google private keys or privileged credentials to the browser.
5. Every exposed table must have RLS and role-aware policies.
6. Do not use floating-point arithmetic for money.
7. Do not hard-delete labourers, machinery or financial records as part of ordinary workflows.
8. Financial-year close must create a verified archive and lock the period; it must not delete previous-year data.
9. Do not finalize payroll without a preview, authorized approval and an auditable snapshot.
10. Never invent payroll/overtime/statutory rules. Keep them configurable and request clarification when unspecified.
11. All integrations must be retry-safe and idempotent.
12. Keep migrations, tests, `.env.example`, README and technical docs in sync.

## 2. Code standards
- Strict TypeScript; avoid `any` except documented boundary cases.
- Keep domain calculations pure and unit-tested.
- Separate UI, domain logic, database access and integration code.
- Validate inputs on the server and use database constraints as a second layer.
- Use consistent error codes and user-safe messages.
- Use pagination for lists and aggregate queries for dashboards.
- Avoid logging personal or financial data unnecessarily.
- Use stable UUIDs as external integration identities.
- Use database transactions for payroll finalization, payment posting, advance recovery and year-end close.
- Add request IDs to logs and audit records.

## 3. Definition of done for every feature
- Requirements and acceptance criteria are met.
- Loading, empty, success, validation and error states are handled.
- Authorization is tested at the API/database level.
- Audit trail exists for sensitive writes.
- Unit/integration/E2E tests are added as appropriate.
- Mobile layout is checked.
- Migration and seed data are updated.
- No secrets are committed or bundled.
- Documentation is updated.

## 4. Reusable prompt for an AI coding agent
> Build the Labour & Farm Operations Management System using the documentation package as the source of truth. Work one phase at a time and do not implement future phases prematurely. Before coding a phase, summarize its scope, affected tables, RLS changes, screens, API/functions and tests. Follow React + TypeScript + Vite, Node.js serverless functions on Netlify, Supabase Postgres/Auth/Storage, and Google Sheets mirror architecture. Supabase is authoritative. Implement RLS and server-side authorization before relying on UI restrictions. Use numeric-safe money calculations, database constraints, transactions and idempotency for financial operations. Do not hard-delete prior-year records during annual close. Never expose privileged secrets in client code. Do not invent business rules for half days, overtime, deductions or payroll cadence; use documented settings or ask for a decision. At the end of each phase, run tests, list changed files, report migrations/configuration required, provide manual verification steps and stop for approval before proceeding to the next phase.

## 5. Phase delivery report template
- Phase and scope completed
- Requirements covered
- Files created/changed
- Database migrations and RLS changes
- Environment variables added
- Tests run and results
- Manual test instructions
- Known limitations and risks
- Decisions needed from owner
- Confirmation that no future phase was silently added
