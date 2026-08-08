import { Schema, model, Types } from 'mongoose';
import type { EmployeeProps } from './Employee';
import { schemaOptions } from './helpers';

export interface DepartmentProps {
  name: string;
  code: string;
  description: string | null;
  headEmployeeId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  headEmployee?: Pick<EmployeeProps, 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl'> | null;
}

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 20 },
    description: { type: String, default: null, maxlength: 500 },
    headEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  schemaOptions({ timestamps: true }),
);

DepartmentSchema.virtual('headEmployee', {
  ref: 'Employee',
  localField: 'headEmployeeId',
  foreignField: '_id',
  justOne: true,
});

export const Department = model<DepartmentProps>('Department', DepartmentSchema);