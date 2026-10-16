import { prisma } from '../../config/db.js';
import { createTestSchema, bulkResultsSchema } from './mockTest.validation.js';
import { redisPublisher } from '../../config/redis.js';

// 1. Create Mock Test
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

// 2. Get Students for Test (For Admin UI Table)
export const getStudentsForTest = async (req, res) => {
    try {
        const { courseId } = req.params;

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

// 3. Bulk Marks Entry & Redis Cache Invalidation
export const enterBulkResults = async (req, res) => {
    try {
        const testId = req.params.testId;
        const validatedData = bulkResultsSchema.parse(req.body);

        const results = await prisma.$transaction(
            validatedData.results.map((result) => {
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

        // 🔴 REDIS INVALIDATION START

        // A. Leaderboard cache delete karo
        const testInfo = await prisma.mockTest.findUnique({ where: { id: testId } });
        if (testInfo) {
            await redisPublisher.del(`leaderboard:${testInfo.courseId}`);
            console.log(`🗑️ Leaderboard Cache Deleted for Course: ${testInfo.courseId}`);
        }

        // B. Jin students ke marks dale gaye hain, unka Dashboard cache delete karo
        const updatedEnrollments = await prisma.enrollment.findMany({
            where: { id: { in: validatedData.results.map(r => r.enrollmentId) } },
            select: { userId: true }
        });

        for (const en of updatedEnrollments) {
            await redisPublisher.del(`dashboard:${en.userId}`);
            console.log(`🗑️ Dashboard Cache Deleted for User: ${en.userId}`);
        }

        // 🔴 REDIS INVALIDATION END

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