import bcrypt from 'bcryptjs';
import type { ClientSession } from 'mongoose';
import { AuthMeResponse, Employee, LoginResponse } from '@hrms/shared';
import { env } from '../config/env';
import {
  Employee as EmployeeModel,
  LeaveBalance,
  PasswordResetToken,
  RefreshToken,
  SystemSetting,
  User,
} from '../models';
import { ApiError } from '../lib/errors';
import {
  generateRefreshToken,
  generateResetToken,
  hashRefreshToken,
  signAccessToken,
} from '../lib/tokens';
import { oid, toPlain, withTransaction } from '../lib/db';
import { mailer } from './mailer.service';
import { logActivity } from './activity.service';
import { encryptPassword, recoverPassword } from '../lib/password-cipher';
import { DEFAULT_PASSWORD } from '@hrms/shared';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function serializeAuthUser(user: Record<string, unknown> & {
  id: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  passwordCipher?: string | null;
  employee: unknown | null;
}): AuthMeResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role as never,
      status: user.status as never,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    },
    employee: user.employee
      ? ({
          ...serializeEmployee(user.employee),
          credentialPassword: recoverPassword(user.passwordCipher) ?? DEFAULT_PASSWORD,
        } as never)
      : null,
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
  const record = toPlain<EmployeeRecord>(employee);
  return {
    ...(record as unknown as Employee),
    dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth).toISOString() : null,
    joiningDate: new Date(record.joiningDate).toISOString(),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
    department: record.department
      ? {
          ...(record.department as Record<string, unknown>),
          createdAt: new Date((record.department as { createdAt: Date }).createdAt).toISOString(),
          updatedAt: new Date((record.department as { updatedAt: Date }).updatedAt).toISOString(),
        }
      : null,
    salaryStructure: record.salaryStructure
      ? {
          ...(record.salaryStructure as Record<string, unknown>),
          createdAt: new Date((record.salaryStructure as { createdAt: Date }).createdAt).toISOString(),
          updatedAt: new Date((record.salaryStructure as { updatedAt: Date }).updatedAt).toISOString(),
        }
      : null,
  } as Employee;
}

async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRefreshToken();
  await RefreshToken.create({
    userId: oid(userId),
    tokenHash: hashRefreshToken(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return rawToken;
}

async function revokeToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await RefreshToken.updateMany(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { revokedAt: new Date() },
  );
}

export async function login(email: string, password: string): Promise<LoginResponse & { refreshToken: string }> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is disabled. Contact your administrator.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  const employee = await EmployeeModel.findOne({ userId: user._id });

  await logActivity({
    userId: user.id,
    actorName: user.email,
    type: 'AUTH',
    message: 'Signed in',
  });

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    ...serializeAuthUser({ ...(toPlain(user) as Record<string, unknown>), employee } as never),
  };
}

export async function refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  if (!rawToken) throw ApiError.unauthorized('No refresh token provided');

  const tokenRecord = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) }).populate(
    'user',
    'email role status',
  );

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired, please sign in again');
  }
  const tokenUser = tokenRecord.user;
  if (!tokenUser) throw ApiError.unauthorized('Session expired, please sign in again');
  if (tokenUser.status !== 'ACTIVE') throw ApiError.forbidden('Account is disabled');

  await RefreshToken.updateOne({ _id: tokenRecord._id }, { revokedAt: new Date() });

  const accessToken = signAccessToken(
    tokenUser.id!,
    tokenUser.email,
    tokenUser.role,
  );
  const refreshToken = await issueRefreshToken(tokenUser.id!);

  return { accessToken, refreshToken };
}

export async function logout(rawToken: string): Promise<void> {
  await revokeToken(rawToken);
}

export async function requestPasswordReset(email: string): Promise<{ devLink?: string }> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return {};

  const token = generateResetToken();
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
  try {
    await mailer.sendPasswordReset(user.email, resetLink);
  } catch (error) {
    console.error(`[mailer] Failed to send password reset to ${user.email}`, error);
  }

  return env.smtp.host || !env.isProduction ? { devLink: resetLink } : {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenRecord = await PasswordResetToken.findOne({ tokenHash: hashRefreshToken(token) });
  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const passwordCipher = encryptPassword(newPassword);
  await withTransaction(async (session) => {
    await PasswordResetToken.updateOne({ _id: tokenRecord._id }, { usedAt: new Date() }, { session });
    await User.updateOne({ _id: tokenRecord.userId }, { passwordHash, passwordCipher }, { session });
    await RefreshToken.updateMany({ userId: tokenRecord.userId }, { revokedAt: new Date() }, { session });
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(oid(userId));
  if (!user) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const passwordCipher = encryptPassword(newPassword);
  await withTransaction(async (session) => {
    await User.updateOne({ _id: user._id }, { passwordHash, passwordCipher }, { session });
    await RefreshToken.updateMany({ userId: user._id }, { revokedAt: new Date() }, { session });
  });
}

export async function getAuthUser(userId: string): Promise<AuthMeResponse> {
  const user = await User.findById(oid(userId));
  if (!user) throw ApiError.notFound('User not found');

  const employee = await EmployeeModel.findOne({ userId: user._id }).populate([
    { path: 'department' },
    { path: 'salaryStructure' },
  ]);

  return serializeAuthUser({ ...(toPlain(user) as Record<string, unknown>), employee } as never);
}

export async function ensureLeaveBalances(employeeId: string, year: number, session?: ClientSession): Promise<void> {
  const settings = await getLeaveQuotas();
  const query = LeaveBalance.find({ employeeId: oid(employeeId), year });
  if (session) query.session(session);
  const existing = await query;
  const existingTypes = new Set(existing.map((b) => b.leaveType));

  const create = Object.entries(settings)
    .filter(([type]) => !existingTypes.has(type as never))
    .map(([type, total]) => ({
      employeeId: oid(employeeId),
      year,
      leaveType: type as never,
      total,
    }));

  if (create.length > 0) {
    await LeaveBalance.insertMany(create, session ? { session } : {});
  }
}

export async function getLeaveQuotas(): Promise<Record<string, number>> {
  const raw = await SystemSetting.find({
    key: { $in: ['annualLeaveQuota', 'sickLeaveQuota', 'casualLeaveQuota'] },
  });
  const map: Record<string, number> = { ANNUAL: 15, SICK: 10, CASUAL: 5, UNPAID: 0 };
  for (const setting of raw) {
    if (setting.key === 'annualLeaveQuota') map.ANNUAL = parseInt(setting.value ?? '15', 10) || 15;
    if (setting.key === 'sickLeaveQuota') map.SICK = parseInt(setting.value ?? '10', 10) || 10;
    if (setting.key === 'casualLeaveQuota') map.CASUAL = parseInt(setting.value ?? '5', 10) || 5;
  }
  return map;
}