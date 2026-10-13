# 08 — Security, Privacy, Access Control and Retention

## 1. Threat model
Protect labour contact details, wage amounts, advances, partner visibility, payroll PDFs, receipts, Google credentials and historical business records. Key risks include unauthorized partner access, cross-farm data leakage, leaked service keys, duplicate payments, tampered attendance, malicious file uploads, and premature deletion.

## 2. Access control
- Deny by default.
- Every exposed Supabase table has RLS enabled.
- Membership and active status are checked for every read/write.
- Partner is read-only and may only see the farm data explicitly authorized by membership.
- Payroll finalization, year-end close, role changes and retention actions require server-side role validation.
- The client UI hiding a button is not a security control.
- Prevent an owner from accidentally removing the final active owner.
- Use separate permission checks for viewing payroll detail versus summary totals if required.

## 3. Secret management
- Supabase service-role key only in server-side Netlify environment or trusted Supabase functions.
- Google service account private key only in server-side secrets.
- Never store secrets in Vite variables, client bundle, Git history, issue tracker or logs.
- Rotate compromised credentials immediately.
- Use separate development/test/production credentials and spreadsheet IDs.

## 4. Data protection
- HTTPS in transit; rely on provider encryption at rest and review provider settings.
- Private Supabase Storage buckets for payroll PDFs and receipts.
- Validate MIME type, file extension and size; do not trust browser-provided content type.
- Use short-lived signed URLs.
- Redact tokens, credentials, full private keys and unnecessary personal details from logs.
- Minimize collected personal data; phone is optional. Avoid collecting Aadhaar, bank details or identity documents unless a justified, reviewed requirement is added.

## 5. Audit and financial integrity
- Append audit events for create/update/deactivate/approve/finalize/payment/recovery/export/close/reopen actions.
- Corrections to approved attendance require a reason.
- Finalized payroll is immutable; use reversal/adjustment records rather than editing posted values.
- Store rate and calculation snapshots on payroll lines.
- Use database transactions and idempotency keys for financial posting.
- Do not use floating-point values for currency.
- Reconcile totals from source records and show exceptions.

## 6. Retention and year-end policy
**Default: retain and lock; do not automatically delete.**
A PDF is a report, not a full substitute for normalized records, audit history, attachments or future queryability. A Sheets copy may be incomplete or access-controlled differently. Deletion may also conflict with legal, tax, employment, accounting, insurance or dispute-related retention duties.

Required close controls:
1. Select FY and show exact inclusive dates.
2. Block or clearly flag unresolved attendance/payroll.
3. Reconcile payroll, payments, advances and machinery costs.
4. Generate PDF pack and store checksum/manifest.
5. Verify Sheets export using record IDs, counts and totals.
6. Record backup/export reference.
7. Lock FY and retain data in Supabase.
8. Permit reopening only to owner with reason and audit trail.

If permanent deletion is ever approved:
- Define a retention period with a qualified local accountant/legal adviser.
- Produce a dry-run list of exact tables, date range, row counts and dependencies.
- Confirm backup restoration has been tested.
- Confirm PDF and Sheets verification succeeded.
- Require explicit owner confirmation and ideally second-person approval.
- Delete only records eligible under the approved policy, respecting foreign keys and audit requirements.
- Keep a deletion manifest without retaining the deleted sensitive payload.
- Never run an unbounded `DELETE WHERE date < ...` automatically.

## 7. Backup and recovery
- Establish a documented Supabase backup/export method suitable for the selected plan.
- Export critical tables before annual close and before schema migrations.
- Test restoration into a non-production project at a defined cadence.
- PDF/Sheets exports are additional recovery artifacts, not a complete database backup.
- Define acceptable recovery point/time objectives before production use.

## 8. Incident response
1. Disable affected user or revoke credentials.
2. Rotate exposed keys and invalidate sessions where supported.
3. Review audit and provider logs.
4. Identify affected data and integrations.
5. Restore from a verified backup if needed.
6. Document the incident and remedial action.
7. Follow applicable notification/legal obligations.
