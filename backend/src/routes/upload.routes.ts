import { Router } from 'express';
import { asyncHandler } from '../lib/errors';
import { ok } from '../lib/respond';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUploadSignature } from '../lib/uploads';

const router = Router();

router.use(authenticate);

router.post(
  '/signature',
  asyncHandler(async (_req: AuthRequest, res) => {
    ok(res, getUploadSignature());
  }),
);

export default router;
