import { Router } from 'express';
import { departmentCreateSchema, departmentUpdateSchema } from '@hrms/shared';
import { asyncHandler } from '../lib/errors';
import { created, ok } from '../lib/respond';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as departmentService from '../services/department.service';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req: AuthRequest, res) => {
    const departments = await departmentService.listDepartments();
    ok(res, departments);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const department = await departmentService.getDepartment(Number(req.params.id));
    ok(res, department);
  }),
);

router.post(
  '/',
  authorize('ADMIN'),
  validate(departmentCreateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const department = await departmentService.createDepartment(req.body, req.user!);
    created(res, department, 'Department created');
  }),
);

router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(departmentUpdateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const department = await departmentService.updateDepartment(Number(req.params.id), req.body, req.user!);
    ok(res, department, 'Department updated');
  }),
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: AuthRequest, res) => {
    await departmentService.deleteDepartment(Number(req.params.id), req.user!);
    ok(res, { deleted: true }, 'Department deleted');
  }),
);

export default router;
