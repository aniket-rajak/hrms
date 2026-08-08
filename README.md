# 💼 HR Management System (HRMS)

A lightweight, modern, production-ready Human Resource Management System built with **Next.js**, **Express**, **MongoDB**, **TypeScript**, and **Cloudinary**.

Essential HR functionality — no unnecessary complexity.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT (short-lived access + rotating refresh token) |
| Validation | Zod (shared between frontend and backend) |
| Forms | React Hook Form + Zod resolver |
| Data fetching | TanStack Query + Axios |
| Charts | Recharts |
| Animations | Framer Motion (minimal) |
| Storage | Cloudinary (free tier) |
| Email | Brevo HTTP API (primary) + Nodemailer/SMTP fallback (forgot-password, credentials) |
| Hosting | Render (API) · Vercel (frontend) · MongoDB Atlas |
| PDF | pdfkit (salary slips, generated on the server) |

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://hrms-frontend-five-ivory.vercel.app |
| Backend API (Render) | https://hrms-9ypm.onrender.com (`/health` for status) |

## 🗂️ Monorepo Structure

```
hr-management-system/
├── backend/          # Express + Mongoose API
│   ├── scripts/      # seed.ts (demo data)
│   └── src/
│       ├── app.ts, index.ts  # Express app config & server entry
│       ├── config/   # env config, Cloudinary client
│       ├── lib/      # db (Mongoose), errors, tokens, uploads, respond
│       ├── middleware/ # auth, rate limiting, request validation
│       ├── models/   # Mongoose schemas (User, Employee, Leave, Payroll…)
│       ├── routes/   # module route definitions
│       ├── services/ # business logic (auth, employees, payroll, mail…)
│       └── utils/    # dates, pagination, query helpers, serializers
├── shared/           # @hrms/shared — types, DTOs, Zod schemas, constants
└── frontend/         # Next.js app
    └── src/
        ├── app/      # routes (auth pages, dashboard pages)
        ├── components/ # UI (shadcn), shared, layout, forms, dashboard
        ├── hooks/    # TanStack Query hooks
        ├── lib/      # api client, format utils, cloudinary upload
        ├── providers/ # auth provider, query client, theme
        ├── services/  # typed API callers
        └── proxy.ts   # Next.js middleware (auth route guard)
```

## 👥 User Roles

**Admin** — full access: dashboard, employees, departments, attendance management, leave approvals, payroll generation, analytics, settings.

**Employee** — dashboard, profile, check in/out, attendance history, leave requests, payslips (view/download/print), employee ID card (view/download/print), change password.

## ✨ Features

- **Auth** — login, JWT access token (15 min) + refresh token rotation (7-day httpOnly cookie), protected routes, role-based access, forgot/reset password with email links, password visibility eye toggle (admin + employee panels)
- **Credentials** — admins set a custom starting password when creating an employee (no hidden defaults); admins can view any employee's User ID & password, employees only their own — all masked by default with an eye-icon toggle
- **Employees** — create/edit/deactivate, search, filter by department, pagination, profile pictures, document uploads, salary structures
- **Departments** — CRUD with employee counts
- **Attendance** — check in/out, working-hours calculation, monthly history, admin corrections
- **Leave** — annual/sick/casual/unpaid quotas, apply, approve/reject with balance checks
- **Payroll** — monthly generation with full-time pro-rated adjustment, mark paid, PDF salary slips (owner/admin only)
- **Payslips** — dedicated employee tab listing personal salary slips with PDF download and print
- **ID Card** — dedicated employee tab with a preview of the official company ID card plus PDF download and print (company logo, photo, code, designation, department)
- **Analytics** — attendance trend, hiring trend, leave stats, department distribution, payroll summary, activity feed
- **Settings** — company profile, logo, holidays, password change
- **UX** — responsive (mobile-first with slide-over sidebar), dark/light mode, breadcrumbs, skeletons, toasts, empty/error states, confirm dialogs

## 🔒 Security

- bcrypt password hashing, admins set a starting password per employee (customizable on creation)
- A recoverable copy of each password is stored **AES-256-GCM encrypted** (key derived from `JWT_SECRET`) so admins/employees can view credentials — kept in sync on password change and reset
- Refresh tokens stored hashed, rotated on every refresh, revoked on logout
- Helmet, CORS (frontend origin only), per-route rate limiting
- Zod validation on every endpoint; users can only access their own data
- Payroll PDFs and records require admin or the owner employee

## 📁 Environment Variables

Dev copies are already created: `backend/.env` and `frontend/.env` (working dev defaults — only `DATABASE_URL` needs your database credentials). Templates live at `backend/.env.example` and `frontend/.env.example` (server, DATABASE_URL, JWT secrets, Cloudinary, email, seed credentials; and `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`).

| Scope | Variables |
|-------|-----------|
| Local backend (`backend/.env`) | `FRONTEND_URL=http://localhost:3000` (default — drives CORS + reset links) |
| Render (production backend) | `NODE_ENV=production`, `FRONTEND_URL=https://hrms-frontend-five-ivory.vercel.app`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `EMAIL_PROVIDER`/`BREVO_API_KEY`/`SMTP_*` |
| Vercel (production frontend) | `NEXT_PUBLIC_API_URL=https://hrms-9ypm.onrender.com/api`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=doowwkmbe` |

Email is provider-switchable: set `BREVO_API_KEY` → **Brevo HTTP API** (recommended — works on Render's free tier, which blocks SMTP); otherwise `SMTP_*` (e.g. Hostinger) is used via Nodemailer; with neither, reset links fall back to the server console.

## 🚀 Quick Start

```bash
npm install
npm run build --workspace @hrms/shared

# 1. Configure backend/.env and frontend/.env from the examples

# 2. Database
cd backend
npm run seed            # admin user + demo data (MongoDB is auto-created on connect)

# 3. Run
npm run dev --workspace backend   # API on :5000
npm run dev --workspace frontend  # app on :3000
```

Sign in with the seeded admin (default `admin@hrms.com` / `Admin@123`, overridable via `SEED_ADMIN_*`). Seeded employees use `Welcome@123`; employees created through the UI get the password the admin sets in the form.

## 📄 Documentation

- [Installation](docs/INSTALLATION.md)
- [API Reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md) (Vercel · Render · MongoDB Atlas · Cloudinary)
- [Testing](docs/TESTING.md)

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev --workspace backend` | Dev server with hot reload |
| `npm run dev --workspace frontend` | Next.js dev server |
| `npm run build --workspace backend` | Type-check + compile backend |
| `npm run build --workspace frontend` | Type-check + build frontend |
| `npm run lint --workspace frontend` | ESLint (frontend) |
| `npm run seed --workspace backend` | Seed database with demo data |

## ☁️ Deployment

Free-tier friendly: **Vercel** (frontend), **Render** (backend), **MongoDB Atlas M0** (database), **Cloudinary** (uploads). Note: Render's free tier blocks SMTP — use the Brevo HTTP API for email there. Full guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

- **Frontend** → Vercel: import the repo, root directory `frontend`, env vars `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Backend** → Render: whole repo, build `npm install && npm run build --workspace @hrms/backend`, start `npm start --workspace backend`, env vars `NODE_ENV=production`, `FRONTEND_URL`, `DATABASE_URL`, JWT + Cloudinary + email secrets
- `FRONTEND_URL` is the single source of truth for CORS — the local origin `http://localhost:3000` is always allowed too, so local dev and production coexist.

## 📋 Pending Tasks (To Be Completed Later)

### Environment & Database
- [x] Provision a hosted MongoDB: MongoDB Atlas M0 shared cluster (free) and set `DATABASE_URL`
- [x] Run `npm run seed` to load demo data (admin@hrms.com / Admin@123)
- [x] Verify backend starts: `npm run dev --workspace backend`

### Integrations
- [x] Fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `backend/.env` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` in `frontend/.env` (profile pictures, documents, company logo)
- [x] Email configured in `backend/.env`: Brevo HTTP API (`BREVO_API_KEY`) + Hostinger SMTP fallback
- [ ] Verify the Brevo sender in the Brevo dashboard (confirm `office@fouri.in`) and authorize your IP at https://app.brevo.com/security/authorised_ips (home IPs change — email silently falls back to SMTP/console on failure)
- [ ] Replace `JWT_SECRET` / `JWT_REFRESH_SECRET` with real random strings before deployment (also the key for the encrypted password copies — rotating it invalidates saved credential views)

### Verification
- [ ] Manual QA pass (see [docs/TESTING.md](docs/TESTING.md)) — auth, employees, attendance, leave, payroll, analytics, settings
- [x] Test payslip PDF download end-to-end (employee + admin, ownership guard verified)
- [x] Test profile picture and document uploads with Cloudinary
- [ ] Test ID card and payslip printing from the browser PDF viewer

### Automation
- [ ] Add automated tests (Vitest + Supertest backend, Vitest + RTL frontend, Playwright E2E)
- [ ] Set up CI (GitHub Actions) — see [docs/TESTING.md](docs/TESTING.md) for the suggested workflow

### Deployment
- [x] Provision MongoDB Atlas (M0 free shared cluster) for production
- [x] Deploy backend to Render with production env vars → https://hrms-9ypm.onrender.com
- [x] Deploy frontend to Vercel → https://hrms-frontend-five-ivory.vercel.app
- [x] Cross-origin auth (cookies + CORS) verified for Vercel ↔ Render
- [ ] Post-deploy checklist (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

## 🗺️ Future Improvements

- Email notifications on leave status changes and payroll release
- Document OCR / resume parsing on employee creation
- CSV/Excel import-export for employees and attendance
- Advanced permissions (department-scoped admins)
- Two-factor authentication
- Payslip email delivery in addition to download
- Overtime tracking and approval workflows

## 🧑‍💻 Contributing & License

Private project — built for learning and production demonstration.
# hrms
