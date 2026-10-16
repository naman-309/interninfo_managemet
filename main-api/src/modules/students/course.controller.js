import { prisma } from '../../config/db.js';

// Sabhi active courses fetch karna (Registration form dropdown ke liye)
export const getActiveCourses = async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true
            }
        });

        return res.status(200).json({
            success: true,
            data: courses
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Courses fetch karne mein problem aayi: ' + error.message
        });
    }
};  