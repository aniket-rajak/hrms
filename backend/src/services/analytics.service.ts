import { Attendance, Department, Employee, Leave, PayrollRecord } from '../models';
import {
  endOfMonth,
  startOfMonth,
  monthName,
  currentYear,
  currentMonth,
  startOfDay,
} from '../utils/dates';
import { serializeDecimal } from '../utils/serializers';
import { getRecentActivities } from './activity.service';

export async function summary() {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const year = currentYear();
  const month = currentMonth();

  const [
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    totalDepartments,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    payrollPaidThisMonth,
    payrollDraftThisMonth,
  ] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'ACTIVE' }),
    Employee.countDocuments({ status: 'ON_LEAVE' }),
    Department.countDocuments(),
    Leave.countDocuments({ status: 'PENDING' }),
    Leave.countDocuments({ status: 'APPROVED' }),
    Leave.countDocuments({ status: 'REJECTED' }),
    PayrollRecord.countDocuments({ month, year, status: 'PAID' }),
    PayrollRecord.countDocuments({ month, year, status: 'DRAFT' }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    totalDepartments,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    payrollPaidThisMonth,
    payrollDraftThisMonth,
  };
}

export async function attendanceChart(months = 6) {
  const points: { month: string; present: number; absent: number; halfDay: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const counts = await Attendance.aggregate<{ _id: string; count: number }>([
      { $match: { date: { $gte: startOfMonth(date), $lte: endOfMonth(date) } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    points.push({
      month: monthName(date.getFullYear(), date.getMonth() + 1),
      present: byStatus.PRESENT ?? 0,
      absent: byStatus.ABSENT ?? 0,
      halfDay: byStatus.HALF_DAY ?? 0,
    });
  }
  return points;
}

export async function leaveStats(year = currentYear()) {
  const leaves = await Leave.aggregate<{ _id: { leaveType: string; status: string }; count: number }>([
    {
      $match: {
        createdAt: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) },
      },
    },
    { $group: { _id: { leaveType: '$leaveType', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const types = ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'] as const;
  return types.map((type) => {
    const byStatus = leaves.filter((l) => l._id.leaveType === type);
    const count = (s: string) => byStatus.find((b) => b._id.status === s)?.count ?? 0;
    return {
      leaveType: type,
      applied: count('PENDING') + count('APPROVED') + count('REJECTED'),
      approved: count('APPROVED'),
      rejected: count('REJECTED'),
    };
  });
}

export async function departmentDistribution() {
  const counts = await Employee.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: '$departmentId', count: { $sum: 1 } } },
  ]);
  const departments = await Department.find().select('name');
  const nameById = new Map(departments.map((d) => [String(d._id), d.name]));

  const rows = counts
    .filter((c) => c._id)
    .map((c) => ({ name: nameById.get(String(c._id)) ?? 'Unassigned', count: c.count }))
    .sort((a, b) => b.count - a.count);

  const withoutDepartment = counts.find((c) => !c._id)?.count ?? 0;
  return [
    ...rows,
    ...(withoutDepartment > 0 ? [{ name: 'Unassigned', count: withoutDepartment }] : []),
  ];
}

export async function hiringTrend(months = 12) {
  const points: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = await Employee.countDocuments({
      joiningDate: { $gte: startOfMonth(date), $lte: endOfMonth(date) },
    });
    points.push({ month: monthName(date.getFullYear(), date.getMonth() + 1), count });
  }
  return points;
}

export async function payrollSummary(year = currentYear()) {
  const records = await PayrollRecord.find({ year }).select('status netSalary');
  const paid = records.filter((r) => r.status === 'PAID');
  const draft = records.filter((r) => r.status === 'DRAFT');
  return {
    paidRecords: paid.length,
    draftRecords: draft.length,
    totalPaid: paid.reduce((sum, r) => sum + serializeDecimal(r.netSalary), 0),
    totalDraft: draft.reduce((sum, r) => sum + serializeDecimal(r.netSalary), 0),
  };
}

export async function activities(limit = 20) {
  return getRecentActivities(limit);
}

export async function departmentWisePayroll() {
  const month = currentMonth();
  const year = currentYear();
  const records = await PayrollRecord.find({ month, year }).populate({
    path: 'employee',
    select: 'departmentId',
    populate: { path: 'department', select: 'name' },
  });
  const grouped: Record<string, number> = {};
  for (const record of records) {
    const employee = record.employee as { department?: { name?: string } | null } | null;
    const name = employee?.department?.name ?? 'Unassigned';
    grouped[name] = (grouped[name] ?? 0) + serializeDecimal(record.netSalary);
  }
  return Object.entries(grouped).map(([name, total]) => ({ name, total }));
}