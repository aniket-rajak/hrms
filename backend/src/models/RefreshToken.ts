import { Schema, model, Types } from 'mongoose';
import type { UserProps } from './User';
import { schemaOptions } from './helpers';

export interface RefreshTokenProps {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: (UserProps & { id?: string; _id?: Types.ObjectId }) | null;
}

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, maxlength: 255 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  schemaOptions({ timestamps: true }),
);

RefreshTokenSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

export const RefreshToken = model<RefreshTokenProps>('RefreshToken', RefreshTokenSchema);