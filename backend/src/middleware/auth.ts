import { NextFunction, Request, Response } from 'express';
import { Role } from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
  employee?: {
    id: number;
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
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
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
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!employee) throw ApiError.forbidden('Employee profile not found for this account');
    req.employee = { id: employee.id };
    next();
  } catch (err) {
    next(err);
  }
}
