import { Router } from 'express';
import { z } from 'zod';
import { holidayCreateSchema, profileUpdateSchema, settingsUpdateSchema } from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as settingsService from '../services/settings.service';

const router = Router();

router.use(authenticate);

router.get(
  '/public',
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await settingsService.getPublicSettings());
  }),
);

router.get(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await settingsService.getPublicSettings());
  }),
);

router.patch(
  '/',
  authorize('ADMIN'),
  validate(settingsUpdateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const settings = await settingsService.updateSettings(req.body, req.user!);
    ok(res, settings, 'Settings updated');
  }),
);

const companyLogoSchema = z.object({
  companyLogo: z.string().trim().min(5).max(500),
});

router.post(
  '/company-logo',
  authorize('ADMIN'),
  validate(companyLogoSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const settings = await settingsService.updateCompanyLogo(req.body.companyLogo, req.user!);
    ok(res, settings, 'Company logo updated');
  }),
);

router.patch(
  '/profile',
  validate(profileUpdateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const profile = await settingsService.updateProfile(req.user!.id, req.body);
    ok(res, profile, 'Profile updated');
  }),
);

router.get(
  '/holidays',
  authorize('ADMIN'),
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await settingsService.listHolidays());
  }),
);

router.post(
  '/holidays',
  authorize('ADMIN'),
  validate(holidayCreateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const holiday = await settingsService.createHoliday(req.body.name, req.body.date, req.user!);
    created(res, holiday, 'Holiday added');
  }),
);

router.delete(
  '/holidays/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    await settingsService.deleteHoliday(req.params.id, req.user!);
    ok(res, { deleted: true }, 'Holiday removed');
  }),
);

export default router;
