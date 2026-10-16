import { PrismaClient } from '@prisma/client';

// Pure application mein ek hi Prisma instance reuse hoga
export const prisma = new PrismaClient({
    log: ['error', 'warn'] // Console me sirf zaroori errors dikhayega
});