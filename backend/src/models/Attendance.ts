import { Schema, model, Types } from 'mongoose';
import type { AttendanceStatus } from '@hrms/shared';
import { ATTENDANCE_STATUSES } from '@hrms/shared';
import type { EmployeeProps } from './Employee';
import { schemaOptions } from './helpers';

export interface AttendanceProps {
  employeeId: Types.ObjectId;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  workingHours: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  employee?: Pick<EmployeeProps, 'firstName' | 'lastName' | 'employeeCode' | 'profileImageUrl'> | EmployeeProps | null;
}

const AttendanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'PRESENT' },
    workingHours: { type: Number, default: null },
    note: { type: String, default: null, maxlength: 255 },
  },
  schemaOptions({ timestamps: true }),
);

AttendanceSchema.virtual('employee', {
  ref: 'Employee',
  localField: 'employeeId',
  foreignField: '_id',
  justOne: true,
});

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ employeeId: 1 });

export const Attendance = model<AttendanceProps>('Attendance', AttendanceSchema);