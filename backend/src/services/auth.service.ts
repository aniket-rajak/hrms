import bcrypt from 'bcryptjs';
import { AuthMeResponse, Employee, LoginResponse } from '@hrms/shared';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import {
  generateRefreshToken,
  generateResetToken,
  hashRefreshToken,
  signAccessToken,
} from '../lib/tokens';
import { addDays } from '../utils/dates';
import { mailer } from './mailer.service';
import { logActivity } from './activity.service';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function serializeAuthUser(user: {
  id: number;
  email: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee: unknown | null;
}): AuthMeResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role as never,
      status: user.status as never,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    employee: user.employee ? (serializeEmployee(user.employee) as never) : null,
  };
}

type EmployeeRecord = {
  [key: string]: unknown;
  dateOfBirth: Date | null;
  joiningDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

function serializeEmployee(employee: unknown): Employee {
  const record = employee as EmployeeRecord;
  return {
    ...(record as unknown as Employee),
    dateOfBirth: record.dateOfBirth ? record.dateOfBirth.toISOString() : null,
    joiningDate: record.joiningDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    department: record.department
      ? {
          ...(record.department as Record<string, unknown>),
          createdAt: (record.department as { createdAt: Date }).createdAt.toISOString(),
          updatedAt: (record.department as { updatedAt: Date }).updatedAt.toISOString(),
        }
      : null,
    salaryStructure: record.salaryStructure
      ? {
          ...(record.salaryStructure as Record<string, unknown>),
          createdAt: (record.salaryStructure as { createdAt: Date }).createdAt.toISOString(),
          updatedAt: (record.salaryStructure as { updatedAt: Date }).updatedAt.toISOString(),
        }
      : null,
  } as Employee;
}

async function issueRefreshToken(userId: number): Promise<string> {
  const rawToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return rawToken;
}

async function revokeToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function login(email: string, password: string): Promise<LoginResponse & { refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { employee: true },
  });
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is disabled. Contact your administrator.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity({
    userId: user.id,
    actorName: user.email,
    type: 'AUTH',
    message: 'Signed in',
  });

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = await issueRefreshToken(user.id);

  return { accessToken, refreshToken, ...serializeAuthUser(user) };
}

export async function refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  if (!rawToken) throw ApiError.unauthorized('No refresh token provided');

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    include: { user: { select: { id: true, email: true, role: true, status: true } } },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired, please sign in again');
  }
  if (tokenRecord.user.status !== 'ACTIVE') throw ApiError.forbidden('Account is disabled');

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = signAccessToken(
    tokenRecord.user.id,
    tokenRecord.user.email,
    tokenRecord.user.role,
  );
  const refreshToken = await issueRefreshToken(tokenRecord.user.id);

  return { accessToken, refreshToken };
}

export async function logout(rawToken: string): Promise<void> {
  await revokeToken(rawToken);
}

export async function requestPasswordReset(email: string): Promise<{ devLink?: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return {};

  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
  await mailer.sendPasswordReset(user.email, resetLink);

  return env.smtp.host || !env.isProduction ? { devLink: resetLink } : {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
  });
  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: tokenRecord.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: tokenRecord.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: tokenRecord.userId }, data: { revokedAt: new Date() } }),
  ]);
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
  ]);
}

export async function getAuthUser(userId: number): Promise<AuthMeResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: { department: true, salaryStructure: true },
      },
    },
  });
  if (!user) throw ApiError.notFound('User not found');

  return serializeAuthUser(user);
}

export async function ensureLeaveBalances(employeeId: number, year: number): Promise<void> {
  const settings = await getLeaveQuotas();
  const existing = await prisma.leaveBalance.findMany({ where: { employeeId, year } });
  const existingTypes = new Set(existing.map((b) => b.leaveType));

  const create = Object.entries(settings)
    .filter(([type]) => !existingTypes.has(type as never))
    .map(([type, total]) =>
      prisma.leaveBalance.create({
        data: { employeeId, year, leaveType: type as never, total },
      }),
    );

  await prisma.$transaction(create);
}

export async function getLeaveQuotas(): Promise<Record<string, number>> {
  const raw = await prisma.systemSetting.findMany({
    where: { key: { in: ['annualLeaveQuota', 'sickLeaveQuota', 'casualLeaveQuota'] } },
  });
  const map: Record<string, number> = { ANNUAL: 15, SICK: 10, CASUAL: 5, UNPAID: 0 };
  for (const setting of raw) {
    if (setting.key === 'annualLeaveQuota') map.ANNUAL = parseInt(setting.value ?? '15', 10) || 15;
    if (setting.key === 'sickLeaveQuota') map.SICK = parseInt(setting.value ?? '10', 10) || 10;
    if (setting.key === 'casualLeaveQuota') map.CASUAL = parseInt(setting.value ?? '5', 10) || 5;
  }
  return map;
}
