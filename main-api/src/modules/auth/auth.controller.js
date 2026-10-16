import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { registerSchema } from './auth.validation.js';

export const registerStudent = async (req, res) => {
    try {
        // 1. Zod se input data check karna
        const validatedData = registerSchema.parse(req.body);

        // 2. Check karna ki email already exist toh nahi karta
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Yeh email already registered hai'
            });
        }

        // 3. Password ko hash (encrypt) karna
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

        // 4. Database mein student create karna (Rule: strictly USER aur PENDING status)
        const newUser = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone,
                gender: validatedData.gender,
                address: validatedData.address,
                qualification: validatedData.qualification,
                passwordHash: passwordHash,
                role: 'USER',               // Koi bhi form se Admin nahi ban sakta
                accountStatus: 'PENDING'    // Approval ke bina dashboard access nahi hoga
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                accountStatus: true,
                createdAt: true
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful!  account verification is   PENDING .',
            data: newUser
        });
    } catch (error) {
        // Zod validation error handling
        if (error.errors) {
            return res.status(400).json({
                success: false,
                error: error.errors[0].message
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Registration failed: ' + error.message
        });
    }
};