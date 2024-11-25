import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { createConnection } from 'typeorm';
import authRoutes from './routes/auth.routes';

const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://dropboxsearch-production.up.railway.app']
    : 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/', authRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Send more detailed error in development
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Something went wrong!';
    
  res.status(500).json({ 
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await createConnection();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error; // Let the error propagate to show connection issues
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
