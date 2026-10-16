import { Router } from 'express';
import { getStudentDashboard, getCourseLeaderboard } from './student.controller.js';
import { authenticate, requireApproved } from '../../middlewares/auth.middleware.js';

const router = Router();

// Student APIs
router.get('/dashboard', authenticate, requireApproved, getStudentDashboard);
router.get('/leaderboard/:courseId', authenticate, getCourseLeaderboard);

export default router;