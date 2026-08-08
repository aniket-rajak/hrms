import { Schema, model, Types } from 'mongoose';
import { schemaOptions } from './helpers';

export interface PasswordResetTokenProps {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, maxlength: 255 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  schemaOptions({ timestamps: true }),
);

export const PasswordResetToken = model<PasswordResetTokenProps>('PasswordResetToken', PasswordResetTokenSchema);