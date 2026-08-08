import { Attendance, Department, Employee, Holiday, Leave, PayrollRecord } from '../models';
import { endOfMonth, startOfDay, startOfMonth, addDays, monthName, currentYear, currentMonth } from '../utils/dates';
import { serializeDecimal, serializeDecimalMap } from '../utils/serializers';
import { getRecentActivities } from './activity.service';
import { getBalance, onLeaveTodayCount } from './leave.service';
import { monthlyAttendanceTrend } from './attendance.service';
import { getStructure } from './payroll.service';
import { serializeStructure } from './employee.service';
import { oid, toPlain } from '../lib/db';

const employeePopulatePaths = [
  { path: 'department', select: 'name' },
  { path: 'salaryStructure' },
];

function serializeEmployeeSummary(employee: unknown) {
  const e = toPlain<Record<string, unknown>>(employee);
  const department = e.department as Record<string, unknown> | null;
  return {
    id: e.id as string,
    employeeCode: e.employeeCode as string,
    firstName: e.firstName as string,
    lastName: e.lastName as string,
    email: e.email as string,
    designation: e.designation as string,
    status: e.status as string,
    profileImageUrl: (e.profileImageUrl as string | null) ?? null,
    department: department ? { id: department.id as string, name: department.name as string } : null,
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
    Employee.countDocuments(),
    Department.countDocuments(),
    Attendance.countDocuments({
      date: today,
      status: { $in: ['PRESENT', 'HALF_DAY'] },
    }),
    Leave.countDocuments({ status: 'PENDING' }),
    Employee.countDocuments({
      joiningDate: { $gte: monthStart, $lte: monthEnd },
    }),
    PayrollRecord.countDocuments({
      month: currentMonth(),
      year: currentYear(),
      status: 'DRAFT',
    }),
    Employee.find({
      dateOfBirth: { $ne: null },
      status: 'ACTIVE',
    })
      .populate(employeePopulatePaths)
      .sort({ dateOfBirth: 1 }),
    getRecentActivities(10),
    monthlyAttendanceTrend(6),
    Employee.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]),
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
      return { ...serializeEmployeeSummary(e), birthdayDate: dob.toISOString().slice(0, 10), daysUntil };
    })
    .filter((e) => e !== null && e.daysUntil <= 30)
    .sort((a, b) => a!.daysUntil - b!.daysUntil)
    .slice(0, 10);

  const departments = await Department.find().select('name');
  const nameById = new Map(departments.map((d) => [String(d._id), d.name]));

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
    departmentDistribution: departmentDistribution
      .filter((d) => d._id)
      .map((d) => ({ name: nameById.get(String(d._id)) ?? 'Unassigned', count: d.count }))
      .concat(
        departmentDistribution.find((d) => !d._id)
          ? [{ name: 'Unassigned', count: departmentDistribution.find((d) => !d._id)!.count }]
          : [],
      ),
  };
}

export async function employeeDashboard(userId: string, employeeId: string) {
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
    Employee.findById(oid(employeeId)).populate([
      { path: 'department', select: 'name' },
      { path: 'salaryStructure' },
    ]),
    Attendance.findOne({
      employeeId: oid(employeeId),
      date: today,
    }),
    Attendance.find({
      employeeId: oid(employeeId),
      date: { $gte: monthStart, $lte: monthEnd },
    }),
    getBalance(employeeId, currentYear()),
    Leave.find({
      employeeId: oid(employeeId),
      status: 'APPROVED',
      endDate: { $gte: today },
    })
      .sort({ startDate: 1 })
      .limit(5),
    Attendance.find({ employeeId: oid(employeeId) })
      .sort({ date: -1 })
      .limit(10),
    PayrollRecord.findOne({ employeeId: oid(employeeId) }).sort({ year: -1, month: -1 }),
    Holiday.find({ date: { $gte: today, $lte: in30Days } })
      .sort({ date: 1 })
      .limit(5),
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

  const serializeAttendance = (r: {
    id?: string;
    employeeId: unknown;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: string;
    workingHours: number | null;
    note: string | null;
  }) => ({
    id: r.id ?? String(r.employeeId),
    employeeId: String(r.employeeId),
    date: r.date.toISOString(),
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    status: r.status as never,
    workingHours: r.workingHours,
    note: r.note,
  });

  const employeePlain = toPlain<Record<string, unknown>>(employee);

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
          ...employeePlain,
          id: employeePlain.id as string,
          dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : null,
          joiningDate: employee.joiningDate.toISOString(),
        }
      : null,
  };
}