# 03 — Technical Requirements Document

## 1. Required stack
- Frontend: React + TypeScript + Vite.
- UI: semantic HTML, CSS, responsive component system; Tailwind CSS is optional, not mandatory.
- Backend: Node.js TypeScript functions deployed as Netlify Functions for privileged workflows and external integrations.
- Data/auth: Supabase Postgres + Supabase Auth + Row Level Security + Supabase Storage.
- Hosting: Netlify free tier for static frontend and supported serverless functions; Supabase project for backend services.
- Reporting mirror: Google Sheets API using a service account or controlled OAuth integration.
- PDF: generate server-side from trusted report data; select a Node-compatible PDF library after checking bundle size and serverless execution constraints.
- Tests: unit tests, integration tests against Supabase test project, browser end-to-end tests.
- Version control: Git; CI checks on pull requests.

## 2. Important Netlify constraint
Netlify is suitable for static React hosting and short-lived serverless functions. It is not a persistent Node.js server. Do not rely on in-memory state, long-running workers, local filesystem persistence, or an always-running Express process. Persist all state in Supabase. Use scheduled functions/Netlify Scheduled Functions only where supported by the selected plan and validate quotas; otherwise use Supabase scheduled jobs or an external scheduler.

## 3. Functional quality attributes
- Responsive: usable on mobile, tablet and desktop.
- Accessibility: keyboard navigable, clear focus, form labels, adequate contrast, meaningful validation.
- Performance: dashboard initial data should be paginated/aggregated server-side; target common screens usable within 3 seconds on ordinary broadband for typical data volumes.
- Reliability: retry-safe operations, idempotency for payment posting and Sheets sync, visible integration failures.
- Data integrity: foreign keys, checks, unique constraints and transactional writes for payroll and year-end close.
- Maintainability: strict TypeScript, shared domain types, migrations in version control, lint/format checks.
- Observability: structured logs, request IDs, error reporting and sync health dashboard.

## 4. Security requirements
- Supabase anon/publishable key may be used in the browser only with correctly enforced RLS.
- Supabase service-role key, Google credentials and signing secrets must only exist in Netlify/Supabase server-side secrets.
- Validate all input server-side for privileged workflows; frontend validation is for usability only.
- Use RLS policies scoped by user and farm membership.
- Avoid broad `USING (true)` policies for authenticated users.
- No secrets in Git, source maps, client bundles, PDF metadata or logs.
- Rate-limit sensitive endpoints where feasible and protect against duplicate submissions.

## 5. Data and domain conventions
- Primary key: UUID.
- Money: Postgres `numeric(14,2)` or appropriate precision; never use floating-point arithmetic for money.
- Timestamps: `timestamptz`; business dates: `date`.
- Store currency code (default INR) and timezone.
- Use `created_at`, `updated_at`, `created_by`, `updated_by`, `farm_id` consistently.
- Use soft deactivation (`is_active`) for master data.
- Store a calculation snapshot/version on finalized payroll lines.
- Use stable UUIDs for Google Sheets upsert identity.

## 6. Integration constraints
- Google Sheets API has quotas and may fail; sync must be asynchronous/retryable and must not block attendance entry.
- PDF generation should be deterministic from a defined report snapshot. Store generated timestamp, FY, row counts, totals and checksum.
- Use private storage for payroll PDFs and receipt attachments.
- Avoid storing the same data as independently editable copies in Supabase and Sheets; Sheets is a projection/mirror.

## 7. Environment configuration
Required server-side variables (names illustrative):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (protect newline formatting)
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `PDF_STORAGE_BUCKET`
- `APP_TIMEZONE` (default `Asia/Kolkata`)
- `APP_CURRENCY` (default `INR`)
- `APP_BASE_URL`
- `SENTRY_DSN` or chosen server-side error-monitoring configuration (optional)

Browser may use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`/publishable key only. Never prefix private secrets with `VITE_`.

## 8. Acceptance gates
- TypeScript type-check and lint pass.
- Migrations apply cleanly to a fresh Supabase project.
- RLS negative tests pass for every role.
- Payroll calculation test vectors pass.
- Annual close is idempotent and cannot delete records.
- Production build runs in CI and deploy preview works without secrets leakage.
