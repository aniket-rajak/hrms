import { createHash, randomBytes, randomUUID } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  role: string;
  type: 'access';
}

export function signAccessToken(userId: number, email: string, role: string): string {
  const payload: AccessTokenPayload = { sub: userId, email, role, type: 'access' };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.accessTokenTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateResetToken(): string {
  return randomUUID().replace(/-/g, '') + randomBytes(8).toString('hex');
}
