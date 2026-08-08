import mongoose from 'mongoose';
import dns from 'dns';
import { ApiError } from './errors';

dns.setServers(['1.1.1.1', '8.8.8.8']);

export async function connectDb(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

export function oid(value: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest('Invalid id format');
  }
  return new mongoose.Types.ObjectId(value);
}

export function toStringId(value: unknown): string {
  return String(value);
}

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

const normalize = (value: unknown, seen: WeakSet<object>): unknown => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = normalize(value[i], seen);
    return value;
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value as object)) return value;
    seen.add(value as object);
    const obj = value as Record<string, unknown>;
    if ('_id' in obj) {
      if (!('id' in obj)) obj.id = String(obj._id);
      delete obj._id;
    }
    delete obj.__v;
    for (const key of Object.keys(obj)) {
      obj[key] = normalize(obj[key], seen);
    }
  }
  return value;
};

export function toPlain<T>(value: unknown): T {
  let result = value;
  if (
    result !== null &&
    typeof result === 'object' &&
    typeof (result as { toObject?: unknown }).toObject === 'function'
  ) {
    result = (result as { toObject(o?: Record<string, unknown>): unknown }).toObject({
      virtuals: true,
      versionKey: false,
    });
  }
  return normalize(result, new WeakSet()) as T;
}