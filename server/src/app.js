const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('./config/env');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const userRoutes = require('./routes/user.routes');
const complaintRoutes = require('./routes/complaint.routes');
const { authenticate, authorize } = require('./middleware/auth');
const { sendSuccess } = require('./utils/response');

// Ensure the upload directory exists before any request hits the upload middleware
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
app.use('/api/complaints', complaintRoutes);

if (config.nodeEnv === 'test') {
  app.get(
    '/api/_debug/officer-only',
    authenticate,
    authorize('officer', 'admin'),
    (req, res) => sendSuccess(res, { role: req.user.role })
  );

  // Backdate resolvedAt on a complaint so the auto-close smoke test can trigger it
  app.patch(
    '/api/_debug/backdate/:id',
    authenticate,
    authorize('admin'),
    async (req, res) => {
      const Complaint = require('./models/Complaint');
      const days = parseInt(req.body.days, 10) || 8;
      const resolvedAt = new Date();
      resolvedAt.setDate(resolvedAt.getDate() - days);
      const c = await Complaint.findByIdAndUpdate(
        req.params.id,
        { $set: { resolvedAt } },
        { returnDocument: 'after' }
      );
      return sendSuccess(res, c);
    }
  );

  // Trigger the auto-close job on demand (no waiting for the hourly cron)
  app.post(
    '/api/_debug/run-autoclose',
    authenticate,
    authorize('admin'),
    async (req, res) => {
      const { autoCloseResolved } = require('./jobs/autoClose');
      const count = await autoCloseResolved();
      return sendSuccess(res, { closed: count });
    }
  );
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
