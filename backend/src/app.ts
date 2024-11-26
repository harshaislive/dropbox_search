import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import authRouter from './routes/auth.routes';
import { AppDataSource } from './data-source';

dotenv.config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../../dist')));

// API routes
app.use('/api', authRouter);

// Serve index.html for all other routes (client-side routing)
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection initialized');
  })
  .catch((error) => {
    console.error('Error initializing database connection:', error);
  });

export default app;
