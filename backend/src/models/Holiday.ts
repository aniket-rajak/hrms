import { Schema, model } from 'mongoose';
import { schemaOptions } from './helpers';

export interface HolidayProps {
  name: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 150 },
    date: { type: Date, required: true },
  },
  schemaOptions({ timestamps: true }),
);

HolidaySchema.index({ date: 1, name: 1 }, { unique: true });
HolidaySchema.index({ date: 1 });

export const Holiday = model<HolidayProps>('Holiday', HolidaySchema);