const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const app = require('./app');
const { startAutoCloseJob } = require('./jobs/autoClose');

async function start() {
  await connectDB();
  // Start cron jobs only after the DB is ready
  startAutoCloseJob();
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
