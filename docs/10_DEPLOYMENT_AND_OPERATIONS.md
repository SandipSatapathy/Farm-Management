# 10 — Deployment and Operations Guide

## 1. Accounts and services
- Git repository (GitHub or GitLab).
- Netlify site connected to repository.
- Supabase project.
- Google Cloud project with Sheets API enabled and spreadsheet created.
- Optional error-monitoring account.

## 2. Local development
1. Install a supported Node.js LTS release and package manager.
2. Create React + TypeScript + Vite application.
3. Add Supabase client and UI dependencies only as approved in the technical plan.
4. Create Supabase development project and apply migrations.
5. Configure `.env.local` with only browser-safe values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` or the currently recommended publishable key
6. Configure Netlify Functions local environment separately for server-only secrets.
7. Run frontend and functions locally using the chosen Netlify development workflow.
8. Seed non-production demo data; never use real payroll records in test fixtures.

## 3. Supabase setup
- Create project in an appropriate region.
- Apply version-controlled migrations.
- Enable Auth email/password and configure redirect URLs.
- Disable public sign-up unless explicitly required.
- Create private Storage buckets for reports and receipts.
- Enable RLS and apply reviewed policies to every exposed table.
- Create test users for every role.
- Test database restore/export procedure.
- Configure backups according to the selected plan and required RPO/RTO.

## 4. Netlify setup
- Connect repository and set build command (e.g. `npm run build`) and publish directory (`dist`).
- Keep functions under the configured functions directory.
- Configure SPA fallback routing so deep links resolve to `index.html` without masking function routes.
- Set server-side environment variables in Netlify UI; scope production variables to production context.
- Never put service-role keys or Google private keys in `VITE_*` variables.
- Deploy preview and verify Auth redirect URLs and CORS/origin behavior.
- Confirm free-tier function limits, execution limits, bandwidth and build quotas against current Netlify plan terms before release.

### Secrets scanning and browser configuration
Vite embeds `VITE_*` variables in the browser bundle. The Supabase project URL, Supabase anon/publishable key, and Google Apps Script deployment identifier are intentionally public configuration in this application, not server-side credentials.

`netlify.toml` sets `SECRETS_SCAN_OMIT_KEYS` to exclude only these public variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_DEPLOYMENT_ID`), alongside the existing timezone and currency exclusions. Secrets scanning remains enabled for other environment variables and files; no build-output paths are excluded.

Before redeploying, verify that `VITE_SUPABASE_ANON_KEY` contains an anon or publishable key, never a service-role or secret key. RLS policies must protect every exposed Supabase table. The Google deployment identifier only locates the endpoint; it must not serve as an authentication secret. Keep private credentials in server-only environment variables accessed by Netlify Functions. If a private credential has already been exposed, rotate it rather than excluding it from scanning.

If scanning still reports these public variables, check for conflicting `SECRETS_SCAN_OMIT_KEYS` settings in the Netlify site or deploy-context environment and reconcile them with the repository configuration. Inspect the reported variable names without copying their values into logs. Do not disable secrets scanning or exclude all of `dist` to resolve the failure.

## 5. Google Sheets setup
- Create a dedicated spreadsheet with documented tab headers.
- Enable Google Sheets API.
- Create service account and share the spreadsheet with its email, or use a secure OAuth flow.
- Set server-side credentials and spreadsheet ID.
- Test one record insert, update, deactivation and retry.
- Restrict direct spreadsheet access independently of app roles.
- Decide whether partners need Google Sheet access; do not assume app permissions automatically apply to the spreadsheet.

## 6. CI/CD
Suggested pipeline:
1. Install dependencies with lockfile.
2. Lint and type-check.
3. Run unit/component tests.
4. Run integration tests against a disposable test project.
5. Build frontend and Netlify functions.
6. Scan for secrets/dependency issues.
7. Deploy preview.
8. Manual approval for production.
9. Run post-deploy smoke tests.

## 7. Production smoke tests
- Sign-in and password reset.
- Role access and partner read-only behavior.
- Create test labourer/attendance record and clean up through an approved test process.
- Payroll preview only; never finalize real payroll as a smoke test.
- Generate a test PDF in private storage and verify access control.
- Google Sheets test row is upserted once.
- Dashboard and reports load.
- Annual-close preview is available but no close is executed during smoke testing.

## 8. Operational monitoring
- Failed function count and latency.
- Failed/aging sync jobs.
- Failed PDF jobs.
- Authentication errors.
- Database/storage usage and provider quotas.
- Recent privileged actions and annual-close status.
- Alerts for repeated integration failure or unexpectedly high exports.

## 9. Recovery and maintenance
- Keep migrations in source control and review before production.
- Back up/export before schema changes.
- Test restoration periodically.
- Rotate credentials when access changes or compromise is suspected.
- Review active users and partner access quarterly.
- Review Google Sheets sharing whenever a partner or employee leaves.
- Check Netlify and Supabase free-tier limits regularly; free-tier terms and quotas can change.
