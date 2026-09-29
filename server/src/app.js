const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const userRoutes = require('./routes/user.routes');
const { authenticate, authorize } = require('./middleware/auth');
const { sendSuccess } = require('./utils/response');

const app = express();

app.use(helmet());

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

if (config.nodeEnv === 'test') {
  app.get(
    '/api/_debug/officer-only',
    authenticate,
    authorize('officer', 'admin'),
    (req, res) => sendSuccess(res, { role: req.user.role })
  );
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
