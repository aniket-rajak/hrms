import { prisma } from '../lib/prisma';

export interface ActivityInput {
  userId?: number | null;
  actorName: string;
  type: string;
  message: string;
}

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        userId: input.userId ?? null,
        actorName: input.actorName,
        type: input.type,
        message: input.message,
      },
    });
  } catch (err) {
    console.error('[activity] failed to log', err);
  }
}

export async function getRecentActivities(limit = 10) {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return activities.map((a) => ({
    id: a.id,
    actorName: a.actorName,
    type: a.type,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
  }));
}
