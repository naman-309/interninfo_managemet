import dotenv from 'dotenv';
import app from './app.js';

// .env file load karna
dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Main API running on http://localhost:${PORT}`);
    console.log(`=================================`);
});