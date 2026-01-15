import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import { initLogger } from './utils/devLogger.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { startRecurringExpensesCron } from './utils/recurringExpenses.js';

dotenv.config();

// Initialize dev logger if in dev mode
initLogger();

// Start recurring expenses scheduler
startRecurringExpensesCron();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware (should be after body parser)
app.use(requestLoggerMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (process.env.DEV_MODE === 'true') {
    console.log('⚠️  DEV_MODE enabled - OTPs will be logged to console instead of sent via SMS');
  }
});
