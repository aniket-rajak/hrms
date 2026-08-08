import { Schema, model, Types } from 'mongoose';
import type { LeaveType } from '@hrms/shared';
import { LEAVE_TYPES } from '@hrms/shared';
import { schemaOptions } from './helpers';

export interface LeaveBalanceProps {
  employeeId: Types.ObjectId;
  year: number;
  leaveType: LeaveType;
  total: number;
  used: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveBalanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    year: { type: Number, required: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    total: { type: Number, required: true },
    used: { type: Number, default: 0 },
  },
  schemaOptions({ timestamps: true }),
);

LeaveBalanceSchema.index({ employeeId: 1, year: 1, leaveType: 1 }, { unique: true });
LeaveBalanceSchema.index({ year: 1 });

export const LeaveBalance = model<LeaveBalanceProps>('LeaveBalance', LeaveBalanceSchema);