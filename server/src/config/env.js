require('dotenv').config();

const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET'];

for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}. Check your .env file.`);
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  mongoUriTest: process.env.MONGODB_URI_TEST,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || '',
  autoCloseDays: parseInt(process.env.AUTO_CLOSE_DAYS, 10) || 7,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
  sladays: {
    High: 2,
    Medium: 5,
    Low: 7,
  },
};

module.exports = config;
