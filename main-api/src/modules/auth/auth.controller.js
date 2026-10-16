import bcrypt from 'bcrypt'
import crypto from 'crypto'; // Upar import list me add karein
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation.js';
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


// 3. Forgot Password Request
export const forgotPassword = async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });

        // Security Rule: Hamesha same message bhejo
        const successMessage = 'If that email is registered, we have sent a password reset link.';

        if (!user) {
            return res.status(200).json({ success: true, message: successMessage });
        }

        // A. Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // B. Create a hash of this token to save in DB (Security)
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // C. Token will expire in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // D. Transaction: Save token AND outbox event
        await prisma.$transaction(async (tx) => {
            await tx.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash: tokenHash,
                    expiresAt: expiresAt
                }
            });

            // Notification outbox me event daal diya email bhejne ke liye
            await tx.notificationOutbox.create({
                data: {
                    eventType: 'PASSWORD_RESET_REQUESTED',
                    payload: {
                        studentName: user.name,
                        studentEmail: user.email,
                        resetToken: resetToken // Actual token email me jayega
                    }
                }
            });
        });

        return res.status(200).json({ success: true, message: successMessage });
    } catch (error) {
        if (error.errors) return res.status(400).json({ success: false, error: error.errors[0].message });
        return res.status(500).json({ success: false, error: 'Request failed.' });
    }
};

// 4. Reset Password Logic
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = resetPasswordSchema.parse(req.body);

        // A. Hash the incoming token to search in DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const resetRecord = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: tokenHash }
        });

        // B. Verify Token: Check if it exists, is not used, and is not expired
        if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
            return res.status(400).json({ success: false, error: 'Invalid or expired reset token.' });
        }

        // C. Hash the new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // D. Transaction: Update password AND mark token as used
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: resetRecord.userId },
                data: { passwordHash: newPasswordHash }
            });

            await tx.passwordResetToken.update({
                where: { id: resetRecord.id },
                data: { usedAt: new Date() }
            });
        });

        return res.status(200).json({ success: true, message: 'Password updated successfully. You can now login.' });
    } catch (error) {
        if (error.errors) return res.status(400).json({ success: false, error: error.errors[0].message });
        return res.status(500).json({ success: false, error: 'Password reset failed.' });
    }
};