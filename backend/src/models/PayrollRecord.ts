import { Schema, model, Types } from 'mongoose';
import type { PayrollStatus } from '@hrms/shared';
import { PAYROLL_STATUSES } from '@hrms/shared';
import type { EmployeeProps } from './Employee';
import { schemaOptions } from './helpers';

export interface PayrollRecordProps {
  employeeId: Types.ObjectId;
  month: number;
  year: number;
  structureSnapshot: Record<string, number>;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  netSalary: number;
  status: PayrollStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee?: EmployeeProps | null;
}

const PayrollRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    structureSnapshot: { type: Schema.Types.Mixed, default: {} },
    earnings: { type: Schema.Types.Mixed, default: {} },
    deductions: { type: Schema.Types.Mixed, default: {} },
    netSalary: { type: Number, required: true },
    status: { type: String, enum: PAYROLL_STATUSES, default: 'DRAFT' },
    paidAt: { type: Date, default: null },
  },
  schemaOptions({ timestamps: true }),
);

PayrollRecordSchema.virtual('employee', {
  ref: 'Employee',
  localField: 'employeeId',
  foreignField: '_id',
  justOne: true,
});

PayrollRecordSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
PayrollRecordSchema.index({ month: 1, year: 1 });

export const PayrollRecord = model<PayrollRecordProps>('PayrollRecord', PayrollRecordSchema);