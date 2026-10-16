import dotenv from 'dotenv';
import app from './app.js';
import { runOutboxWorker } from './jobs/outboxPublisher.js'; // Import the worker

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Main API running on http://localhost:${PORT}`);
    console.log(`=================================`);

    // Jaise hi server start ho, Worker ko bhi chalu kar do
    runOutboxWorker();
});