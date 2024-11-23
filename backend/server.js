const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle API routes
app.use('/api', require('./dist/app').default);

// Serve index.html for all other routes (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
