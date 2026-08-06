import {
  AttendanceRecordDto,
  AttendanceSummary,
  HALF_DAY_HOURS,
  MIN_WORKING_HOURS_PER_DAY,
} from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import {
  endOfMonth,
  isSameDay,
  monthName,
  startOfDay,
  startOfMonth,
  toDateOnly,
  workingHoursBetween,
  endOfDay,
} from '../utils/dates';
import { logActivity } from './activity.service';

function serializeAttendance(record: Record<string, unknown>): AttendanceRecordDto {
  const employee = record.employee as
    | { id: number; firstName: string; lastName: string; employeeCode: string; profileImageUrl: string | null }
    | undefined;
  return {
    id: record.id as number,
    employeeId: record.employeeId as number,
    date: (record.date as Date).toISOString(),
    checkIn: record.checkIn ? (record.checkIn as Date).toISOString() : null,
    checkOut: record.checkOut ? (record.checkOut as Date).toISOString() : null,
    status: record.status as AttendanceRecordDto['status'],
    workingHours: record.workingHours as number | null,
    note: (record.note as string | null) ?? null,
    employee: employee
      ? {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          profileImageUrl: employee.profileImageUrl,
        }
      : null,
  };
}

export async function checkIn(employeeId: number, note: string | null | undefined, actorName: string) {
  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (existing?.checkIn) throw ApiError.conflict('You have already checked in today');
  if (existing?.checkOut) throw ApiError.conflict('Attendance already closed for today');

  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    update: { checkIn: new Date(), status: 'PRESENT', note: note ?? null },
    create: {
      employeeId,
      date: today,
      checkIn: new Date(),
      status: 'PRESENT',
      note: note ?? null,
    },
  });

  await logActivity({ actorName, type: 'ATTENDANCE', message: 'Checked in' });
  return serializeAttendance(record as never);
}

export async function checkOut(employeeId: number, actorName: string) {
  const today = startOfDay(new Date());
  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (!record || !record.checkIn) throw ApiError.badRequest('You must check in before checking out');
  if (record.checkOut) throw ApiError.conflict('You have already checked out today');

  const checkOutTime = new Date();
  const workingHours = workingHoursBetween(record.checkIn, checkOutTime);
  const status = workingHours >= MIN_WORKING_HOURS_PER_DAY ? 'PRESENT' : 'HALF_DAY';

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: { checkOut: checkOutTime, workingHours, status },
  });

  await logActivity({
    actorName,
    type: 'ATTENDANCE',
    message: `Checked out after ${workingHours} hours`,
  });
  return serializeAttendance(updated as never);
}

export async function getToday(employeeId: number): Promise<AttendanceRecordDto | null> {
  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay(new Date()) } },
  });
  return record ? serializeAttendance(record as never) : null;
}

export async function history(employeeId: number, params: PaginationParams & { month?: number; year?: number }) {
  const where: Record<string, unknown> = { employeeId };
  if (params.month && params.year) {
    where.date = {
      gte: startOfMonth(new Date(params.year, params.month - 1, 1)),
      lte: endOfMonth(new Date(params.year, params.month - 1, 1)),
    };
  }
  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.attendance.count({ where }),
  ]);
  return paginated(records.map((r) => serializeAttendance(r as never)), total, params);
}

export async function monthly(employeeId: number, month: number, year: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  const records = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  const summary: AttendanceSummary = {
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
    leave: records.filter((r) => r.status === 'LEAVE').length,
    totalHours: Math.round(records.reduce((sum, r) => sum + (r.workingHours ?? 0), 0) * 100) / 100,
    totalDays: records.length,
  };

  return {
    month,
    year,
    records: records.map((r) => serializeAttendance(r as never)),
    summary,
  };
}

export interface AdminListParams extends PaginationParams {
  search?: string;
  month?: number;
  year?: number;
  status?: string;
}

export async function listForAdmin(params: AdminListParams) {
  const where: Record<string, unknown> = {};
  if (params.month && params.year) {
    where.date = {
      gte: startOfMonth(new Date(params.year, params.month - 1, 1)),
      lte: endOfMonth(new Date(params.year, params.month - 1, 1)),
    };
  } else if (params.year) {
    where.date = {
      gte: new Date(params.year, 0, 1),
      lte: new Date(params.year, 11, 31, 23, 59, 59),
    };
  }
  if (params.status) where.status = params.status;
  if (params.search) {
    const term = params.search.trim();
    where.employee = {
      OR: [
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { employeeCode: { contains: term } },
        { email: { contains: term } },
      ],
    };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            profileImageUrl: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.attendance.count({ where }),
  ]);

  return paginated(records.map((r) => serializeAttendance(r as never)), total, params);
}

export async function updateAttendance(id: number, data: {
  date?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string;
  note?: string | null;
}, actor: { id: number; email: string }) {
  const record = await prisma.attendance.findUnique({ where: { id }, include: { employee: true } });
  if (!record) throw ApiError.notFound('Attendance record not found');

  const updateData: Record<string, unknown> = {
    date: data.date ? startOfDay(data.date) : undefined,
    checkIn: data.checkIn === undefined ? undefined : data.checkIn ? new Date(data.checkIn) : null,
    checkOut: data.checkOut === undefined ? undefined : data.checkOut ? new Date(data.checkOut) : null,
    status: data.status ?? undefined,
    note: data.note === undefined ? undefined : data.note || null,
  };

  const checkInTime = data.checkIn === undefined ? record.checkIn : data.checkIn ? new Date(data.checkIn) : null;
  const checkOutTime = data.checkOut === undefined ? record.checkOut : data.checkOut ? new Date(data.checkOut) : null;
  if (checkInTime && checkOutTime && checkOutTime > checkInTime) {
    updateData.workingHours = workingHoursBetween(checkInTime, checkOutTime);
  } else {
    updateData.workingHours = record.workingHours;
  }

  if (updateData.date && !isSameDay(updateData.date as Date, record.date)) {
    const conflict = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: record.employeeId, date: updateData.date as Date } },
    });
    if (conflict) throw ApiError.conflict('Employee already has attendance on that date');
  }

  const updated = await prisma.attendance.update({ where: { id }, data: updateData });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'ATTENDANCE',
    message: `Corrected attendance for ${record.employee.firstName} ${record.employee.lastName} on ${toDateOnly(record.date)}`,
  });
  return serializeAttendance(updated as never);
}

export async function todaySummary() {
  const today = startOfDay(new Date());
  const [present, onLeave, total] = await Promise.all([
    prisma.attendance.count({ where: { date: today, status: { in: ['PRESENT', 'HALF_DAY'] } } }),
    prisma.employee.count({ where: { status: 'ON_LEAVE' } }),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
  ]);
  return { present, onLeave, total };
}

export async function monthlyAttendanceTrend(months = 6) {
  const points: { month: string; present: number; absent: number; halfDay: number; leave: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const counts = await prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: start, lte: end } },
      _count: true,
    });
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
    points.push({
      month: monthName(date.getFullYear(), date.getMonth() + 1),
      present: byStatus.PRESENT ?? 0,
      absent: byStatus.ABSENT ?? 0,
      halfDay: byStatus.HALF_DAY ?? 0,
      leave: byStatus.LEAVE ?? 0,
    });
  }
  return points;
}
