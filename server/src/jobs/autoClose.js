const cron = require('node-cron');
const { autoCloseResolved } = require('../services/workflowService');
const logger = require('../utils/logger');

/**
 * Start the hourly cron job that auto-closes Resolved complaints
 * older than AUTO_CLOSE_DAYS.
 * Called from server.js AFTER the DB is connected.
 */
function startAutoCloseJob() {
  // '0 * * * *' = at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Auto-close job: scanning for overdue Resolved complaints...');
    try {
      const count = await autoCloseResolved();
      logger.info(`Auto-close job: closed ${count} complaint(s)`);
    } catch (err) {
      logger.error(`Auto-close job error: ${err.message}`);
    }
  });

  logger.info('Auto-close cron job registered (runs every hour at :00)');
}

// Re-export autoCloseResolved so tests can invoke it directly
// without importing workflowService (keeps test imports simple)
module.exports = { startAutoCloseJob, autoCloseResolved };
