import { prisma } from '../../config/db.js';
import { createTestSchema, bulkResultsSchema } from './mockTest.validation.js';

// 1. Naya Test Create Karna
export const createMockTest = async (req, res) => {
    try {
        const validatedData = createTestSchema.parse(req.body);

        const test = await prisma.mockTest.create({
            data: {
                courseId: validatedData.courseId,
                title: validatedData.title,
                testDate: new Date(validatedData.testDate),
                maxMarks: validatedData.maxMarks
            }
        });

        return res.status(201).json({ success: true, message: 'Mock Test created successfully!', data: test });
    } catch (error) {
        if (error.errors) return res.status(400).json({ success: false, error: error.errors[0].message });
        return res.status(500).json({ success: false, error: 'Failed to create test: ' + error.message });
    }
};

// 2. Course ke saare enrolled students lana (taaki UI me table dikh sake)
export const getStudentsForTest = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Unhi students ko lao jinka account APPROVED hai
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: courseId,
                user: { accountStatus: 'APPROVED' }
            },
            select: {
                id: true,
                user: {
                    select: { name: true, email: true }
                }
            }
        });

        return res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
};

// 3. Bulk Marks Entry (Ek sath saare students ke marks save karna)
export const enterBulkResults = async (req, res) => {
    try {
        const testId = req.params.testId;
        const validatedData = bulkResultsSchema.parse(req.body);

        // Prisma Transaction loop: Har student ka result insert ya update karega
        const results = await prisma.$transaction(
            validatedData.results.map((result) => {
                // Upsert = Agar pehle se entry hai to update karo, nahi to nayi create karo
                return prisma.mockTestResult.upsert({
                    where: {
                        mockTestId_enrollmentId: {
                            mockTestId: testId,
                            enrollmentId: result.enrollmentId
                        }
                    },
                    update: {
                        marks: result.attendanceStatus === 'ABSENT' ? null : result.marks,
                        attendanceStatus: result.attendanceStatus
                    },
                    create: {
                        mockTestId: testId,
                        enrollmentId: result.enrollmentId,
                        marks: result.attendanceStatus === 'ABSENT' ? null : result.marks,
                        attendanceStatus: result.attendanceStatus
                    }
                });
            })
        );

        return res.status(200).json({
            success: true,
            message: 'All results saved successfully!',
            data: results
        });

    } catch (error) {
        if (error.errors) return res.status(400).json({ success: false, error: error.errors[0].message });
        return res.status(500).json({ success: false, error: 'Failed to save results: ' + error.message });
    }
};