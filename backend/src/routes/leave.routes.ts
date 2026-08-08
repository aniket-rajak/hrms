import { Router } from 'express';
import { leaveApplySchema, leaveReviewSchema } from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest, requireEmployee } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as leaveService from '../services/leave.service';
import { parsePagination } from '../utils/pagination';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await leaveService.listMine(req.employee!.id, {
      ...params,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    ok(res, result);
  }),
);

router.post(
  '/apply',
  requireEmployee,
  validate(leaveApplySchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const leave = await leaveService.applyLeave(req.employee!.id, req.body, req.user!.email);
    created(res, leave, 'Leave request submitted');
  }),
);

router.get(
  '/balance',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const balance = await leaveService.getBalance(req.employee!.id, year);
    ok(res, balance);
  }),
);

router.get(
  '/all',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await leaveService.listAll({
      ...params,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    ok(res, result);
  }),
);

router.patch(
  '/:id/approve',
  authorize('ADMIN'),
  validate(leaveReviewSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await leaveService.reviewLeave(req.params.id, 'APPROVE', req.user!, req.body.note);
    ok(res, result, 'Leave approved');
  }),
);

router.patch(
  '/:id/reject',
  authorize('ADMIN'),
  validate(leaveReviewSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await leaveService.reviewLeave(req.params.id, 'REJECT', req.user!, req.body.note);
    ok(res, result, 'Leave rejected');
  }),
);

export default router;
