import { z } from 'zod';
import {
  ATTENDANCE_STATUSES,
  DOCUMENT_TYPES,
  EMPLOYEE_STATUSES,
  GENDERS,
  LEAVE_STATUSES,
  LEAVE_TYPES,
} from './constants';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

const optionalDate = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), 'Invalid date')
  .optional()
  .nullable();

const employeeBase = {
  firstName: z.string().trim().min(2, 'First name is required').max(100),
  lastName: z.string().trim().min(2, 'Last name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  gender: z.enum(GENDERS),
  dateOfBirth: optionalDate,
  address: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  city: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  state: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().nullable().or(z.literal('')),
  country: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  designation: z.string().trim().min(2, 'Designation is required').max(100),
  joiningDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Joining date is required'),
  status: z.enum(EMPLOYEE_STATUSES),
  departmentId: objectIdSchema.nullable().optional(),
};

export const employeeCreateSchema = z.object({
  ...employeeBase,
  password: z.string().trim().min(8, 'Password must be at least 8 characters').max(72).optional(),
  basic: z.number().min(0).optional(),
  housing: z.number().min(0).optional(),
  transport: z.number().min(0).optional(),
  medical: z.number().min(0).optional(),
  otherAllowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = z.object({
  ...employeeBase,
  profileImageUrl: z.string().max(500).optional().nullable(),
}).partial();
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export const salaryStructureSchema = z.object({
  basic: z.number().min(0, 'Basic salary is required'),
  housing: z.number().min(0).optional(),
  transport: z.number().min(0).optional(),
  medical: z.number().min(0).optional(),
  otherAllowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
});
export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;

export const employeeDocumentSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(150),
  type: z.enum(DOCUMENT_TYPES),
  fileUrl: z.string().trim().min(5, 'File URL is required').max(500),
  size: z.number().int().min(0).optional(),
});
export type EmployeeDocumentInput = z.infer<typeof employeeDocumentSchema>;

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'Code is required')
    .max(20)
    .regex(/^[A-Za-z0-9-_]+$/, 'Only letters, numbers, dash and underscore allowed'),
  description: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  headEmployeeId: objectIdSchema.nullable().optional(),
});
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

export const departmentUpdateSchema = departmentCreateSchema.partial();
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

export const attendanceCheckInSchema = z.object({
  note: z.string().trim().max(255).optional().nullable().or(z.literal('')),
});
export type AttendanceCheckInInput = z.infer<typeof attendanceCheckInSchema>;

export const attendanceUpdateSchema = z.object({
  date: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
  checkIn: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'Invalid check-in time')
    .optional()
    .nullable(),
  checkOut: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), 'Invalid check-out time')
    .optional()
    .nullable(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  note: z.string().trim().max(255).optional().nullable().or(z.literal('')),
});
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateSchema>;

export const leaveApplySchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Start date is required'),
    endDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'End date is required'),
    reason: z.string().trim().min(5, 'Please provide a reason').max(500),
  })
  .refine((data) => Date.parse(data.endDate) >= Date.parse(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });
export type LeaveApplyInput = z.infer<typeof leaveApplySchema>;

export const leaveReviewSchema = z.object({
  note: z.string().trim().max(500).optional().nullable().or(z.literal('')),
});
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;

export const payrollGenerateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});
export type PayrollGenerateInput = z.infer<typeof payrollGenerateSchema>;

export const settingsUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(100).optional(),
  companyLogo: z.string().trim().max(500).optional(),
  companyEmail: z.string().trim().email().optional().or(z.literal('')),
  companyPhone: z.string().trim().max(30).optional().or(z.literal('')),
  companyAddress: z.string().trim().max(500).optional().or(z.literal('')),
  currency: z.string().trim().min(1).max(10).optional(),
  currencySymbol: z.string().trim().min(1).max(5).optional(),
  annualLeaveQuota: z.number().int().min(0).max(60).optional(),
  sickLeaveQuota: z.number().int().min(0).max(60).optional(),
  casualLeaveQuota: z.number().int().min(0).max(60).optional(),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  gender: z.enum(GENDERS).optional(),
  dateOfBirth: optionalDate,
  address: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  city: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  state: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().nullable().or(z.literal('')),
  country: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  profileImageUrl: z.string().trim().max(500).optional().nullable(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const holidayCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
});
export type HolidayCreateInput = z.infer<typeof holidayCreateSchema>;
