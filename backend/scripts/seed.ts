import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/lib/db';
import { env } from '../src/config/env';
import { encryptPassword } from '../src/lib/password-cipher';
import { currentYear } from '../src/utils/dates';
import {
  Activity,
  Attendance,
  Department,
  Employee,
  Holiday,
  Leave,
  LeaveBalance,
  SalaryStructure,
  SystemSetting,
  User,
} from '../src/models';

const now = new Date();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function inDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateOnly(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function upsertSettings(): Promise<void> {
  const settings: Record<string, string> = {
    companyName: 'Acme Corporation',
    companyLogo: '',
    companyEmail: 'hr@acme.com',
    companyPhone: '+1 555 0100',
    companyAddress: '123 Business Ave, Suite 100, New York, NY 10001',
    currency: 'USD',
    currencySymbol: '$',
    annualLeaveQuota: '15',
    sickLeaveQuota: '10',
    casualLeaveQuota: '5',
  };
  for (const [key, value] of Object.entries(settings)) {
    await SystemSetting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log('  Settings upserted');
}

async function seedAdmin(): Promise<void> {
  const email = env.seed.adminEmail;
  const password = env.seed.adminPassword;
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { email },
    {
      $set: { role: 'ADMIN', status: 'ACTIVE', passwordCipher: encryptPassword(password) },
      $setOnInsert: { email, passwordHash },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`  Admin: ${email} / ${password}`);
}

const seedEmployees = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@acme.com',
    gender: 'MALE',
    dateOfBirth: dateOnly(-9000),
    phone: '+1 555 0101',
    designation: 'Senior Software Engineer',
    department: 'Engineering',
    joiningOffset: -720,
    status: 'ACTIVE',
    structure: { basic: 5500, housing: 1200, transport: 300, medical: 200, otherAllowances: 250, deductions: 500 },
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@acme.com',
    gender: 'FEMALE',
    dateOfBirth: dateOnly(-12000),
    phone: '+1 555 0102',
    designation: 'HR Manager',
    department: 'Human Resources',
    joiningOffset: -600,
    status: 'ACTIVE',
    structure: { basic: 4200, housing: 900, transport: 250, medical: 180, otherAllowances: 200, deductions: 420 },
  },
  {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@acme.com',
    gender: 'MALE',
    dateOfBirth: dateOnly(-6600),
    phone: '+1 555 0103',
    designation: 'Sales Executive',
    department: 'Sales',
    joiningOffset: -300,
    status: 'ACTIVE',
    structure: { basic: 2800, housing: 600, transport: 400, medical: 150, otherAllowances: 300, deductions: 300 },
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@acme.com',
    gender: 'FEMALE',
    dateOfBirth: dateOnly(-450),
    phone: '+1 555 0104',
    designation: 'Marketing Specialist',
    department: 'Marketing',
    joiningOffset: -120,
    status: 'ACTIVE',
    structure: { basic: 3200, housing: 700, transport: 250, medical: 160, otherAllowances: 200, deductions: 320 },
  },
  {
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@acme.com',
    gender: 'MALE',
    dateOfBirth: dateOnly(-10000),
    phone: '+1 555 0105',
    designation: 'Accountant',
    department: 'Finance',
    joiningOffset: -45,
    status: 'ACTIVE',
    structure: { basic: 3600, housing: 800, transport: 200, medical: 170, otherAllowances: 150, deductions: 360 },
  },
];

async function seedEmployeesData(): Promise<void> {
  const year = currentYear();

  for (const seed of seedEmployees) {
    const existing = await Employee.findOne({ email: seed.email });
    if (existing) {
      console.log(`  Employee already exists: ${seed.email}`);
      continue;
    }

    const department = await Department.findOne({ name: seed.department });
    if (!department) {
      console.warn(`  Department missing: ${seed.department}`);
      continue;
    }

    const passwordHash = await bcrypt.hash('Welcome@123', 10);
    const passwordCipher = encryptPassword('Welcome@123');
    const user = await User.create({
      email: seed.email,
      passwordHash,
      passwordCipher,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });

    const count = await Employee.countDocuments();
    const employee = await Employee.create({
      userId: user._id,
      employeeCode: `EMP-${String(count + 1).padStart(4, '0')}`,
      firstName: seed.firstName,
      lastName: seed.lastName,
      email: seed.email,
      phone: seed.phone,
      gender: seed.gender,
      dateOfBirth: seed.dateOfBirth,
      designation: seed.designation,
      joiningDate: daysAgo(seed.joiningOffset),
      status: seed.status,
      departmentId: department._id,
    });

    await SalaryStructure.create({
      employeeId: employee._id,
      ...seed.structure,
      netSalary:
        seed.structure.basic + seed.structure.housing + seed.structure.transport +
        seed.structure.medical + seed.structure.otherAllowances - seed.structure.deductions,
    });

    await LeaveBalance.create([
      { employeeId: employee._id, year, leaveType: 'ANNUAL', total: 15, used: 3 },
      { employeeId: employee._id, year, leaveType: 'SICK', total: 10, used: 1 },
      { employeeId: employee._id, year, leaveType: 'CASUAL', total: 5, used: 0 },
      { employeeId: employee._id, year, leaveType: 'UNPAID', total: 0, used: 0 },
    ]);
    console.log(`  Employee: ${seed.firstName} ${seed.lastName} (${employee.employeeCode})`);
  }
}

async function seedAttendance(): Promise<void> {
  const employees = await Employee.find({ status: 'ACTIVE' });
  const existing = await Attendance.countDocuments();
  if (existing > 0) {
    console.log('  Attendance already seeded');
    return;
  }

  for (const employee of employees) {
    for (let i = 1; i <= 20; i++) {
      const date = daysAgo(i);
      const day = date.getDay();
      if (day === 0 || day === 6) continue;

      const skipped = Math.random() < 0.08;
      if (skipped) continue;

      const checkIn = new Date(date);
      checkIn.setHours(8, 30 + Math.floor(Math.random() * 50), 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(17, 0 + Math.floor(Math.random() * 40), 0, 0);

      const hours = (checkOut.getTime() - checkIn.getTime()) / 3600000;

      await Attendance.create({
        employeeId: employee._id,
        date,
        checkIn,
        checkOut,
        workingHours: Math.round(hours * 100) / 100,
        status: hours >= 7.5 ? 'PRESENT' : 'HALF_DAY',
      });
    }
  }
  console.log(`  Attendance seeded for ${employees.length} employees (last 20 days)`);
}

async function seedLeaves(): Promise<void> {
  const employees = await Employee.find({ status: 'ACTIVE' }).limit(3);
  const existing = await Leave.countDocuments();
  if (existing > 0) {
    console.log('  Leaves already seeded');
    return;
  }

  const admin = await User.findOne({ role: 'ADMIN' });

  const pending = await Leave.create({
    employeeId: employees[0]._id,
    leaveType: 'ANNUAL',
    startDate: inDays(7),
    endDate: inDays(9),
    days: 3,
    reason: 'Family trip',
    status: 'PENDING',
  });
  console.log(`  Pending leave: #${pending._id}`);

  if (admin) {
    await Leave.create({
      employeeId: employees[1]._id,
      leaveType: 'SICK',
      startDate: daysAgo(5),
      endDate: daysAgo(4),
      days: 2,
      reason: 'Medical appointment',
      status: 'APPROVED',
      reviewedById: admin._id,
      reviewedAt: now,
    });
    await Leave.create({
      employeeId: employees[2]._id,
      leaveType: 'CASUAL',
      startDate: daysAgo(3),
      endDate: daysAgo(3),
      days: 1,
      reason: 'Personal errand',
      status: 'APPROVED',
      reviewedById: admin._id,
      reviewedAt: now,
    });
  }
}

async function seedHolidays(): Promise<void> {
  const holidays = [
    { name: 'New Year', date: new Date(currentYear(), 0, 1) },
    { name: 'Labor Day', date: new Date(currentYear(), 4, 1) },
    { name: 'Independence Day', date: new Date(currentYear(), 6, 4) },
    { name: 'Thanksgiving', date: inDays(20) },
    { name: 'Christmas', date: new Date(currentYear(), 11, 25) },
  ];
  for (const holiday of holidays) {
    await Holiday.findOneAndUpdate(
      { date: holiday.date, name: holiday.name },
      { $setOnInsert: holiday },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log('  Holidays seeded');
}

async function main(): Promise<void> {
  console.log('[seed] Starting...');
  await connectDb(env.databaseUrl);
  await upsertSettings();

  const departments = [
    { name: 'Engineering', code: 'ENG', description: 'Software development and IT operations' },
    { name: 'Human Resources', code: 'HR', description: 'People operations and culture' },
    { name: 'Sales', code: 'SALES', description: 'Revenue and client acquisition' },
    { name: 'Marketing', code: 'MKT', description: 'Brand and growth' },
    { name: 'Finance', code: 'FIN', description: 'Accounting and budgets' },
    { name: 'Operations', code: 'OPS', description: 'Day to day business operations' },
  ];
  for (const department of departments) {
    await Department.findOneAndUpdate(
      { code: department.code },
      { $setOnInsert: department },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log('  Departments seeded');

  await seedAdmin();
  await seedEmployeesData();
  await seedAttendance();
  await seedLeaves();
  await seedHolidays();

  await Activity.create({
    type: 'SYSTEM',
    actorName: 'system',
    message: 'Database seeded successfully',
  });

  console.log('[seed] Done.');
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => disconnectDb());