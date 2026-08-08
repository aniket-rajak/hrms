import type { SchemaOptions } from 'mongoose';

const jsonTransform = (_doc: unknown, ret: Record<string, unknown>): void => {
  delete ret._id;
  delete ret.__v;
};

export function schemaOptions(options: SchemaOptions = {}): SchemaOptions {
  return {
    ...options,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: jsonTransform as never,
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: jsonTransform as never,
    },
  } as SchemaOptions;
}