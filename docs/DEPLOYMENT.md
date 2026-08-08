# Deployment Guide

Free-tier friendly architecture:

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Next.js 16 static + serverless |
| Backend | Render (free web service) | Express on Node |
| Database | MongoDB Atlas (M0 shared) | Free tier available |
| Uploads | Cloudinary | Free tier (25k transformations) |

---

## 1. Database (MongoDB Atlas)

1. Create a free **M0 shared-cluster** in MongoDB Atlas (MongoDB 6.4+, ~512 MB free).
2. Copy the connection string in `mongodb+srv://` format:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hrms?retryWrites=true&w=majority`
3. No schema migration is required — Mongoose creates collections and indexes from the model definitions on startup. Just run the seed once to load demo data:
   ```bash
   cd backend
   npm run seed  # optional demo data
   ```

Alternative hosts: any MongoDB provider (Railway, DigitalOcean, self-hosted `mongod`).

## 2. Backend (Render)

Live deployment: **https://hrms-9ypm.onrender.com** (health check `/health`).

1. Create a new **Web Service** pointing at your repo.
2. **Root directory:** `backend`
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start` (runs `node dist/index.js`)
5. **Environment variables:** copy from `backend/.env.example`:
   - `NODE_ENV=production`
   - `DATABASE_URL` (MongoDB Atlas connection string)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (long random strings)
   - `FRONTEND_URL` → your Vercel URL — **this is the single source of truth**: it is used for password-reset links AND is automatically added to the CORS allow-list (the local frontend `http://localhost:3000` is always allowed too, so local dev keeps working without extra config)
   - `CORS_ORIGINS` → *optional* extra comma-separated origins on top of `FRONTEND_URL` (e.g. staged preview domains)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `EMAIL_PROVIDER`, `BREVO_API_KEY`, `EMAIL_FROM` (Brevo HTTP API — required on Render free, which blocks SMTP)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (SMTP fallback)

> **Important:** the `shared` workspace must be built before the backend. Add a root-level build or, simplest: change the backend build command to
> `npm --prefix .. run build --workspace @hrms/shared && npm install && npm run build`
> Render runs from the `backend` root, so use the monorepo approach: deploy the **whole repo** (root directory `/`) with build command
> `npm install && npm run build --workspace @hrms/shared && npm run build --workspace backend` and start command
> `npm start --workspace backend`.

> **Note (already resolved):** the committed repo keeps `typescript` + all `@types/*` in `dependencies` (not `devDependencies`) so the backend also builds when Render installs with `NODE_ENV=production` (which prunes dev deps).

## 3. Frontend (Vercel)

1. Import the repo; Vercel auto-detects Next.js.
2. **Root directory:** `frontend` — or import at repo root with the detected config (the repo root `package.json` is an npm-workspaces manifest; Vercel works best with root directory `frontend`).
3. Install command: `npm install` (workspaces are hoisted to the repo root; keep the default).
4. Build command: `npm run build` — the `frontend/package.json` already has `"prebuild": "npm run build --workspace @hrms/shared"` so the shared workspace is built automatically inside the workspace context.
5. Environment variables (must be set for the production build):
   - `NEXT_PUBLIC_API_URL` → `https://hrms-9ypm.onrender.com/api` (production backend)
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` → your cloud name (fallback for image URLs; uploads are signed by the backend `/uploads/signature`)

### Local dev vs production (no configuration overlap)

- **Local:** `backend/.env` keeps `FRONTEND_URL=http://localhost:3000` and `frontend/.env` keeps `NEXT_PUBLIC_API_URL=http://localhost:5000/api` — works out of the box.
- **Production:** set `NEXT_PUBLIC_API_URL=https://hrms-9ypm.onrender.com/api` in **Vercel** env vars and `FRONTEND_URL=https://<app>.vercel.app` in **Render** env vars. The backend derives its CORS allow-list from `FRONTEND_URL`, and `NODE_ENV=production` flips the refresh-token cookie to `Secure; SameSite=None`, which is required for cross-origin (Vercel ↔ Render) usage.

### Vercel + Render cookie caveat

The refresh token is an httpOnly cookie. With frontend and backend on different origins it must be `SameSite=None; Secure` — the backend sets `secure: true` automatically when `NODE_ENV=production`, and the `hrms_refresh` cookie is sent with `credentials: 'include'` from the browser. Make sure requests from the frontend include cookies (the app's axios client is already configured to do so).

## 4. Cloudinary

1. Create a free account at cloudinary.com.
2. Copy `Cloud name`, `API key`, `API secret` into the backend env vars.
3. The app requests a signed upload URL (`/uploads/signature`) and uploads files straight from the browser; no server-side storage needed.

## 5. Post-deploy checklist

- [ ] `/health` returns `ok`
- [ ] Login works and session survives a page reload (refresh cookie)
- [ ] Profile picture and document uploads work
- [ ] Payslip PDF downloads
- [ ] Forgot password email arrives (check SMTP provider's spam folder)
- [ ] `FRONTEND_URL` matches the Vercel domain exactly

## Performance notes

- Render free tier sleeps after 15 min of inactivity; the first request after sleep takes a few seconds.
- Seed data is optional in production — remove the seed step if you want a clean start.
- Rate limits are tuned for dev; increase `authRateLimiter` limits under heavy use.
