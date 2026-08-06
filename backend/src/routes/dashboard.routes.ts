import { Router } from 'express';
import { asyncHandler } from '../lib/errors';
import { ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest, requireEmployee } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';

const router = Router();

router.use(authenticate);

router.get(
  '/admin',
  authorize('ADMIN'),
  asyncHandler(async (_req: AuthRequest, res) => {
    const data = await dashboardService.adminDashboard();
    ok(res, data);
  }),
);

router.get(
  '/employee',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await dashboardService.employeeDashboard(req.user!.id, req.employee!.id);
    ok(res, data);
  }),
);

export default router;
