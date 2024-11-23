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

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Import and use the backend app
const backendApp = require('./dist/app').default;
app.use('/api', backendApp);

// Serve index.html for all other routes (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
