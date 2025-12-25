import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import surveyRoutes from './routes/surveys.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srvs';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✓ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    console.log('Continuing without database connection...');
  });

// Health check route
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'Server is running',
    database: status
  });
});

// Survey routes
app.use('/api/surveys', surveyRoutes);

// Sync routes
app.use('/api', syncRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'SRVS Backend API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
