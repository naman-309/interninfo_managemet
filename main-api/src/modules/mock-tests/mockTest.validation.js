import { z } from 'zod';

export const createTestSchema = z.object({
    courseId: z.string().uuid("Invalid course ID"),
    title: z.string().trim().min(3, "Test title is required"),
    testDate: z.string().datetime("Valid test date (ISO format) is required"),
    maxMarks: z.number().positive().default(35) // Default 35 marks
});

export const bulkResultsSchema = z.object({
    results: z.array(z.object({
        enrollmentId: z.string().uuid("Invalid enrollment ID"),
        marks: z.number().min(0).max(35).nullable(), // Nullable for absent students
        attendanceStatus: z.enum(['PRESENT', 'ABSENT'])
    }))
});