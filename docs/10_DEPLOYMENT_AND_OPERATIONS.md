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
- All `VITE_*` values used by the frontend are embedded in the public browser bundle. Keeping those values in Netlify settings does not make them private.
- Secrets scanning remains enabled. The repository excludes only the public Supabase project URL and the existing currency/timezone settings from value scanning; Google configuration and privileged credentials are not excluded.
- Use only a Supabase anonymous/publishable key for `VITE_SUPABASE_ANON_KEY`, never a service-role or secret key. Verify Row Level Security before deploying. If scanning flags a confirmed public key, mark only that variable as non-secret in Netlify settings after reviewing it.
- `.env` and `.env.*` files are already ignored. Ignoring a file does not remove it from Git history if it was previously committed.
- Deploy preview and verify Auth redirect URLs and CORS/origin behavior.
- Confirm free-tier function limits, execution limits, bandwidth and build quotas against current Netlify plan terms before release.

## 5. Google Sheets setup
- Direct browser webhook sync was disabled because the Google endpoint must remain private. CSV exports remain available for manual spreadsheet imports.
- The current login uses browser-local accounts, not server-verifiable sessions. Do not replace the removed direct webhook with an unauthenticated proxy; that would still allow unauthorized spreadsheet writes.
- Revoke or redeploy the previously exposed Apps Script endpoint. Removing the URL from current source files does not remove it from repository history or previously published assets.
- Remove `VITE_GOOGLE_DEPLOYMENT_ID` and `VITE_GOOGLE_SHEETS_WEBHOOK_URL` from Netlify environment settings. When a secure integration is implemented, configure a replacement `GOOGLE_SHEETS_WEBHOOK_URL` only for Netlify Functions, not the frontend build.
- Before restoring remote sync, implement server-verified authentication and farm-level write authorization, validate the payload, and keep the destination fixed in server-only configuration. The browser must never receive the private endpoint or supply the destination URL.
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
