import { Router } from 'express';
import { salaryStructureSchema, payrollGenerateSchema } from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest, requireEmployee } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as payrollService from '../services/payroll.service';
import { parsePagination } from '../utils/pagination';
import { ApiError } from '../lib/errors';

const router = Router();

router.use(authenticate);

async function assertSlipAccess(req: AuthRequest, record: { employeeId: string }): Promise<void> {
  const isAdmin = req.user?.role === 'ADMIN';
  const isOwner = req.employee?.id === record.employeeId;
  if (!isAdmin && !isOwner) {
    throw ApiError.forbidden('You can only access your own payslips');
  }
}

router.get(
  '/structure/me',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const structure = await payrollService.getStructure(req.employee!.id);
    ok(res, structure);
  }),
);

router.put(
  '/structure/me',
  requireEmployee,
  validate(salaryStructureSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const structure = await payrollService.upsertStructure(req.employee!.id, req.body, req.user!);
    ok(res, structure, 'Salary structure updated');
  }),
);

router.get(
  '/records/me',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await payrollService.listRecords({
      ...params,
      employeeId: req.employee!.id,
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
    });
    ok(res, result);
  }),
);

router.get(
  '/records/:id/slip',
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await payrollService.getRecord(req.params.id);
    await assertSlipAccess(req, { employeeId: record.employeeId });
    const { buffer, filename } = await payrollService.generateSlipPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`,
    );
    res.send(buffer);
  }),
);

router.get(
  '/records/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await payrollService.getRecord(req.params.id);
    await assertSlipAccess(req, record);
    ok(res, record);
  }),
);

router.get(
  '/records',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePagination(req.query);
    const result = await payrollService.listRecords({
      ...params,
      month: req.query.month ? Number(req.query.month) : undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    ok(res, result);
  }),
);

router.post(
  '/records/generate',
  authorize('ADMIN'),
  validate(payrollGenerateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await payrollService.generateMonthly(req.body, req.user!);
    created(res, result, `Payroll generated for ${result.created} employee(s)`);
  }),
);

router.patch(
  '/records/:id/paid',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await payrollService.markPaid(req.params.id, req.user!);
    ok(res, record, 'Marked as paid');
  }),
);

router.delete(
  '/records/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    await payrollService.deleteRecord(req.params.id, req.user!);
    ok(res, { deleted: true }, 'Payroll record deleted');
  }),
);

export default router;
