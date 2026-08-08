import { Schema, model, Types } from 'mongoose';
import type { EmployeeStatus, Gender } from '@hrms/shared';
import { EMPLOYEE_STATUSES, GENDERS } from '@hrms/shared';
import type { DepartmentProps } from './Department';
import type { SalaryStructureProps } from './SalaryStructure';
import type { UserProps } from './User';
import { schemaOptions } from './helpers';

export interface EmployeeProps {
  userId: Types.ObjectId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: Gender;
  dateOfBirth: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  profileImageUrl: string | null;
  designation: string;
  joiningDate: Date;
  status: EmployeeStatus;
  departmentId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  department?: DepartmentProps | null;
  salaryStructure?: SalaryStructureProps | null;
  user?: Pick<UserProps, 'email' | 'role' | 'status'> | null;
}

const EmployeeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    firstName: { type: String, required: true, maxlength: 100 },
    lastName: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
    phone: { type: String, default: null, maxlength: 30 },
    gender: { type: String, enum: GENDERS, required: true },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: null, maxlength: 255 },
    city: { type: String, default: null, maxlength: 100 },
    state: { type: String, default: null, maxlength: 100 },
    postalCode: { type: String, default: null, maxlength: 20 },
    country: { type: String, default: null, maxlength: 100 },
    profileImageUrl: { type: String, default: null, maxlength: 500 },
    designation: { type: String, required: true, maxlength: 100 },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'ACTIVE' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  },
  schemaOptions({ timestamps: true }),
);

EmployeeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});
EmployeeSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});
EmployeeSchema.virtual('salaryStructure', {
  ref: 'SalaryStructure',
  localField: '_id',
  foreignField: 'employeeId',
  justOne: true,
});

EmployeeSchema.index({ departmentId: 1 });
EmployeeSchema.index({ status: 1 });

export const Employee = model<EmployeeProps>('Employee', EmployeeSchema);