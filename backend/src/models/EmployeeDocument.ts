import { Schema, model, Types } from 'mongoose';
import type { DocumentType } from '@hrms/shared';
import { DOCUMENT_TYPES } from '@hrms/shared';
import { schemaOptions } from './helpers';

export interface EmployeeDocumentProps {
  employeeId: Types.ObjectId;
  title: string;
  type: DocumentType;
  fileUrl: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeDocumentSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    title: { type: String, required: true, maxlength: 150 },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    fileUrl: { type: String, required: true, maxlength: 500 },
    size: { type: Number, default: 0 },
  },
  schemaOptions({ timestamps: true }),
);

export const EmployeeDocument = model<EmployeeDocumentProps>('EmployeeDocument', EmployeeDocumentSchema);