import { Schema, model, Types } from 'mongoose';
import type { LeaveStatus, LeaveType } from '@hrms/shared';
import { LEAVE_STATUSES, LEAVE_TYPES } from '@hrms/shared';
import type { EmployeeProps } from './Employee';
import type { UserProps } from './User';
import { schemaOptions } from './helpers';

export interface LeaveProps {
  employeeId: Types.ObjectId;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedById: Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee?: Pick<EmployeeProps, 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl'> | EmployeeProps | null;
  reviewedBy?: Pick<UserProps, 'email'> | UserProps | null;
}

const LeaveSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'PENDING' },
    reviewNote: { type: String, default: null, maxlength: 500 },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  schemaOptions({ timestamps: true }),
);

LeaveSchema.virtual('employee', {
  ref: 'Employee',
  localField: 'employeeId',
  foreignField: '_id',
  justOne: true,
});
LeaveSchema.virtual('reviewedBy', {
  ref: 'User',
  localField: 'reviewedById',
  foreignField: '_id',
  justOne: true,
});

LeaveSchema.index({ status: 1 });
LeaveSchema.index({ startDate: 1 });

export const Leave = model<LeaveProps>('Leave', LeaveSchema);