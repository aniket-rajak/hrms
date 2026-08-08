import { Schema, model, Types } from 'mongoose';
import { schemaOptions } from './helpers';

export interface SalaryStructureProps {
  employeeId: Types.ObjectId;
  basic: number;
  housing: number | null;
  transport: number | null;
  medical: number | null;
  otherAllowances: number | null;
  deductions: number | null;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    basic: { type: Number, required: true },
    housing: { type: Number, default: null },
    transport: { type: Number, default: null },
    medical: { type: Number, default: null },
    otherAllowances: { type: Number, default: null },
    deductions: { type: Number, default: null },
    netSalary: { type: Number, required: true },
  },
  schemaOptions({ timestamps: true }),
);

export const SalaryStructure = model<SalaryStructureProps>('SalaryStructure', SalaryStructureSchema);