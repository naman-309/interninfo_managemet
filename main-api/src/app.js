import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Base health route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Main API service is live and healthy!'
    });
});

// API Routes
app.use('/api/auth', authRoutes);

export default app;