import { LeaveApplyInput, LeaveReviewInput, LeaveType, Paginated } from '@hrms/shared';
import { Employee, Leave, LeaveBalance } from '../models';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import { countDaysInclusive, currentYear, endOfDay, startOfDay } from '../utils/dates';
import { logActivity } from './activity.service';
import { getLeaveQuotas } from './auth.service';
import { oid, toPlain, withTransaction } from '../lib/db';
import { ciRegex } from '../utils/query';

const employeePickPopulate = { path: 'employee', select: 'firstName lastName employeeCode profileImageUrl' };

function serializeLeave(leave: unknown) {
  const l = toPlain<Record<string, unknown>>(leave);
  const employee = l.employee as Record<string, unknown> | null | undefined;
  const reviewedBy = l.reviewedBy as Record<string, unknown> | null | undefined;
  return {
    id: l.id as string,
    employeeId: l.employeeId as string,
    leaveType: l.leaveType as LeaveType,
    startDate: new Date(l.startDate as Date).toISOString(),
    endDate: new Date(l.endDate as Date).toISOString(),
    days: l.days as number,
    reason: l.reason as string,
    status: l.status as string,
    reviewNote: (l.reviewNote as string | null) ?? null,
    reviewedById: (l.reviewedById as string | null) ?? null,
    reviewedAt: l.reviewedAt ? new Date(l.reviewedAt as Date).toISOString() : null,
    createdAt: new Date(l.createdAt as Date).toISOString(),
    updatedAt: new Date(l.updatedAt as Date).toISOString(),
    employee: employee
      ? {
          id: employee.id as string,
          firstName: employee.firstName as string,
          lastName: employee.lastName as string,
          employeeCode: employee.employeeCode as string,
          profileImageUrl: (employee.profileImageUrl as string | null) ?? null,
        }
      : null,
    reviewedByName: reviewedBy ? (reviewedBy.email as string) : null,
  };
}

export async function applyLeave(employeeId: string, data: LeaveApplyInput, actorName: string) {
  const employee = await Employee.findById(oid(employeeId));
  if (!employee) throw ApiError.notFound('Employee not found');

  const startDate = startOfDay(data.startDate);
  const endDate = startOfDay(data.endDate);
  const days = countDaysInclusive(startDate, endDate);

  if (data.leaveType !== 'UNPAID') {
    const year = startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
      employeeId: oid(employeeId),
      year,
      leaveType: data.leaveType,
    });
    if (!balance) throw ApiError.badRequest('Leave balance not found for this year. Contact admin.');
    const remaining = balance.total - balance.used;
    if (days > remaining) {
      throw ApiError.badRequest(
        `Insufficient balance. You have ${remaining} day(s) of ${data.leaveType.toLowerCase()} leave left.`,
      );
    }
  }

  const leave = await Leave.create({
    employeeId: oid(employeeId),
    leaveType: data.leaveType,
    startDate,
    endDate,
    days,
    reason: data.reason,
  });

  const populated = await Leave.findById(leave._id).populate(employeePickPopulate);

  await logActivity({
    actorName,
    type: 'LEAVE',
    message: `Applied for ${days} day(s) of ${data.leaveType.toLowerCase()} leave (${startOfDay(startDate).toISOString().slice(0, 10)} to ${endOfDay(endDate).toISOString().slice(0, 10)})`,
  });

  return serializeLeave(populated);
}

export async function listMine(employeeId: string, params: PaginationParams & { status?: string }) {
  const where: Record<string, unknown> = { employeeId: oid(employeeId) };
  if (params.status) where.status = params.status;

  const [leaves, total] = await Promise.all([
    Leave.find(where)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize),
    Leave.countDocuments(where),
  ]);
  return paginated(leaves.map((l) => serializeLeave(l)), total, params);
}

export async function listAll(params: PaginationParams & { status?: string; search?: string }) {
  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    const term = params.search.trim();
    const matches = await Employee.find({
      $or: [
        { firstName: ciRegex(term) },
        { lastName: ciRegex(term) },
        { employeeCode: ciRegex(term) },
      ],
    }).select('_id');
    where.employeeId = { $in: matches.map((m) => m._id) };
  }

  const [leaves, total] = await Promise.all([
    Leave.find(where)
      .populate(employeePickPopulate)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize),
    Leave.countDocuments(where),
  ]);
  return paginated(leaves.map((l) => serializeLeave(l)), total, params);
}

export async function reviewLeave(
  id: string,
  action: 'APPROVE' | 'REJECT',
  reviewer: { id: string; email: string },
  note?: string | null,
) {
  const leave = await Leave.findById(oid(id)).populate('employee');
  if (!leave) throw ApiError.notFound('Leave request not found');
  if (leave.status !== 'PENDING') throw ApiError.conflict('This request has already been reviewed');

  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  await withTransaction(async (session) => {
    await Leave.updateOne(
      { _id: leave._id },
      { status, reviewNote: note || null, reviewedById: oid(reviewer.id), reviewedAt: new Date() },
      { session },
    );

    if (action === 'APPROVE' && leave.leaveType !== 'UNPAID') {
      const year = leave.startDate.getFullYear();
      const balance = await LeaveBalance.findOne({
        employeeId: leave.employeeId,
        year,
        leaveType: leave.leaveType,
      }).session(session);
      if (balance) {
        await LeaveBalance.updateOne({ _id: balance._id }, { $inc: { used: leave.days } }, { session });
      }
      if (leave.startDate <= startOfDay(new Date()) && leave.endDate >= startOfDay(new Date())) {
        await Employee.updateOne(
          { _id: leave.employeeId },
          { status: 'ON_LEAVE' },
          { session },
        );
      }
    }
  });

  const employee = leave.employee as { firstName: string; lastName: string } | null;
  await logActivity({
    userId: reviewer.id,
    actorName: reviewer.email,
    type: 'LEAVE',
    message: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${leave.days} day(s) ${leave.leaveType.toLowerCase()} leave for ${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`,
  });

  return { id, status };
}

export async function getBalance(employeeId: string, year = currentYear()) {
  await ensureBalances(employeeId, year);
  const balances = await LeaveBalance.find({ employeeId: oid(employeeId), year }).sort({ leaveType: 1 });
  return balances.map((b) => ({
    year: b.year,
    leaveType: b.leaveType,
    total: b.total,
    used: b.used,
    remaining: Math.max(0, b.total - b.used),
  }));
}

async function ensureBalances(employeeId: string, year: number): Promise<void> {
  const existing = await LeaveBalance.find({ employeeId: oid(employeeId), year });
  if (existing.length === 4) return;

  const quotas = await getLeaveQuotas();
  for (const [type, total] of Object.entries(quotas)) {
    await LeaveBalance.updateOne(
      { employeeId: oid(employeeId), year, leaveType: type as LeaveType },
      { $setOnInsert: { total } },
      { upsert: true },
    );
  }
}

export async function onLeaveTodayCount(): Promise<number> {
  const today = startOfDay(new Date());
  const leaves = await Leave.find({
    status: 'APPROVED',
    startDate: { $lte: today },
    endDate: { $gte: today },
  }).select('employeeId');
  const ids = new Set(leaves.map((l) => String(l.employeeId)));
  return ids.size;
}