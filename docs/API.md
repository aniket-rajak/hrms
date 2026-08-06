# API Reference

Base URL: `http://localhost:5000/api`

All endpoints require `Authorization: Bearer <accessToken>` unless marked public.

## Response envelope

```json
{
  "success": true,
  "message": "Optional message",
  "data": { }
}
```

Errors use `success: false` with a `message`. Validation errors include a `details` array.

## Auth (`/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Login with `email`, `password`. Sets refresh cookie, returns `accessToken`, `user`, `employee` |
| POST | `/auth/refresh` | Public (cookie) | Rotates the refresh token, returns new `accessToken` |
| POST | `/auth/logout` | Public (cookie) | Revokes refresh token, clears cookie |
| POST | `/auth/forgot-password` | Public | Sends reset link (SMTP) or returns `devLink` in dev |
| POST | `/auth/reset-password` | Public | `token`, `password` |
| POST | `/auth/change-password` | Authenticated | `currentPassword`, `newPassword`; signs out |
| GET | `/auth/me` | Authenticated | Current user + linked employee |

## Employees (`/employees`) — admin only except `/me`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees` | List. Query: `page`, `pageSize`, `search`, `departmentId`, `status` |
| POST | `/employees` | Create (creates login user; default password, force reset on first login) |
| GET | `/employees/me` | Current employee (any authenticated employee) |
| GET | `/employees/:id` | Detail incl. `department`, `salaryStructure`, `documents` |
| PATCH | `/employees/:id` | Update profile/status |
| DELETE | `/employees/:id` | Delete employee + user |
| PATCH | `/employees/:id/profile-image` | Set `profileImageUrl` (uploaded via Cloudinary) |
| GET | `/employees/:id/salary-structure` | Get salary structure |
| PUT | `/employees/:id/salary-structure` | Create/update structure (`basic`, `housing`, `transport`, `medical`, `otherAllowances`, `deductions`) |
| POST | `/employees/:id/documents` | Add document (`title`, `type`, `fileUrl`, `size`) |
| DELETE | `/employees/documents/:docId` | Remove document |

## Departments (`/departments`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/departments` | Authenticated | List with `employeeCount` |
| GET | `/departments/:id` | Authenticated | Detail |
| POST | `/departments` | Admin | Create |
| PATCH | `/departments/:id` | Admin | Update |
| DELETE | `/departments/:id` | Admin | Delete (fails if employees assigned) |

## Attendance (`/attendance`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/attendance/check-in` | Employee | `note` optional |
| POST | `/attendance/check-out` | Employee | Ends the open record |
| GET | `/attendance/today` | Employee | Today's record (or `null`) |
| GET | `/attendance/history` | Employee | Paginated history (`month`, `year`, `page`, `pageSize`) |
| GET | `/attendance/monthly` | Employee | Aggregated month view |
| GET | `/attendance/all` | Admin | All records (`search`, `month`, `year`, `status`, paging) |
| PATCH | `/attendance/:id` | Admin | Correct `status` / `checkInAt` / `checkOutAt` |

## Leave (`/leaves`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/leaves` | Employee | My requests (`status`, paging) |
| POST | `/leaves/apply` | Employee | `leaveType`, `startDate`, `endDate`, `reason`. Validates balance & holidays |
| GET | `/leaves/balance` | Employee | Annual/sick/casual/unpaid quotas for `year` |
| GET | `/leaves/all` | Admin | All requests (`status`, `search`, paging) |
| PATCH | `/leaves/:id/approve` | Admin | Approve (`note` optional) |
| PATCH | `/leaves/:id/reject` | Admin | Reject (`note` required) |

## Payroll (`/payroll`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/payroll/structure/me` | Employee | My salary structure |
| PUT | `/payroll/structure/me` | Employee | Update my structure (visible to self) |
| GET | `/payroll/records/me` | Employee | My payslips (`month`, `year`, paging) |
| GET | `/payroll/records/:id` | Admin or owner | Record detail |
| GET | `/payroll/records/:id/slip` | Admin or owner | **PDF** payslip (download) |
| GET | `/payroll/records` | Admin | All records (`month`, `year`, `status`, `search`, paging) |
| POST | `/payroll/records/generate` | Admin | `month`, `year` — generates records, prorating by joining date; skips existing |
| PATCH | `/payroll/records/:id/paid` | Admin | Mark as paid |
| DELETE | `/payroll/records/:id` | Admin | Delete a draft/record |

## Dashboard (`/dashboard`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard/admin` | Admin | Stats, upcoming birthdays, recent activities, charts |
| GET | `/dashboard/employee` | Employee | Today's status, pending leave, recent payslips, monthly hours |

## Analytics (`/analytics`) — admin only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/summary` | Headline numbers |
| GET | `/analytics/attendance-chart?months=6` | Monthly present/absent/half-day |
| GET | `/analytics/leave-stats?year=` | Approved leave by type |
| GET | `/analytics/department-distribution` | Employees per department |
| GET | `/analytics/hiring-trend?months=12` | New hires per month |
| GET | `/analytics/payroll-summary?year=` | Paid/draft totals |
| GET | `/analytics/department-payroll` | Payroll by department |
| GET | `/analytics/activities?limit=20` | Recent activity feed |

## Settings (`/settings`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/settings/public` | Authenticated | Company name, logo, holidays (public subset) |
| GET | `/settings` | Admin | Same |
| PATCH | `/settings` | Admin | Update company info, email, phone, address, currency |
| POST | `/settings/company-logo` | Admin | Set `companyLogo` URL |
| PATCH | `/settings/profile` | Authenticated | Update my profile fields |
| GET | `/settings/holidays` | Admin | List holidays |
| POST | `/settings/holidays` | Admin | Add holiday (`name`, `date`) |
| DELETE | `/settings/holidays/:id` | Admin | Remove holiday |

## Uploads (`/uploads`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/uploads/signature` | Cloudinary signed-upload params (`cloudName`, `apiKey`, `timestamp`, `signature`, `folder`). The browser uploads the file directly to Cloudinary; the server never stores files |

## Auth flow notes

- Access token: 15 min, kept in memory (localStorage fallback).
- Refresh token: 7 days, httpOnly cookie named `hrms_refresh`, rotated on every refresh, stored hashed in DB.
- 401 on a non-auth call triggers an automatic single retry after refresh; if refresh fails the user is redirected to `/login`.
