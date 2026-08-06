import { Response } from 'express';

export function ok<T>(res: Response, data: T, message?: string): Response {
  return res.json({ success: true, data, message });
}

export function created<T>(res: Response, data: T, message?: string): Response {
  return res.status(201).json({ success: true, data, message });
}
