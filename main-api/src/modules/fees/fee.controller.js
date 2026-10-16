import { prisma } from '../../config/db.js';
import { paymentSchema } from './fee.validation.js';

export const recordPayment = async (req, res) => {
    try {
        const enrollmentId = req.params.enrollmentId;
        const validatedData = paymentSchema.parse(req.body);

        // 1. Fetch the enrollment to check the total fee and student details
        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                payments: true, // Bring all old payments to calculate balance
                user: { select: { name: true, email: true } },
                course: { select: { name: true } }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }

        // 2. Calculate remaining balance
        // Reduce function adds up all old payment amounts
        const totalPaid = enrollment.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalFee = parseFloat(enrollment.totalFee);
        const remainingBalance = totalFee - totalPaid;

        // 3. Check if admin is entering more money than the remaining balance
        if (validatedData.amount > remainingBalance) {
            return res.status(400).json({
                success: false,
                error: `Invalid amount. The remaining balance is only ₹${remainingBalance}`
            });
        }

        // 4. Save Payment AND Outbox Event together in one Transaction
        const newRemainingBalance = remainingBalance - validatedData.amount;

        const result = await prisma.$transaction(async (tx) => {

            // A. Save the payment
            const payment = await tx.payment.create({
                data: {
                    enrollmentId: enrollmentId,
                    amount: validatedData.amount,
                    paymentMode: validatedData.paymentMode,
                    note: validatedData.note,
                    recordedBy: req.user.userId // Admin who is logged in
                }
            });

            // B. Save the notification event for the background worker
            const outboxEvent = await tx.notificationOutbox.create({
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
        if (error.errors) {
            return res.status(400).json({ success: false, error: error.errors[0].message });
        }
        return res.status(500).json({ success: false, error: 'Payment failed: ' + error.message });
    }
};