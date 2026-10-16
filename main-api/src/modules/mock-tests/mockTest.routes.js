import { Router } from 'express';
import { createMockTest, getStudentsForTest, enterBulkResults } from './mockTest.controller.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// Saare routes Admin ke liye hain
// make  test 
router.post('/', authenticate, requireAdmin, createMockTest);

router.get('/course/:courseId/students', authenticate, requireAdmin, getStudentsForTest);
router.put('/:testId/results', authenticate, requireAdmin, enterBulkResults);

export default router;