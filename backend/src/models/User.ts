import { Schema, model, Types } from 'mongoose';
import type { Role, UserStatus } from '@hrms/shared';
import { ROLES, USER_STATUSES } from '@hrms/shared';
import { schemaOptions } from './helpers';

export interface UserProps {
  email: string;
  passwordHash: string;
  passwordCipher: string | null;
  role: Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
    passwordHash: { type: String, required: true, maxlength: 255 },
    passwordCipher: { type: String, default: null, maxlength: 500 },
    role: { type: String, enum: ROLES, default: 'EMPLOYEE' },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    lastLoginAt: { type: Date, default: null },
  },
  schemaOptions({ timestamps: true }),
);

UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

export const User = model<UserProps>('User', UserSchema);