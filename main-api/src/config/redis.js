import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Redis connection setup
export const redisPublisher = new Redis(process.env.REDIS_CONNECTION_STRING, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        return Math.min(times * 100, 3000); // Agar Redis disconnect ho jaye toh wapas connect karne ki koshish karega
    }
});

redisPublisher.on('connect', () => {
    console.log('🟢 Redis Connected Successfully (Publisher)');
});

redisPublisher.on('error', (err) => {
    console.error('🔴 Redis Connection Error:', err.message);
});

