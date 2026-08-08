import { Schema, model, Types } from 'mongoose';
import { schemaOptions } from './helpers';

export interface ActivityProps {
  userId: Types.ObjectId | null;
  actorName: string;
  type: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, required: true, maxlength: 150 },
    type: { type: String, required: true, maxlength: 50 },
    message: { type: String, required: true, maxlength: 500 },
  },
  schemaOptions({ timestamps: true }),
);

ActivitySchema.index({ createdAt: -1 });

export const Activity = model<ActivityProps>('Activity', ActivitySchema);