import { prisma } from '../config/db.js';
import { redisPublisher } from '../config/redis.js';

export const runOutboxWorker = () => {
    console.log('⚙️ Outbox Worker Started: Waiting for new emails to send...');

    // Har 5 second me ye function chalega
    setInterval(async () => {
        try {
            // 1. Un messages ko dhoondo jinka status 'PENDING' hai aur 5 se kam baar fail hue hain
            const pendingEvents = await prisma.notificationOutbox.findMany({
                where: { status: 'PENDING', attempts: { lt: 5 } },
                take: 10, // Ek baar me max 10 messages uthao
                orderBy: { createdAt: 'asc' }
            });

            if (pendingEvents.length === 0) return; // Agar kuch nahi hai to chup chap wapas jao

            // 2. Har pending message ko Redis par bhej do
            for (const event of pendingEvents) {
                try {
                    const channel = process.env.NOTIFICATION_EVENT_CHANNEL || 'interninfotech:notifications';

                    // Redis Pub/Sub par publish karna
                    await redisPublisher.publish(channel, JSON.stringify({
                        eventId: event.id,
                        eventType: event.eventType,
                        payload: event.payload
                    }));

                    // 3. Agar Redis par chala gaya, toh DB mein status 'PUBLISHED' kar do
                    await prisma.notificationOutbox.update({
                        where: { id: event.id },
                        data: { status: 'PUBLISHED' }
                    });

                    console.log(`📤 Event Published to Redis: ${event.eventType}`);

                } catch (pubError) {
                    // Agar Redis par bhejne mein error aaya, toh attempt count badha do
                    await prisma.notificationOutbox.update({
                        where: { id: event.id },
                        data: { attempts: { increment: 1 } }
                    });
                    console.error(`❌ Failed to publish event: ${event.id}`);
                }
            }
        } catch (err) {
            console.error('Outbox Worker Error:', err.message);
        }
    }, 5000); // 5000 milliseconds = 5 seconds
};