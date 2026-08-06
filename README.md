# 💼 HR Management System (HRMS)

A lightweight, modern, production-ready Human Resource Management System built with **Next.js**, **Express**, **MySQL**, **TypeScript**, and **Cloudinary**.

Essential HR functionality — no unnecessary complexity.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL + Prisma ORM |
| Auth | JWT (short-lived access + rotating refresh token) |
| Validation | Zod (shared between frontend and backend) |
| Forms | React Hook Form + Zod resolver |
| Data fetching | TanStack Query + Axios |
| Charts | Recharts |
| Animations | Framer Motion (minimal) |
| Storage | Cloudinary (free tier) |
| Email | Nodemailer / SMTP (forgot-password reset links) |
| PDF | pdfkit (salary slips, generated on the server) |

## 🗂️ Monorepo Structure

```
hr-management-system/
├── backend/          # Express + Prisma API
│   ├── prisma/       # schema.prisma, seed.ts
│   └── src/
│       ├── config/   # env, db, prisma client
│       ├── middleware/ # auth, requireRole, validate, errorHandler
│       ├── routes/   # module route definitions
│       ├── services/ # business logic (auth, employees, payroll, mail…)
│       ├── utils/    # helpers (jwt, password, pdf slip…)
│       └── app.ts, server.ts
├── shared/           # @hrms/shared — types, DTOs, Zod schemas, constants
├── frontend/         # Next.js app
│   └── src/
│       ├── app/      # routes (auth pages, dashboard pages)
│       ├── components/ # ui (shadcn), shared, layout, forms, dashboard
│       ├── hooks/    # TanStack Query hooks
│       ├── lib/      # api client, format utils, cloudinary upload
│       ├── providers/  # auth provider, query client, theme
│       ├── services/   # typed API callers
│       └── proxy.ts    # Next.js middleware (auth route guard)
└── database/schema.sql # generated DDL snapshot
```

## 👥 User Roles

**Admin** — full access: dashboard, employees, departments, attendance management, leave approvals, payroll generation, analytics, settings.

**Employee** — dashboard, profile, check in/out, attendance history, leave requests, salary slips, change password.

## ✨ Features

- **Auth** — login, JWT access token (15 min) + refresh token rotation (7-day httpOnly cookie), protected routes, role-based access, forgot/reset password with email links
- **Employees** — create/edit/deactivate, search, filter by department, pagination, profile pictures, document uploads, salary structures
- **Departments** — CRUD with employee counts
- **Attendance** — check in/out, working-hours calculation, monthly history, admin corrections
- **Leave** — annual/sick/casual/unpaid quotas, apply, approve/reject with balance checks
- **Payroll** — monthly generation with full-time pro-rated adjustment, mark paid, PDF salary slips
- **Analytics** — attendance trend, hiring trend, leave stats, department distribution, payroll summary, activity feed
- **Settings** — company profile, logo, holidays, password change
- **UX** — responsive (mobile-first with slide-over sidebar), dark/light mode, breadcrumbs, skeletons, toasts, empty/error states, confirm dialogs

## 🔒 Security

- bcrypt password hashing, default password force-reset on first login
- Refresh tokens stored hashed, rotated on every refresh, revoked on logout
- Helmet, CORS (frontend origin only), per-route rate limiting
- Zod validation on every endpoint; users can only access their own data
- Payroll PDFs require admin or the owner employee

## 📁 Environment Variables

See `backend/.env.example` (server, DATABASE_URL, JWT secrets, Cloudinary, SMTP, seed credentials) and `frontend/.env.example` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`).

## 🚀 Quick Start

```bash
npm install
npm run build --workspace @hrms/shared

# 1. Configure backend/.env and frontend/.env from the examples

# 2. Database
cd backend
npx prisma db push      # create tables
npm run seed            # admin user + demo data

# 3. Run
npm run dev --workspace backend   # API on :5000
npm run dev --workspace frontend  # app on :3000
```

Sign in with the seeded admin (default `admin@hrms.com` / `Admin@123`, overridable via `SEED_ADMIN_*`).

## 📄 Documentation

- [Installation](docs/INSTALLATION.md)
- [API Reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md) (Vercel · Render · Railway · Cloudinary)
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

Free-tier friendly: **Vercel** (frontend), **Render** (backend), **Railway/Aiven MySQL** (database), **Cloudinary** (uploads). Full guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
