import { prisma } from '../lib/prisma';
import {
  endOfMonth,
  startOfMonth,
  monthName,
  currentYear,
  currentMonth,
  startOfDay,
} from '../utils/dates';
import { serializeDecimal, serializeDecimalMap } from '../utils/serializers';
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
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.employee.count({ where: { status: 'ON_LEAVE' } }),
    prisma.department.count(),
    prisma.leave.count({ where: { status: 'PENDING' } }),
    prisma.leave.count({ where: { status: 'APPROVED' } }),
    prisma.leave.count({ where: { status: 'REJECTED' } }),
    prisma.payrollRecord.count({ where: { month, year, status: 'PAID' } }),
    prisma.payrollRecord.count({ where: { month, year, status: 'DRAFT' } }),
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
    const counts = await prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: startOfMonth(date), lte: endOfMonth(date) } },
      _count: true,
    });
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
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
  const leaves = await prisma.leave.groupBy({
    by: ['leaveType', 'status'],
    where: { createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } },
    _count: true,
  });

  const types = ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'] as const;
  return types.map((type) => {
    const byStatus = leaves.filter((l) => l.leaveType === type);
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
    return {
      leaveType: type,
      applied: count('PENDING') + count('APPROVED') + count('REJECTED'),
      approved: count('APPROVED'),
      rejected: count('REJECTED'),
    };
  });
}

export async function departmentDistribution() {
  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { employees: { _count: 'desc' } },
  });
  const withoutDepartment = await prisma.employee.count({ where: { departmentId: null } });
  return [
    ...departments.map((d) => ({ name: d.name, count: d._count.employees })),
    ...(withoutDepartment > 0 ? [{ name: 'Unassigned', count: withoutDepartment }] : []),
  ];
}

export async function hiringTrend(months = 12) {
  const points: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = await prisma.employee.count({
      where: { joiningDate: { gte: startOfMonth(date), lte: endOfMonth(date) } },
    });
    points.push({ month: monthName(date.getFullYear(), date.getMonth() + 1), count });
  }
  return points;
}

export async function payrollSummary(year = currentYear()) {
  const records = await prisma.payrollRecord.findMany({
    where: { year },
    select: { status: true, netSalary: true },
  });
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
  const records = await prisma.payrollRecord.findMany({
    where: { month, year },
    include: { employee: { select: { department: { select: { name: true } } } } },
  });
  const grouped: Record<string, number> = {};
  for (const record of records) {
    const name = record.employee.department?.name ?? 'Unassigned';
    grouped[name] = (grouped[name] ?? 0) + serializeDecimal(record.netSalary);
  }
  return Object.entries(grouped).map(([name, total]) => ({ name, total }));
}
