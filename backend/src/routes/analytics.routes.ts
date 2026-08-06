import { Router } from 'express';
import { asyncHandler } from '../lib/errors';
import { ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as analyticsService from '../services/analytics.service';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get(
  '/summary',
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await analyticsService.summary());
  }),
);

router.get(
  '/attendance-chart',
  asyncHandler(async (req: AuthRequest, res) => {
    const months = Math.min(12, Math.max(1, Number(req.query.months) || 6));
    ok(res, await analyticsService.attendanceChart(months));
  }),
);

router.get(
  '/leave-stats',
  asyncHandler(async (req: AuthRequest, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    ok(res, await analyticsService.leaveStats(year));
  }),
);

router.get(
  '/department-distribution',
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await analyticsService.departmentDistribution());
  }),
);

router.get(
  '/hiring-trend',
  asyncHandler(async (req: AuthRequest, res) => {
    const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
    ok(res, await analyticsService.hiringTrend(months));
  }),
);

router.get(
  '/payroll-summary',
  asyncHandler(async (req: AuthRequest, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    ok(res, await analyticsService.payrollSummary(year));
  }),
);

router.get(
  '/department-payroll',
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, await analyticsService.departmentWisePayroll());
  }),
);

router.get(
  '/activities',
  asyncHandler(async (req: AuthRequest, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    ok(res, await analyticsService.activities(limit));
  }),
);

export default router;
