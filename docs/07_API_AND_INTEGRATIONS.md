# 07 — API and Integration Specification

## 1. General conventions
- Base URL: Netlify Functions, e.g. `/.netlify/functions/<function-name>`.
- HTTPS only.
- Requests carry Supabase access token in `Authorization: Bearer <access_token>`.
- Validate JWT, active membership, role, farm scope, schema and business rules server-side.
- JSON errors use `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }`.
- Use UUIDs and ISO dates (`YYYY-MM-DD`); timestamps use ISO 8601.
- Financial writes accept an `Idempotency-Key` for retry safety where applicable.

## 2. Endpoint inventory (proposed)
| Method | Route | Purpose | Roles |
|---|---|---|---|
| GET | `/reports/summary` | Dashboard summary | all authorized roles |
| POST | `/payroll/preview` | Calculate preview without posting | payroll, admin, owner |
| POST | `/payroll/finalize` | Finalize payroll atomically | owner or authorized payroll approver |
| POST | `/payroll/payments` | Record payment | payroll, admin, owner |
| POST | `/advances` | Issue advance | payroll, admin, owner |
| POST | `/advances/:id/recover` | Allocate recovery/repayment | payroll, admin, owner |
| POST | `/machinery-usage/validate` | Validate time/meter log | authorized operator roles |
| POST | `/reports/pdf` | Generate report PDF | authorized roles |
| POST | `/integrations/google-sheets/sync` | Queue or run sync | owner/admin or trusted scheduler |
| GET | `/integrations/google-sheets/status` | Show sync health | owner/admin |
| POST | `/year-end/preview` | Preview close and reconciliation | owner/admin |
| POST | `/year-end/close` | Create verified close manifest and lock FY | owner only |
| POST | `/year-end/reopen` | Reopen locked FY with reason | owner only |
| GET | `/exports/:id/download` | Authorize report download | authorized roles |

Routes are a logical API contract; exact Netlify Function filenames may differ.

## 3. Example payroll preview request
```json
{
  "farmId": "uuid",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-10-31",
  "includeApprovedAttendanceOnly": true
}
```

Example response:
```json
{
  "period": { "start": "2026-10-01", "end": "2026-10-31" },
  "currency": "INR",
  "lines": [
    {
      "labourerId": "uuid",
      "units": 22,
      "rate": "600.00",
      "gross": "13200.00",
      "advanceRecovery": "1000.00",
      "deductions": "0.00",
      "netPayable": "12200.00"
    }
  ],
  "totals": {
    "gross": "13200.00",
    "advanceRecovery": "1000.00",
    "netPayable": "12200.00"
  },
  "warnings": []
}
```

## 4. Google Sheets integration
### Recommended model
- Use a dedicated Google Cloud project and service account.
- Share the destination spreadsheet with the service-account email using the minimum required permissions.
- Keep private key and spreadsheet ID in server-side environment variables.
- Never expose Google credentials in React or commit them to Git.
- Create tabs such as `Labourers`, `Attendance`, `Payroll`, `Advances`, `Machinery`, `Usage`, `Expenses`, `Annual_Summary`, and `Sync_Manifest`.
- Include `record_id` UUID, `farm_id`, `updated_at`, and `sync_version` columns.
- Upsert by `record_id`; do not use row position as identity.
- For edits, update the matching UUID row; for deactivated records, mirror status rather than deleting the row.
- Sync selected fields only. Avoid unnecessary personal data.

### Reliability
- Use `sync_jobs` as an outbox; queue in the same transaction as data changes.
- Process bounded batches; respect API quotas.
- Retry transient failures with exponential backoff and jitter.
- Mark permanent schema/permission errors as failed and show them in the admin UI.
- A sync success means the expected record IDs/counts and reconciliation totals were verified, not merely that an API request returned HTTP 200.
- Google Sheets is not authoritative; edits made manually in Sheets are not automatically imported into Supabase.

## 5. PDF generation
- Generate server-side using a maintained Node-compatible library or HTML-to-PDF approach compatible with Netlify limits.
- Use a versioned report template.
- Include farm, report type, date/FY, timezone, generation time, filters, page numbers, totals and sign-off fields where needed.
- Use a snapshot/consistent query to avoid mixed-time totals.
- Save in private Supabase Storage; store object path, SHA-256 checksum, row counts, totals, creator and status.
- Use short-lived signed URLs for downloads; do not make payroll PDFs public.

## 6. Annual close API behavior
`POST /year-end/preview` returns:
- FY boundaries and label
- counts by entity
- attendance approval exceptions
- draft/unfinalized payroll periods
- outstanding advance balances
- usage validation warnings
- PDF and Sheets readiness
- totals for reconciliation

`POST /year-end/close`:
- Requires owner role and idempotency key.
- Rechecks readiness server-side.
- Creates consistent report snapshot and PDF.
- Verifies storage checksum and required Sheets tabs/counts/totals.
- Saves close manifest and locks the FY in a transaction.
- Does not hard-delete records.

## 7. Google Sheets setup checklist
1. Create/choose a Google Cloud project.
2. Enable Google Sheets API.
3. Create a service account and key, or use a secure OAuth flow.
4. Share the spreadsheet with the service-account email.
5. Add credentials to Netlify environment variables.
6. Deploy a test function and verify least-privilege access.
7. Test create/update/deactivation and retry idempotency.
8. Restrict spreadsheet sharing to intended people; spreadsheet permissions are separate from application roles.
