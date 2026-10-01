/**
 * tests/setup.js
 *
 * Global test helpers: connects to MONGODB_URI_TEST before all tests,
 * disconnects and drops the test DB after all tests.
 * Required at the top of each test file via require('./setup').
 */

const mongoose = require('mongoose');

// Load env before anything else
require('dotenv').config();

const TEST_URI = process.env.MONGODB_URI_TEST;
if (!TEST_URI) {
  throw new Error('MONGODB_URI_TEST must be set in .env for tests');
}

beforeAll(async () => {
  // Suppress mongoose deprecation warnings in test output
  await mongoose.connect(TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
