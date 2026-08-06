import {
  AttendanceStatus,
  DocumentType,
  EmployeeStatus,
  Gender,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
  Role,
  UserStatus,
} from './constants';

export {
  AttendanceStatus,
  DocumentType,
  EmployeeStatus,
  Gender,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
  Role,
  UserStatus,
};

export interface User {
  id: number;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: number;
  userId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: Gender;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  profileImageUrl: string | null;
  designation: string;
  joiningDate: string;
  status: EmployeeStatus;
  departmentId: number | null;
  createdAt: string;
  updatedAt: string;
  department?: Department | null;
  salaryStructure?: SalaryStructure | null;
  documents?: EmployeeDocument[];
  user?: Pick<User, "id" | "email" | "role" | "status"> | null;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string | null;
  headEmployeeId: number | null;
  headEmployee: Employee | null;
  employees: Employee[];
  _count?: { employees: number };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  title: string;
  type: DocumentType;
  fileUrl: string;
  size: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRecord {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  year: number;
  leaveType: LeaveType;
  total: number;
  used: number;
}

export interface SalaryStructure {
  id: number;
  employeeId: number;
  basic: number;
  housing: number;
  transport: number;
  medical: number;
  otherAllowances: number;
  deductions: number;
  netSalary: number;
  updatedAt: string;
}

export interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  structureSnapshot: Record<string, number>;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  netSalary: number;
  status: PayrollStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  userId: number | null;
  actorName: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface RefreshToken {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  updatedAt: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
}

export interface AuthUser extends User {
  employee: Employee | null;
}
