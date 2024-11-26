import express from 'express';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { AppDataSource } from './data-source';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://dropboxsearch-production.up.railway.app',
  'http://localhost:5173'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

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
