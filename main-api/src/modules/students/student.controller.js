import { prisma } from '../../config/db.js';
import { calculateGrade } from '../../utils/grading.js';
import { redisPublisher } from '../../config/redis.js'; // Redis import kiya

// 1. Get Student's Personal Dashboard (With Caching)
export const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const cacheKey = `dashboard:${studentId}`; // Redis me is naam se save hoga

        // STEP A: Check in Redis First
        const cachedData = await redisPublisher.get(cacheKey);
        if (cachedData) {
            console.log('⚡ Dashboard served from Redis Cache');
            // String ko wapas JSON banakar bhej do
            return res.status(200).json({
                success: true,
                source: 'Redis Cache ⚡',
                data: JSON.parse(cachedData)
            });
        }

        // STEP B: Agar Redis me nahi mila, toh Database se lao
        console.log('🐢 Dashboard served from Database');
        const enrollment = await prisma.enrollment.findFirst({
            where: { userId: studentId },
            include: {
                course: { select: { name: true } },
                payments: { orderBy: { paymentDate: 'desc' } },
                testResults: {
                    include: { mockTest: { select: { title: true, testDate: true, maxMarks: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'No active enrollment found.' });
        }

        const totalFee = parseFloat(enrollment.totalFee);
        const totalPaid = enrollment.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remainingBalance = totalFee - totalPaid;

        const formattedTests = enrollment.testResults.map(result => ({
            testName: result.mockTest.title,
            date: result.mockTest.testDate,
            marksObtained: result.marks,
            maxMarks: result.mockTest.maxMarks,
            attendance: result.attendanceStatus,
            grade: calculateGrade(result.marks, result.attendanceStatus)
        }));

        const responseData = {
            courseName: enrollment.course.name,
            feeSummary: { totalFee, totalPaid, remainingBalance },
            recentPayments: enrollment.payments,
            testPerformance: formattedTests
        };

        // STEP C: Database se laane ke baad, Redis me 15 mins (900 seconds) ke liye save kar do
        await redisPublisher.setex(cacheKey, 900, JSON.stringify(responseData));

        return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database 🐢',
            data: responseData
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load dashboard: ' + error.message });
    }
};


// 2. Get Course Leaderboard (With Caching)
export const getCourseLeaderboard = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const cacheKey = `leaderboard:${courseId}`; // Redis key

        // STEP A: Check in Redis
        const cachedLeaderboard = await redisPublisher.get(cacheKey);
        if (cachedLeaderboard) {
            console.log('⚡ Leaderboard served from Redis Cache');
            return res.status(200).json({
                success: true,
                source: 'Redis Cache ⚡',
                data: JSON.parse(cachedLeaderboard)
            });
        }

        // STEP B: Agar Redis me nahi hai toh DB se calculate karo
        console.log('🐢 Leaderboard served from Database');
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId: courseId, user: { accountStatus: 'APPROVED' } },
            include: {
                user: { select: { name: true } },
                testResults: {
                    where: { attendanceStatus: 'PRESENT', marks: { not: null } },
                    select: { marks: true }
                }
            }
        });

        const leaderboardData = enrollments.map(en => {
            const tests = en.testResults;
            const totalMarks = tests.reduce((sum, test) => sum + parseFloat(test.marks), 0);
            const average = tests.length > 0 ? (totalMarks / tests.length).toFixed(2) : 0;

            return {
                studentName: en.user.name,
                testsGiven: tests.length,
                averageScore: parseFloat(average)
            };
        });

        leaderboardData.sort((a, b) => b.averageScore - a.averageScore);

        const rankedLeaderboard = leaderboardData.map((student, index) => ({
            rank: index + 1,
            ...student
        }));

        // STEP C: Redis me 15 mins (900 seconds) ke liye save kar do
        await redisPublisher.setex(cacheKey, 900, JSON.stringify(rankedLeaderboard));

        return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database 🐢',
            data: rankedLeaderboard
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load leaderboard: ' + error.message });
    }
};