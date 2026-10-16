import { Router } from 'express';
import { approveStudent } from './admin.controller.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// /api/admin/students/:id/approve
// Dhyan dein: Pehle authenticate check karega (Login hai?), fir requireAdmin check karega (Admin hai?)
router.patch('/students/:id/approve', authenticate, requireAdmin, approveStudent);

export default router;