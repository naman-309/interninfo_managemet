import { Router } from 'express';
import { registerStudent } from './auth.controller.js';
import { getActiveCourses } from '../students/course.controller.js';

const router = Router();

// Public routes - auth and courses
router.get('/courses', getActiveCourses);
router.post('/register', registerStudent);

export default router;