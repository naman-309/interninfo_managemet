import { Router } from 'express';
import { recordPayment } from './fee.controller.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/admin/enrollments/:enrollmentId/payments
// Only Admin can record payments
router.post('/enrollments/:enrollmentId/payments', authenticate, requireAdmin, recordPayment);

export default router;