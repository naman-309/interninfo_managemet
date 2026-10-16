import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().trim().min(2, 'Naam kam se kam 2 characters ka hona chahiye'),
    email: z.string().trim().email('Sahi email address enter karein'),
    phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number exactly 10 digits ka hona chahiye'),
    password: z.string().min(6, 'Password kam se kam 6 characters ka hona chahiye'),
    gender: z.string().trim().min(1, 'Gender compulsory hai (MALE, FEMALE, ya OTHER)'),
    address: z.string().trim().min(3, 'Address/City compulsory hai'),
    qualification: z.string().trim().min(2, 'College ya qualification compulsory hai')
});


// login validaion 
export const loginSchema = z.object({
    email: z.string().trim().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required")
});

//forgot  pass
export const forgotPasswordSchema = z.object({
    email: z.string().trim().email("Please enter a valid email address")
});

//reset pass 

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters")
});