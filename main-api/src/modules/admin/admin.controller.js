import { prisma } from '../../config/db.js';

export const approveStudent = async (req, res) => {
    try {
        const studentId = req.params.id; // URL se student ID nikalenge
        const { courseId, courseDuration, totalFee } = req.body; // Body se fee details

        if (!courseId || !courseDuration || !totalFee) {
            return res.status(400).json({ success: false, error: 'Missing required fee or course details' });
        }

        // Use Prisma Transaction (Yaa to dono honge, ya ek bhi nahi hoga)
        const result = await prisma.$transaction(async (tx) => {

            // 1. User ka status PENDING se APPROVED kardo
            const updatedUser = await tx.user.update({
                where: { id: studentId },
                data: { accountStatus: 'APPROVED' }
            });

            // 2. Enrollment create karo (Fees lock ho gayi)
            const enrollment = await tx.enrollment.create({
                data: {
                    userId: studentId,
                    courseId: courseId,
                    courseDuration: courseDuration,
                    totalFee: parseFloat(totalFee), // Decimal database field
                    approvedBy: req.user.userId,    // Jis Admin ne approve kiya uski ID (token se)
                    approvedAt: new Date()
                }
            });

            return { user: updatedUser, enrollment };
        });

        return res.status(200).json({
            success: true,
            message: 'Student approved successfully and fee is locked.',
            data: result
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Approval failed: ' + error.message });
    }
};