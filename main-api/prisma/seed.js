import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Database seeding shuru ho rahi hai...');

    // Default courses jo institute offer karta hai
    const courses = [
        { name: 'MERN Stack Web Development' },
        { name: 'Java Full Stack Development' },
        { name: 'Python Data Science & AI' }
    ];

    for (const course of courses) {
        // upsert ka matlab: agar course already hai to kuch mat karo, nahi hai to create karo
        await prisma.course.upsert({
            where: { name: course.name },
            update: {},
            create: {
                name: course.name,
                isActive: true
            }
        });
    }

    console.log('✅ Default Courses database mein successfully add ho gaye!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding mein error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });