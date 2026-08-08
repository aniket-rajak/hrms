import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';

function cipherKey(): Buffer {
  return crypto.createHash('sha256').update(env.jwtSecret).digest();
}

export function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, cipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptPassword(cipherText: string): string {
  const [ivPart, tagPart, dataPart] = cipherText.split('.');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    cipherKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function recoverPassword(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  try {
    return decryptPassword(cipherText);
  } catch {
    return null;
  }
}