import { Router } from 'express';
import { Request, Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@hrms/shared';
import { env } from '../config/env';
import { asyncHandler, ApiError } from '../lib/errors';
import { ok } from '../lib/respond';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter, forgotPasswordRateLimiter } from '../middleware/rateLimit';
import * as authService from '../services/auth.service';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '@hrms/shared';

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? ('none' as const) : ('lax' as const),
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  path: '/',
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
}

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _omit, ...response } = result;
    ok(res, response);
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(rawToken ?? '');
    setRefreshCookie(res, result.refreshToken);
    ok(res, { accessToken: result.accessToken });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawToken ?? '');
    clearRefreshCookie(res);
    ok(res, { loggedOut: true });
  }),
);

router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.requestPasswordReset(req.body.email);
    ok(res, {
      sent: true,
      devLink: result.devLink,
    });
  }),
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    clearRefreshCookie(res);
    ok(res, { reset: true }, 'Password reset successfully. Please sign in.');
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    clearRefreshCookie(res);
    ok(res, { changed: true }, 'Password changed successfully. Please sign in again.');
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const me = await authService.getAuthUser(req.user!.id);
    ok(res, me);
  }),
);

export default router;
