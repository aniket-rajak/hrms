import { Router } from 'express';
import { attendanceCheckInSchema, attendanceUpdateSchema } from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest, requireEmployee } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as attendanceService from '../services/attendance.service';
import { parsePagination } from '../utils/pagination';

const router = Router();

router.use(authenticate);

router.post(
  '/check-in',
  requireEmployee,
  validate(attendanceCheckInSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await attendanceService.checkIn(req.employee!.id, req.body.note, req.user!.email);
    ok(res, record, 'Checked in successfully');
  }),
);

router.post(
  '/check-out',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await attendanceService.checkOut(req.employee!.id, req.user!.email);
    ok(res, record, 'Checked out successfully');
  }),
);

router.get(
  '/today',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await attendanceService.getToday(req.employee!.id);
    ok(res, record);
  }),
);

router.get(
  '/history',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await attendanceService.history(req.employee!.id, {
      ...params,
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
    });
    ok(res, result);
  }),
);

router.get(
  '/monthly',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await attendanceService.monthly(req.employee!.id, month, year);
    ok(res, result);
  }),
);

router.get(
  '/all',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await attendanceService.listForAdmin({
      ...params,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    ok(res, result);
  }),
);

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(attendanceUpdateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await attendanceService.updateAttendance(Number(req.params.id), req.body, req.user!);
    ok(res, record, 'Attendance updated');
  }),
);

export default router;
