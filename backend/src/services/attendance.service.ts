import {
  AttendanceRecordDto,
  AttendanceSummary,
  HALF_DAY_HOURS,
  MIN_WORKING_HOURS_PER_DAY,
} from '@hrms/shared';
import { Attendance, Employee } from '../models';
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
import { oid, toPlain } from '../lib/db';
import { ciRegex } from '../utils/query';

function serializeAttendance(record: unknown): AttendanceRecordDto {
  const rec = toPlain<Record<string, unknown>>(record);
  const employee = rec.employee as
    | { id: string; firstName: string; lastName: string; employeeCode: string; profileImageUrl: string | null }
    | undefined;
  return {
    id: rec.id as string,
    employeeId: rec.employeeId as string,
    date: new Date(rec.date as Date).toISOString(),
    checkIn: rec.checkIn ? new Date(rec.checkIn as Date).toISOString() : null,
    checkOut: rec.checkOut ? new Date(rec.checkOut as Date).toISOString() : null,
    status: rec.status as AttendanceRecordDto['status'],
    workingHours: rec.workingHours as number | null,
    note: (rec.note as string | null) ?? null,
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

export async function checkIn(employeeId: string, note: string | null | undefined, actorName: string) {
  const today = startOfDay(new Date());
  const existing = await Attendance.findOne({ employeeId: oid(employeeId), date: today });
  if (existing?.checkIn) throw ApiError.conflict('You have already checked in today');
  if (existing?.checkOut) throw ApiError.conflict('Attendance already closed for today');

  const record = await Attendance.findOneAndUpdate(
    { employeeId: oid(employeeId), date: today },
    { $set: { checkIn: new Date(), status: 'PRESENT', note: note ?? null } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await logActivity({ actorName, type: 'ATTENDANCE', message: 'Checked in' });
  return serializeAttendance(record);
}

export async function checkOut(employeeId: string, actorName: string) {
  const today = startOfDay(new Date());
  const record = await Attendance.findOne({ employeeId: oid(employeeId), date: today });
  if (!record || !record.checkIn) throw ApiError.badRequest('You must check in before checking out');
  if (record.checkOut) throw ApiError.conflict('You have already checked out today');

  const checkOutTime = new Date();
  const workingHours = workingHoursBetween(record.checkIn, checkOutTime);
  const status = workingHours >= MIN_WORKING_HOURS_PER_DAY ? 'PRESENT' : 'HALF_DAY';

  const updated = await Attendance.findByIdAndUpdate(
    record._id,
    { checkOut: checkOutTime, workingHours, status },
    { new: true },
  );

  await logActivity({
    actorName,
    type: 'ATTENDANCE',
    message: `Checked out after ${workingHours} hours`,
  });
  return serializeAttendance(updated);
}

export async function getToday(employeeId: string): Promise<AttendanceRecordDto | null> {
  const record = await Attendance.findOne({ employeeId: oid(employeeId), date: startOfDay(new Date()) });
  return record ? serializeAttendance(record) : null;
}

export async function history(employeeId: string, params: PaginationParams & { month?: number; year?: number }) {
  const where: Record<string, unknown> = { employeeId: oid(employeeId) };
  if (params.month && params.year) {
    where.date = {
      $gte: startOfMonth(new Date(params.year, params.month - 1, 1)),
      $lte: endOfMonth(new Date(params.year, params.month - 1, 1)),
    };
  }
  const [records, total] = await Promise.all([
    Attendance.find(where)
      .sort({ date: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize),
    Attendance.countDocuments(where),
  ]);
  return paginated(records.map((r) => serializeAttendance(r)), total, params);
}

export async function monthly(employeeId: string, month: number, year: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(new Date(year, month - 1, 1));
  const records = await Attendance.find({
    employeeId: oid(employeeId),
    date: { $gte: start, $lte: end },
  }).sort({ date: 1 });

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
    records: records.map((r) => serializeAttendance(r)),
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
      $gte: startOfMonth(new Date(params.year, params.month - 1, 1)),
      $lte: endOfMonth(new Date(params.year, params.month - 1, 1)),
    };
  } else if (params.year) {
    where.date = {
      $gte: new Date(params.year, 0, 1),
      $lte: new Date(params.year, 11, 31, 23, 59, 59),
    };
  }
  if (params.status) where.status = params.status;
  if (params.search) {
    const term = params.search.trim();
    const matches = await Employee.find({
      $or: [
        { firstName: ciRegex(term) },
        { lastName: ciRegex(term) },
        { employeeCode: ciRegex(term) },
        { email: ciRegex(term) },
      ],
    }).select('_id');
    where.employeeId = { $in: matches.map((m) => m._id) };
  }

  const [records, total] = await Promise.all([
    Attendance.find(where)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeCode profileImageUrl',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ date: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize),
    Attendance.countDocuments(where),
  ]);

  return paginated(records.map((r) => serializeAttendance(r)), total, params);
}

export async function updateAttendance(id: string, data: {
  date?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string;
  note?: string | null;
}, actor: { id: string; email: string }) {
  const record = await Attendance.findById(oid(id)).populate('employee');
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
    const conflict = await Attendance.findOne({
      employeeId: record.employeeId,
      date: updateData.date as Date,
    });
    if (conflict) throw ApiError.conflict('Employee already has attendance on that date');
  }

  const updated = await Attendance.findByIdAndUpdate(oid(id), updateData, { new: true });
  const employee = record.employee as { firstName: string; lastName: string } | null;
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'ATTENDANCE',
    message: `Corrected attendance for ${employee?.firstName ?? ''} ${employee?.lastName ?? ''} on ${toDateOnly(record.date)}`,
  });
  return serializeAttendance(updated);
}

export async function todaySummary() {
  const today = startOfDay(new Date());
  const [present, onLeave, total] = await Promise.all([
    Attendance.countDocuments({ date: today, status: { $in: ['PRESENT', 'HALF_DAY'] } }),
    Employee.countDocuments({ status: 'ON_LEAVE' }),
    Employee.countDocuments({ status: 'ACTIVE' }),
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
    const counts = await Attendance.aggregate<{ _id: string; count: number }>([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
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