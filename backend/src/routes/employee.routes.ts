import { Router } from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  employeeCreateSchema,
  employeeDocumentSchema,
  employeeUpdateSchema,
  salaryStructureSchema,
} from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest, requireEmployee } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as employeeService from '../services/employee.service';
import { generateIdCardPdf } from '../services/id-card.service';
import { getStructure } from '../services/payroll.service';
import { parsePagination } from '../utils/pagination';

const router = Router();

router.use(authenticate);

const profileImageSchema = z.object({
  profileImageUrl: z.string().trim().min(5).max(500),
});

router.get(
  '/',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const params = parsePagination(req.query);
    const result = await employeeService.listEmployees({
      ...params,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      departmentId: typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    ok(res, result);
  }),
);

router.post(
  '/',
  authorize('ADMIN'),
  validate(employeeCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const employee = await employeeService.createEmployee(req.body, req.user!);
    created(res, employee, 'Employee created successfully');
  }),
);

router.get(
  '/me',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const employee = await employeeService.getEmployee(req.employee!.id);
    ok(res, employee);
  }),
);

router.get(
  '/me/id-card',
  requireEmployee,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { buffer, filename } = await generateIdCardPdf(req.employee!.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`,
    );
    res.send(buffer);
  }),
);

router.get(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const employee = await employeeService.getEmployee(req.params.id);
    ok(res, employee);
  }),
);

router.get(
  '/:id/id-card',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { buffer, filename } = await generateIdCardPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`,
    );
    res.send(buffer);
  }),
);

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(employeeUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const employee = await employeeService.updateEmployee(req.params.id, req.body, req.user!);
    ok(res, employee, 'Employee updated successfully');
  }),
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await employeeService.deleteEmployee(req.params.id, req.user!);
    ok(res, { deleted: true }, 'Employee deleted');
  }),
);

router.patch(
  '/:id/profile-image',
  authorize('ADMIN'),
  validate(profileImageSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const employee = await employeeService.updateProfileImage(
      req.params.id,
      req.body.profileImageUrl,
      req.user!,
    );
    ok(res, employee, 'Profile picture updated');
  }),
);

router.get(
  '/:id/salary-structure',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const structure = await getStructure(req.params.id);
    ok(res, structure);
  }),
);

router.put(
  '/:id/salary-structure',
  authorize('ADMIN'),
  validate(salaryStructureSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const structure = await employeeService.upsertSalaryStructure(req.params.id, req.body, req.user!);
    ok(res, structure, 'Salary structure updated');
  }),
);

router.post(
  '/:id/documents',
  authorize('ADMIN'),
  validate(employeeDocumentSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await employeeService.addDocument(req.params.id, req.body, req.user!);
    created(res, doc, 'Document uploaded');
  }),
);

router.delete(
  '/documents/:docId',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await employeeService.removeDocument(req.params.docId, req.user!);
    ok(res, { deleted: true }, 'Document removed');
  }),
);

export default router;
