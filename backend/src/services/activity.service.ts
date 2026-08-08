import { Activity } from '../models';
import { oid } from '../lib/db';

export interface ActivityInput {
  userId?: string | null;
  actorName: string;
  type: string;
  message: string;
}

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await Activity.create({
      userId: input.userId ? oid(input.userId) : null,
      actorName: input.actorName,
      type: input.type,
      message: input.message,
    });
  } catch (err) {
    console.error('[activity] failed to log', err);
  }
}

export async function getRecentActivities(limit = 10) {
  const activities = await Activity.find().sort({ createdAt: -1 }).limit(limit);
  return activities.map((a) => ({
    id: a.id,
    actorName: a.actorName,
    type: a.type,
    message: a.message,
    createdAt: new Date(a.createdAt).toISOString(),
  }));
}