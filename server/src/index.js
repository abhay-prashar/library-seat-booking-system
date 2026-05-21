require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { startCronJobs } = require('./jobs/bookingJobs');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

// Environment variable validation
if (!process.env.MONGO_URI) {
  console.error('CRITICAL ERROR: MONGO_URI environment variable is missing.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    startCronJobs();
  });
}).catch((err) => {
  logger.error('Failed to connect to database:', err);
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
