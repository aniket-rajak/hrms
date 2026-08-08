import { NextFunction, Request, Response } from 'express';
import { Role } from '@hrms/shared';
import { Employee, User } from '../models';
import { ApiError } from '../lib/errors';
import { isValidObjectId } from '../lib/db';
import { verifyAccessToken } from '../lib/tokens';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
  employee?: {
    id: string;
  };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required');
    }
    const token = header.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Session expired or invalid');
    }
    if (!isValidObjectId(payload.sub)) {
      throw ApiError.unauthorized('Session expired or invalid');
    }
    const user = await User.findById(payload.sub).select('email role status');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is disabled');
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...roles: Role[]): (req: AuthRequest, _res: Response, next: NextFunction) => void {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

export async function requireEmployee(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'EMPLOYEE') {
      throw ApiError.forbidden('Employee account required');
    }
    const employee = await Employee.findOne({ userId: req.user.id }).select('_id');
    if (!employee) throw ApiError.forbidden('Employee profile not found for this account');
    req.employee = { id: employee.id };
    next();
  } catch (err) {
    next(err);
  }
}