import { LeaveApplyInput, LeaveReviewInput, LeaveType, Paginated } from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import { countDaysInclusive, currentYear, endOfDay, startOfDay } from '../utils/dates';
import { logActivity } from './activity.service';
import { getLeaveQuotas } from './auth.service';

const employeePick = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    employeeCode: true,
    profileImageUrl: true,
  },
} as const;

function serializeLeave(leave: Record<string, unknown>) {
  const employee = leave.employee as Record<string, unknown> | null | undefined;
  const reviewedBy = leave.reviewedBy as Record<string, unknown> | null | undefined;
  return {
    id: leave.id as number,
    employeeId: leave.employeeId as number,
    leaveType: leave.leaveType as LeaveType,
    startDate: (leave.startDate as Date).toISOString(),
    endDate: (leave.endDate as Date).toISOString(),
    days: leave.days as number,
    reason: leave.reason as string,
    status: leave.status as string,
    reviewNote: (leave.reviewNote as string | null) ?? null,
    reviewedById: (leave.reviewedById as number | null) ?? null,
    reviewedAt: leave.reviewedAt ? (leave.reviewedAt as Date).toISOString() : null,
    createdAt: (leave.createdAt as Date).toISOString(),
    updatedAt: (leave.updatedAt as Date).toISOString(),
    employee: employee
      ? {
          id: employee.id as number,
          firstName: employee.firstName as string,
          lastName: employee.lastName as string,
          employeeCode: employee.employeeCode as string,
          profileImageUrl: (employee.profileImageUrl as string | null) ?? null,
        }
      : null,
    reviewedByName: reviewedBy ? (reviewedBy.email as string) : null,
  };
}

export async function applyLeave(employeeId: number, data: LeaveApplyInput, actorName: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw ApiError.notFound('Employee not found');

  const startDate = startOfDay(data.startDate);
  const endDate = startOfDay(data.endDate);
  const days = countDaysInclusive(startDate, endDate);

  if (data.leaveType !== 'UNPAID') {
    const year = startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year_leaveType: { employeeId, year, leaveType: data.leaveType } },
    });
    if (!balance) throw ApiError.badRequest('Leave balance not found for this year. Contact admin.');
    const remaining = balance.total - balance.used;
    if (days > remaining) {
      throw ApiError.badRequest(
        `Insufficient balance. You have ${remaining} day(s) of ${data.leaveType.toLowerCase()} leave left.`,
      );
    }
  }

  const leave = await prisma.leave.create({
    data: {
      employeeId,
      leaveType: data.leaveType,
      startDate,
      endDate,
      days,
      reason: data.reason,
    },
    include: { employee: employeePick },
  });

  await logActivity({
    actorName,
    type: 'LEAVE',
    message: `Applied for ${days} day(s) of ${data.leaveType.toLowerCase()} leave (${startOfDay(startDate).toISOString().slice(0, 10)} to ${endOfDay(endDate).toISOString().slice(0, 10)})`,
  });

  return serializeLeave(leave as never);
}

export async function listMine(employeeId: number, params: PaginationParams & { status?: string }) {
  const where: Record<string, unknown> = { employeeId };
  if (params.status) where.status = params.status;

  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.leave.count({ where }),
  ]);
  return paginated(leaves.map((l) => serializeLeave(l as never)), total, params);
}

export async function listAll(params: PaginationParams & { status?: string; search?: string }) {
  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    const term = params.search.trim();
    where.employee = {
      OR: [
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { employeeCode: { contains: term } },
      ],
    };
  }

  const [leaves, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      include: { employee: employeePick },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.leave.count({ where }),
  ]);
  return paginated(leaves.map((l) => serializeLeave(l as never)), total, params);
}

export async function reviewLeave(
  id: number,
  action: 'APPROVE' | 'REJECT',
  reviewer: { id: number; email: string },
  note?: string | null,
) {
  const leave = await prisma.leave.findUnique({ where: { id }, include: { employee: true } });
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'PENDING') throw ApiError.conflict('This request has already been reviewed');

  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  await prisma.$transaction(async (tx) => {
    await tx.leave.update({
      where: { id },
      data: { status, reviewNote: note || null, reviewedById: reviewer.id, reviewedAt: new Date() },
    });

    if (action === 'APPROVE' && leave.leaveType !== 'UNPAID') {
      const year = leave.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_year_leaveType: {
            employeeId: leave.employeeId,
            year,
            leaveType: leave.leaveType,
          },
        },
      });
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: balance.used + leave.days },
        });
      }
      if (leave.startDate <= startOfDay(new Date()) && leave.endDate >= startOfDay(new Date())) {
        await tx.employee.update({
          where: { id: leave.employeeId },
          data: { status: 'ON_LEAVE' },
        });
      }
    }
  });

  const employee = leave.employee;
  await logActivity({
    userId: reviewer.id,
    actorName: reviewer.email,
    type: 'LEAVE',
    message: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${leave.days} day(s) ${leave.leaveType.toLowerCase()} leave for ${employee.firstName} ${employee.lastName}`,
  });

  return { id, status };
}

export async function getBalance(employeeId: number, year = currentYear()) {
  await ensureBalances(employeeId, year);
  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year },
    orderBy: { leaveType: 'asc' },
  });
  return balances.map((b) => ({
    year: b.year,
    leaveType: b.leaveType,
    total: b.total,
    used: b.used,
    remaining: Math.max(0, b.total - b.used),
  }));
}

async function ensureBalances(employeeId: number, year: number): Promise<void> {
  const existing = await prisma.leaveBalance.findMany({ where: { employeeId, year } });
  if (existing.length === 4) return;

  const quotas = await getLeaveQuotas();
  for (const [type, total] of Object.entries(quotas)) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year_leaveType: { employeeId, year, leaveType: type as LeaveType },
      },
      update: {},
      create: { employeeId, year, leaveType: type as LeaveType, total },
    });
  }
}

export async function onLeaveTodayCount(): Promise<number> {
  const today = startOfDay(new Date());
  const leaves = await prisma.leave.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { employeeId: true },
  });
  const ids = [...new Set(leaves.map((l) => l.employeeId))];
  return ids.length;
}
