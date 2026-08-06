export const ROLES = ['ADMIN', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Gender = (typeof GENDERS)[number];

export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const PAYROLL_STATUSES = ['DRAFT', 'PAID'] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const DOCUMENT_TYPES = ['CONTRACT', 'ID_PROOF', 'RESUME', 'CERTIFICATE', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Annual Leave',
  SICK: 'Sick Leave',
  CASUAL: 'Casual Leave',
  UNPAID: 'Unpaid Leave',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  INACTIVE: 'Inactive',
  TERMINATED: 'Terminated',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: 'Draft',
  PAID: 'Paid',
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CONTRACT: 'Contract',
  ID_PROOF: 'ID Proof',
  RESUME: 'Resume',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
};

export const LEAVE_DEFAULT_QUOTA: Record<LeaveType, number> = {
  ANNUAL: 15,
  SICK: 10,
  CASUAL: 5,
  UNPAID: 0,
};

export const DEFAULT_PASSWORD = 'Welcome@123';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MIN_WORKING_HOURS_PER_DAY = 7.5;
export const HALF_DAY_HOURS = 4;

export const YEAR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const REFRESH_COOKIE_NAME = 'hrms_refresh';
export const ACCESS_STORAGE_KEY = 'hrms_access_token';

export const COMPANY_SETTINGS_KEYS = [
  'companyName',
  'companyLogo',
  'companyEmail',
  'companyPhone',
  'companyAddress',
  'currency',
  'currencySymbol',
  'annualLeaveQuota',
  'sickLeaveQuota',
  'casualLeaveQuota',
] as const;

export const DEFAULT_SETTINGS: Record<(typeof COMPANY_SETTINGS_KEYS)[number], string> = {
  companyName: 'My Company',
  companyLogo: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  currency: 'USD',
  currencySymbol: '$',
  annualLeaveQuota: '15',
  sickLeaveQuota: '10',
  casualLeaveQuota: '5',
};
