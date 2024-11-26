import express from 'express';
import dotenv from 'dotenv';
import authRouter from './routes/auth.routes';
import { AppDataSource } from './data-source';

dotenv.config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use(authRouter);

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection initialized');
  })
  .catch((error) => {
    console.error('Error initializing database connection:', error);
  });

export default app;
