import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? '';
}

const corsOrigins = [
  ...new Set([
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    ...(process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ]),
];

const vercelOriginPattern = /^https:\/\/([a-z0-9-]+\.)+vercel\.app$/;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (corsOrigins.includes(origin)) return true;
  if (origin === 'http://localhost:3000') return true;
  if (process.env.NODE_ENV === 'production' && vercelOriginPattern.test(origin)) return true;
  return false;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '5000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'hrms',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'HRMS <no-reply@example.com>',
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER ?? 'auto') as 'auto' | 'brevo' | 'smtp',
    brevoApiKey: process.env.BREVO_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? 'HRMS <no-reply@example.com>',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@hrms.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
  },
  corsOrigins,
} as const;
