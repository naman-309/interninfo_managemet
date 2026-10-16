import { prisma } from '../../config/db.js';
import { calculateGrade } from '../../utils/grading.js';

// 1. Get Student's Personal Dashboard
export const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user.userId;

        // Fetch student enrollment with all related payments and tests
        const enrollment = await prisma.enrollment.findFirst({
            where: { userId: studentId },
            include: {
                course: { select: { name: true } },
                payments: { orderBy: { paymentDate: 'desc' } }, // Latest payment first
                testResults: {
                    include: {
                        mockTest: { select: { title: true, testDate: true, maxMarks: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'No active enrollment found.' });
        }

        // Calculate Fees
        const totalFee = parseFloat(enrollment.totalFee);
        const totalPaid = enrollment.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remainingBalance = totalFee - totalPaid;

        // Format Test Results with Grades
        const formattedTests = enrollment.testResults.map(result => ({
            testName: result.mockTest.title,
            date: result.mockTest.testDate,
            marksObtained: result.marks,
            maxMarks: result.mockTest.maxMarks,
            attendance: result.attendanceStatus,
            grade: calculateGrade(result.marks, result.attendanceStatus)
        }));

        return res.status(200).json({
            success: true,
            data: {
                courseName: enrollment.course.name,
                feeSummary: {
                    totalFee,
                    totalPaid,
                    remainingBalance
                },
                recentPayments: enrollment.payments,
                testPerformance: formattedTests
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load dashboard: ' + error.message });
    }
};

// 2. Get Course Leaderboard
export const getCourseLeaderboard = async (req, res) => {
    try {
        const courseId = req.params.courseId;

        // Fetch all enrollments for this course with their PRESENT test results
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

        // Calculate average for each student
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

        // Sort by average score (High to Low)
        leaderboardData.sort((a, b) => b.averageScore - a.averageScore);

        // Add Rank
        const rankedLeaderboard = leaderboardData.map((student, index) => ({
            rank: index + 1,
            ...student
        }));

        return res.status(200).json({ success: true, data: rankedLeaderboard });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to load leaderboard: ' + error.message });
    }
};