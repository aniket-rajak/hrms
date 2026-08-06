import { prisma } from '../lib/prisma';
import { endOfMonth, startOfDay, startOfMonth, addDays, monthName, currentYear, currentMonth } from '../utils/dates';
import { serializeDecimal, serializeDecimalMap } from '../utils/serializers';
import { getRecentActivities } from './activity.service';
import { getBalance, onLeaveTodayCount } from './leave.service';
import { monthlyAttendanceTrend } from './attendance.service';
import { getStructure } from './payroll.service';
import { serializeStructure } from './employee.service';

const employeeInclude = {
  department: { select: { id: true, name: true } },
  salaryStructure: true,
} as const;

function serializeEmployeeSummary(employee: Record<string, unknown>) {
  const department = employee.department as Record<string, unknown> | null;
  return {
    id: employee.id as number,
    employeeCode: employee.employeeCode as string,
    firstName: employee.firstName as string,
    lastName: employee.lastName as string,
    email: employee.email as string,
    designation: employee.designation as string,
    status: employee.status as string,
    profileImageUrl: (employee.profileImageUrl as string | null) ?? null,
    department: department ? { id: department.id as number, name: department.name as string } : null,
  };
}

export async function adminDashboard() {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const in30Days = addDays(new Date(), 30);

  const [
    totalEmployees,
    totalDepartments,
    presentToday,
    pendingLeaves,
    newHiresThisMonth,
    pendingPayroll,
    upcomingBirthdays,
    recentActivities,
    monthlyAttendance,
    departmentDistribution,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.department.count(),
    prisma.attendance.count({
      where: { date: today, status: { in: ['PRESENT', 'HALF_DAY'] } },
    }),
    prisma.leave.count({ where: { status: 'PENDING' } }),
    prisma.employee.count({
      where: { joiningDate: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.payrollRecord.count({
      where: { month: currentMonth(), year: currentYear(), status: 'DRAFT' },
    }),
    prisma.employee.findMany({
      where: {
        dateOfBirth: { not: null },
        status: 'ACTIVE',
      },
      include: employeeInclude,
      orderBy: { dateOfBirth: 'asc' },
    }),
    getRecentActivities(10),
    monthlyAttendanceTrend(6),
    prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
    }),
  ]);

  const onLeaveToday = await onLeaveTodayCount();

  const birthdays = upcomingBirthdays
    .map((e) => {
      const dob = e.dateOfBirth as Date | null;
      if (!dob) return null;
      const thisYear = new Date(currentYear(), dob.getMonth(), dob.getDate());
      const nextYear = new Date(currentYear() + 1, dob.getMonth(), dob.getDate());
      const daysUntil =
        thisYear >= today
          ? Math.floor((thisYear.getTime() - today.getTime()) / 86400000)
          : Math.floor((nextYear.getTime() - today.getTime()) / 86400000);
      return { ...serializeEmployeeSummary(e as never), birthdayDate: dob.toISOString().slice(0, 10), daysUntil };
    })
    .filter((e) => e !== null && e.daysUntil <= 30)
    .sort((a, b) => a!.daysUntil - b!.daysUntil)
    .slice(0, 10);

  return {
    totalEmployees,
    totalDepartments,
    presentToday,
    absentToday: Math.max(0, totalEmployees - presentToday - onLeaveToday),
    onLeaveToday,
    pendingLeaves,
    newHiresThisMonth,
    pendingPayroll,
    upcomingBirthdays: birthdays,
    recentActivities,
    monthlyAttendance,
    departmentDistribution: departmentDistribution.map((d) => ({
      name: d.name,
      count: d._count.employees,
    })),
  };
}

export async function employeeDashboard(userId: number, employeeId: number) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const in30Days = addDays(new Date(), 30);

  const [
    employee,
    todayRecord,
    monthRecords,
    leaveBalances,
    upcomingLeaves,
    recentAttendance,
    lastPayroll,
    upcomingHolidays,
  ] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { id: true, name: true } }, salaryStructure: true },
    }),
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    }),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: monthStart, lte: monthEnd } },
    }),
    getBalance(employeeId, currentYear()),
    prisma.leave.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        endDate: { gte: today },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.payrollRecord.findFirst({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 1,
    }),
    prisma.holiday.findMany({
      where: { date: { gte: today, lte: in30Days } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
  ]);

  if (!employee) throw new Error('Employee not found');

  const monthSummary = {
    present: monthRecords.filter((r) => r.status === 'PRESENT').length,
    absent: monthRecords.filter((r) => r.status === 'ABSENT').length,
    halfDay: monthRecords.filter((r) => r.status === 'HALF_DAY').length,
    leave: monthRecords.filter((r) => r.status === 'LEAVE').length,
    totalHours:
      Math.round(monthRecords.reduce((sum, r) => sum + (r.workingHours ?? 0), 0) * 100) / 100,
    totalDays: monthRecords.length,
  };

  const serializeAttendance = (r: { id: number; date: Date; checkIn: Date | null; checkOut: Date | null; status: string; workingHours: number | null; note: string | null }) => ({
    id: r.id,
    employeeId,
    date: r.date.toISOString(),
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    status: r.status as never,
    workingHours: r.workingHours,
    note: r.note,
  });

  return {
    today: todayRecord ? serializeAttendance(todayRecord) : null,
    todayCheckedIn: Boolean(todayRecord?.checkIn),
    todayCheckedOut: Boolean(todayRecord?.checkOut),
    monthSummary,
    leaveBalances,
    upcomingLeaves: upcomingLeaves.map((l) => ({
      id: l.id,
      leaveType: l.leaveType,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      days: l.days,
      reason: l.reason,
    })),
    recentAttendance: recentAttendance.map(serializeAttendance),
    salaryStructure: employee.salaryStructure ? serializeStructure(employee.salaryStructure) : null,
    lastPayroll: lastPayroll
      ? {
          id: lastPayroll.id,
          month: lastPayroll.month,
          year: lastPayroll.year,
          netSalary: serializeDecimal(lastPayroll.netSalary),
          status: lastPayroll.status,
          earnings: serializeDecimalMap(lastPayroll.earnings),
          deductions: serializeDecimalMap(lastPayroll.deductions),
          paidAt: lastPayroll.paidAt ? lastPayroll.paidAt.toISOString() : null,
        }
      : null,
    upcomingHolidays: upcomingHolidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString() })),
    employee: employee
      ? {
          ...employee,
          dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : null,
          joiningDate: employee.joiningDate.toISOString(),
        }
      : null,
  };
}
