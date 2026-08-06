# Installation Guide

## Prerequisites

- Node.js **20.9+** (developed on Node 24)
- npm 10+
- MySQL **8.x** (local or cloud — Railway, Aiven, PlanetScale-style compat is fine)
- Git

## 1. Clone & install

```bash
git clone <your-repo-url> hr-management-system
cd hr-management-system
npm install
```

This installs all three workspaces (`shared`, `backend`, `frontend`) from the root `package-lock.json`.

## 2. Build the shared package

The frontend and backend import types/validations from `@hrms/shared` via its compiled `dist/`.

```bash
npm run build --workspace @hrms/shared
```

> Run this once now, and again whenever you change anything in `shared/src/`.

## 3. Configure environment variables

**Backend** — copy and fill in:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma MySQL connection string, e.g. `mysql://root:password@localhost:3306/hrms` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Long random strings (`openssl rand -hex 32`) |
| `CLOUDINARY_*` | From your Cloudinary dashboard (needed for uploads) |
| `SMTP_*` | Your mail provider (Gmail app password, Mailgun, Brevo…). Leave empty in dev — reset links are logged to the console instead |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credentials created by the seed |

**Frontend** — copy and fill in:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | e.g. `http://localhost:5000/api` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |

## 4. Create the database

```bash
cd backend
npx prisma db push
```

This creates all tables from `backend/prisma/schema.prisma`. A generated DDL snapshot also lives at `database/schema.sql`.

## 5. Seed demo data

```bash
npm run seed --workspace backend
```

Creates the admin user plus: 5 departments, 12 employees (some with salary structures, attendance history, leaves, holidays).

## 6. Run locally

```bash
npm run dev --workspace backend    # API on http://localhost:5000
npm run dev --workspace frontend   # app on http://localhost:3000
```

Open http://localhost:3000 and sign in with the seeded admin (`admin@hrms.com` / `Admin@123` by default).

## Common commands

```bash
npm run build --workspace backend    # type-check + compile API
npm run build --workspace frontend   # type-check + build Next.js app
npm run lint --workspace frontend    # ESLint
npm run seed --workspace backend     # reset + reseed database
```

## Troubleshooting

- **`Cannot find module '@hrms/shared'`** → rebuild shared: `npm run build --workspace @hrms/shared`.
- **`P2002` seed error** → run the seed after a fresh `prisma db push`, or use `npx prisma migrate reset` to wipe and reseed.
- **401 on every API call** → the backend `FRONTEND_URL` must match the frontend origin (CORS) and refresh cookie domain rules apply in production (same-site).
- **Password reset email not arriving** → SMTP vars empty; check the backend console for the `devLink`.
