# Testing Guide

## Current state

The project has **no automated test suites** yet (no unit/integration/e2e runner configured). Quality gates in place:

- **TypeScript strict builds** — `npm run build` in `backend`, `frontend`, and `shared` all type-check.
- **ESLint (frontend)** — `npm run lint --workspace frontend` runs Next + React hooks + TS rules.
- **Manual QA** — see the checklist below.

## Manual QA checklist

### Setup
1. `npm install` at the root.
2. Build shared, push the DB, seed (see [INSTALLATION.md](INSTALLATION.md)).
3. Run backend + frontend.

### Auth
- [ ] Admin login with `admin@hrms.com` / `Admin@123` redirects to the dashboard.
- [ ] Login with wrong password shows an error toast.
- [ ] Reloading the page keeps the session (refresh cookie).
- [ ] Direct URL access to `/employees` while logged out redirects to `/login` (also with an expired access token).
- [ ] An employee user cannot open `/employees` (redirected to their dashboard).
- [ ] Logout clears the session and returns to login.
- [ ] Forgot password: with SMTP unset, a `devLink` appears in the backend console; resetting works and forces re-login.
- [ ] Change password signs the user out.

### Employees (admin)
- [ ] Create employee → appears in list; new user can log in with default password and is asked to change it.
- [ ] Search by name/email/code; filter by department and status.
- [ ] Pagination moves between pages and resets on filter change.
- [ ] Edit employee, upload profile picture (Cloudinary configured), upload + open + delete a document.
- [ ] Edit salary structure → net salary recomputes; appears in payroll generation.
- [ ] Deactivate an employee → they cannot log in.
- [ ] Delete an employee removes them from the list.

### Departments (admin)
- [ ] Create, edit, delete departments.
- [ ] Deleting a department that has employees shows an error and is blocked.

### Attendance
- [ ] Employee checks in → status PRESENT; checks out → working hours shown.
- [ ] Check-in twice the same day is blocked; check-out without check-in is blocked.
- [ ] Monthly view counts present/absent/half-day correctly.
- [ ] Admin corrects an attendance record; employee history reflects it.

### Leave
- [ ] Employee applies for annual leave; balance decreases only after approval.
- [ ] Applying beyond remaining balance is blocked (server error).
- [ ] Admin approves/rejects; rejecting with a note shows the note.
- [ ] Applying on an existing public holiday is rejected.

### Payroll
- [ ] Admin generates payroll for a month → records created, pro-rated for new joiners; generating twice for the same month is a no-op.
- [ ] Mark a record as paid; the payslip download returns a valid PDF.
- [ ] Employee sees only their own records and can download their own slip.
- [ ] Employee cannot access the admin payroll page.

### Analytics & dashboard
- [ ] Admin dashboard shows correct counts after adding/removing employees.
- [ ] Charts render; analytics page reflects payroll and attendance data.
- [ ] Activity feed records actions (login, create, approve…).

### Settings
- [ ] Company name/logo update propagates to login page and payslips.
- [ ] Holidays list and CRUD work.

### UX / polish
- [ ] Dark mode toggle persists across reloads.
- [ ] Mobile view (< 768px) shows the slide-over sidebar and usable tables.
- [ ] Skeletons show while data loads; empty states render for no data; error states offer retry.

## Automated testing (future work)

Recommended setup when adding tests:

- **Backend unit/integration**: Vitest + Supertest against an in-memory MongoDB (`mongodb-memory-server`), or a dedicated `hrms_test` database via `DATABASE_URL` in a global setup.
- **Frontend unit**: Vitest + React Testing Library for forms, hooks, and shared components.
- **E2E**: Playwright against the seeded stack (login, create employee, apply leave, generate payroll, download slip).
- Add `npm test` scripts per workspace and wire them into CI (GitHub Actions: install → build shared → typecheck → test → lint).

## CI suggestion (GitHub Actions)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm install
      - run: npm run build --workspace @hrms/shared
      - run: npm run build --workspace backend
      - run: npm run build --workspace frontend
      - run: npm run lint --workspace frontend
```
