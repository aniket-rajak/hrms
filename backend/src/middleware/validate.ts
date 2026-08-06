import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../lib/errors';

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      next(ApiError.badRequest('Validation failed', details));
      return;
    }
    (req as Request & { validated?: unknown }).validated = result.data;
    next();
  };
}
