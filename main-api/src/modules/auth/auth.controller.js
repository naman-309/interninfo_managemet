import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { registerSchema } from './auth.validation.js';
import { loginSchema } from './auth.validation.js';

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


// login api 

export const loginUser = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        // 1. Find user by email
        const user = await prisma.user.findUnique({
            where: { email: validatedData.email }
        });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // 2. Compare password using bcrypt
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // 3. Create JWT Token (User ID aur Role isme save hoga)
        const tokenPayload = {
            userId: user.id,
            role: user.role,
            status: user.accountStatus
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 4. Send token in an HTTP-only Cookie
        res.cookie('token', token, {
            httpOnly: true, // Frontend JS cannot access it (Secure)
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                status: user.accountStatus
            }
        });

    } catch (error) {
        if (error.errors) {
            return res.status(400).json({ success: false, error: error.errors[0].message });
        }
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};