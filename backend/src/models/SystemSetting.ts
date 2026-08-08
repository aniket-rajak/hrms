import { Schema, model } from 'mongoose';
import { schemaOptions } from './helpers';

export interface SystemSettingProps {
  key: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, maxlength: 100 },
    value: { type: String, default: null },
  },
  schemaOptions({ timestamps: true }),
);

export const SystemSetting = model<SystemSettingProps>('SystemSetting', SystemSettingSchema);