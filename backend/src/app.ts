import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './data-source';
import authRoutes from './routes/auth.routes';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://dropboxsearch-production.up.railway.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors({
  origin: [
    'https://dropboxsearch-production.up.railway.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Routes
app.use('/', authRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Send more detailed error in development
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Something went wrong!';
    
  res.status(500).json({ success: false, message });
});

// Database connection and server start
const startServer = async () => {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

// Start server if running directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
