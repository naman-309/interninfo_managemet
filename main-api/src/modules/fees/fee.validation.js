import { z } from 'zod';

export const paymentSchema = z.object({
    amount: z.number().positive("Amount must be greater than zero"),
    paymentMode: z.enum(['CASH', 'ONLINE'], {
        errorMap: () => ({ message: "Payment mode must be CASH or ONLINE" })
    }),
    note: z.string().optional() // Note is optional
});