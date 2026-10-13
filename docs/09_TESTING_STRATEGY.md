# 09 — Testing Strategy and Release Gates

## 1. Test layers
- Unit tests: wage calculations, FY boundaries, duration calculations, money rounding, advance balance calculations.
- Component tests: forms, validation, role-gated UI, error states.
- Integration tests: RLS policies, database constraints, transactional payroll, sync outbox and storage access.
- End-to-end tests: sign-in, attendance, payroll, advances, tractor logs, expense reports, partner read-only view, PDF export, year-end close.
- Security tests: cross-farm access, direct API calls, privilege escalation, secret leakage, file access.
- Operational tests: retry behavior, duplicate requests, Google API outage, PDF failure, restoration procedure.

## 2. Calculation test vectors
Create explicit fixtures for:
- Daily rate × full days.
- Half-day conversion according to configured policy.
- Hourly rate × approved hours.
- Piece-rate × approved quantity.
- Advance recovery smaller than, equal to, and greater than outstanding balance.
- Partial payroll payments and remaining balance.
- Rounding at 2 decimal places.
- Attendance corrected before and after payroll finalization.
- FY boundary dates: 31 March and 1 April.
- Tractor duration across midnight if allowed; reject invalid end-before-start otherwise.
- Meter regression and overlapping usage intervals.

## 3. Authorization test matrix
| Action | Owner | Admin | Payroll | Supervisor | Partner |
|---|---:|---:|---:|---:|---:|
| Read authorized dashboard | Yes | Yes | Yes | Limited | Yes |
| Manage users/roles | Yes | Limited/configurable | No | No | No |
| Create attendance | Yes | Yes | Optional | Yes | No |
| Finalize payroll | Yes | Configurable | Authorized approver only | No | No |
| Issue/recover advance | Yes | Configurable | Yes | No | No |
| Record tractor usage | Yes | Yes | No | Yes/configurable | No |
| Record machinery expense | Yes | Yes | Configurable | Configurable | No |
| Export payroll PDF | Yes | Configurable | Yes | No | Configurable read-only |
| Close financial year | Yes | No by default | No | No | No |
| Permanently delete records | Not part of normal flow | No | No | No | No |

## 4. Integration failure tests
- Google API returns 429, 401, 403, 5xx and timeout.
- Worker retries do not duplicate rows.
- Spreadsheet deleted or renamed.
- Invalid/malformed private key.
- PDF generation exceeds execution time or file size limits.
- Storage upload succeeds but metadata update fails; recovery must be idempotent.
- User loses membership while a function request is in progress.
- Duplicate annual-close request with the same idempotency key.
- Supabase is temporarily unavailable.

## 5. Security release gates
- All exposed tables have RLS enabled and reviewed.
- Partner cannot mutate data through direct API calls.
- User from Farm A cannot access Farm B records.
- No service-role or Google secret appears in built assets, source maps, logs or repository.
- Private report URL cannot be used after expiry.
- Audit log cannot be modified by ordinary roles.
- Annual close does not delete data.

## 6. Definition of done
A feature is done only when:
- Acceptance criteria pass.
- Loading, empty, success, validation and error states exist.
- Server-side authorization and RLS are tested.
- Relevant audit events are written.
- Migration and seed data are updated.
- Responsive layout is checked on mobile and desktop.
- Documentation and environment examples are updated.
- CI passes and deployment preview is reviewed.
