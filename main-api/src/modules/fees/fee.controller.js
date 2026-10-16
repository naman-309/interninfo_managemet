import { prisma } from '../../config/db.js';
import { paymentSchema } from './fee.validation.js';
import { redisPublisher } from '../../config/redis.js'; // 👈 IMPORT REDIS

export const recordPayment = async (req, res) => {
    try {
        const enrollmentId = req.params.enrollmentId;
        const validatedData = paymentSchema.parse(req.body);

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                payments: true,
                user: { select: { name: true, email: true } },
                course: { select: { name: true } }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }

        const totalPaid = enrollment.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remainingBalance = parseFloat(enrollment.totalFee) - totalPaid;

        if (validatedData.amount > remainingBalance) {
            return res.status(400).json({ success: false, error: `Invalid amount. Balance is ₹${remainingBalance}` });
        }

        const newRemainingBalance = remainingBalance - validatedData.amount;

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    enrollmentId: enrollmentId,
                    amount: validatedData.amount,
                    paymentMode: validatedData.paymentMode,
                    note: validatedData.note,
                    recordedBy: req.user.userId
                }
            });

            await tx.notificationOutbox.create({
                data: {
                    eventType: 'PAYMENT_RECORDED',
                    payload: {
                        studentName: enrollment.user.name,
                        studentEmail: enrollment.user.email,
                        courseName: enrollment.course.name,
                        amountPaid: validatedData.amount,
                        remainingBalance: newRemainingBalance,
                        date: payment.paymentDate
                    }
                }
            });

            return payment;
        });

        // 🔴 REDIS INVALIDATION: Purana dashboard cache hata do
        const cacheKey = `dashboard:${enrollment.userId}`;
        await redisPublisher.del(cacheKey);
        console.log(`🗑️ Dashboard Cache Deleted for User: ${enrollment.userId}`);

        return res.status(201).json({
            success: true,
            message: 'Payment recorded successfully!',
            data: {
                paymentId: result.id,
                amountPaid: result.amount,
                remainingBalance: newRemainingBalance
            }
        });

    } catch (error) {
        if (error.errors) return res.status(400).json({ success: false, error: error.errors[0].message });
        return res.status(500).json({ success: false, error: 'Payment failed: ' + error.message });
    }
};