import { Router } from 'express';
import { registerStudent, loginUser, forgotPassword, resetPassword } from './auth.controller.js'; // Functions import kiye
import { getActiveCourses } from '../students/course.controller.js';

const router = Router();

router.get('/courses', getActiveCourses);

// basic api 
router.post('/register', registerStudent);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;