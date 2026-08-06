import {
  AttendanceStatus,
  Department,
  Employee,
  EmployeeStatus,
  LeaveRecord,
  LeaveStatus,
  LeaveType,
  PayrollRecord,
  PayrollStatus,
  Role,
  SalaryStructure,
  User,
  UserStatus,
} from './types';

export type { Role, UserStatus, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus, PayrollStatus };

export { ROLES } from './constants';

export type UserWithEmployee = User & { employee: Employee | null };

export interface LoginResponse {
  accessToken: string;
  user: User;
  employee: Employee | null;
}

export interface AuthMeResponse {
  user: User;
  employee: Employee | null;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface EmployeeListItem extends Employee {
  department: Department | null;
  salaryStructure: SalaryStructure | null;
}

export interface AttendanceRecordDto {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours: number | null;
  note: string | null;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl'> | null;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  totalHours: number;
  totalDays: number;
}

export interface LeaveBalanceDto {
  year: number;
  leaveType: LeaveType;
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveRecordDto extends LeaveRecord {
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl'> | null;
  reviewedByName?: string | null;
}

export interface PayrollRecordDto extends PayrollRecord {
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl' | 'designation' | 'departmentId'> & { department?: Department | null } | null;
}

export interface AdminDashboardData {
  totalEmployees: number;
  totalDepartments: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  newHiresThisMonth: number;
  pendingPayroll: number;
  upcomingBirthdays: Employee[];
  recentActivities: ActivityDto[];
  monthlyAttendance: { month: string; present: number; absent: number; halfDay: number }[];
  departmentDistribution: { name: string; count: number }[];
}

export interface EmployeeDashboardData {
  today: AttendanceRecordDto | null;
  todayCheckedIn: boolean;
  todayCheckedOut: boolean;
  monthSummary: AttendanceSummary;
  leaveBalances: LeaveBalanceDto[];
  upcomingLeaves: LeaveRecordDto[];
  recentAttendance: AttendanceRecordDto[];
  salaryStructure: SalaryStructure | null;
  lastPayroll: PayrollRecordDto | null;
  upcomingHolidays: HolidayDto[];
  employee: Employee | null;
}

export interface ActivityDto {
  id: number;
  actorName: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface HolidayDto {
  id: number;
  name: string;
  date: string;
}

export interface SystemSettingsDto {
  companyName: string;
  companyLogo: string | null;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  currency: string;
  currencySymbol: string;
  annualLeaveQuota: number;
  sickLeaveQuota: number;
  casualLeaveQuota: number;
  holidays: HolidayDto[];
  [key: string]: unknown;
}

export interface AnalyticsSummary {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  totalDepartments: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  payrollPaidThisMonth: number;
  payrollDraftThisMonth: number;
}

export interface AttendanceChartPoint {
  month: string;
  present: number;
  absent: number;
  halfDay: number;
}

export interface LeaveStatsPoint {
  leaveType: LeaveType;
  applied: number;
  approved: number;
  rejected: number;
}

export interface DepartmentDistributionPoint {
  name: string;
  count: number;
}

export interface HiringTrendPoint {
  month: string;
  count: number;
}

export interface PayrollSummary {
  paidRecords: number;
  draftRecords: number;
  totalPaid: number;
  totalDraft: number;
}

export interface EmployeeDocumentsDto {
  documents: {
    id: number;
    title: string;
    type: string;
    fileUrl: string;
    size: number;
    createdAt: string;
  }[];
}

export interface UploadSignatureResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}
