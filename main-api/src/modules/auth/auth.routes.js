import { Router } from 'express';
import { registerStudent, loginUser } from './auth.controller.js';
import { getActiveCourses } from '../students/course.controller.js';

const router = Router();

// Public  courses
router.get('/courses', getActiveCourses);

// register api 
router.post('/register', registerStudent);

//login api 
router.post('/login', loginUser);


export default router;