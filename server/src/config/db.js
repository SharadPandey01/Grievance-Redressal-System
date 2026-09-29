const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB(uri) {
  const connectionUri = uri || require('./env').mongoUri;
  await mongoose.connect(connectionUri);
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

module.exports = connectDB;
