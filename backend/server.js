const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://dropboxsearch-production.up.railway.app']
    : 'http://localhost:5173',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Import the backend app
const backendApp = require('./dist/app').default;

// API routes - Mount the backend app at /api/auth
app.use('/api/auth', backendApp);

// Serve static files from the frontend build directory
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));

// Serve index.html for all other routes (for client-side routing)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
