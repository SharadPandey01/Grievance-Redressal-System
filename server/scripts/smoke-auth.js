require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;
const TEST_EMAIL = `smoke.test.${Date.now()}@campus.edu`;
const TEST_PASSWORD = 'Smoke1234';

let passed = 0;
let failed = 0;
let studentToken = '';

function check(label, result, detail = '') {
  if (result) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function cleanup() {
  const mongoose = require('mongoose');
  const User = require('../src/models/User');
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({ email: new RegExp(`smoke\\.test\\..*@campus\\.edu`) });
  await mongoose.disconnect();
}

async function run() {
  console.log('\nRunning auth smoke tests...\n');

  let r;

  r = await post('/auth/register', {
    name: 'Smoke Student',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: 'student',
  });
  check('Register new student returns 201', r.status === 201);
  check('Register response has no passwordHash', !r.body.data?.passwordHash);
  check('Register response has no token', !r.body.data?.token);

  r = await post('/auth/register', {
    name: 'Smoke Student',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: 'student',
  });
  check('Duplicate email returns 409', r.status === 409);

  r = await post('/auth/register', {
    name: 'Admin Attempt',
    email: `admin.attempt.${Date.now()}@campus.edu`,
    password: TEST_PASSWORD,
    role: 'admin',
  });
  check('Registering as admin returns 400', r.status === 400);

  r = await post('/auth/register', {
    name: 'Bad Pass',
    email: `badpass.${Date.now()}@campus.edu`,
    password: 'short',
    role: 'student',
  });
  check('Weak password returns 400', r.status === 400);

  r = await post('/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
  check('Login with correct credentials returns 200', r.status === 200);
  check('Login response contains token', typeof r.body.data?.token === 'string');
  check('Login response contains user object', typeof r.body.data?.user === 'object');
  check('Login user has no passwordHash', !r.body.data?.user?.passwordHash);
  studentToken = r.body.data?.token || '';

  r = await post('/auth/login', { email: TEST_EMAIL, password: 'WrongPass9' });
  check('Wrong password returns 401', r.status === 401);
  check('Wrong password message is generic', r.body.message === 'Invalid credentials');

  r = await post('/auth/login', { email: `nonexistent.${Date.now()}@campus.edu`, password: TEST_PASSWORD });
  check('Nonexistent email returns 401', r.status === 401);
  check('Nonexistent email message is generic (no enumeration)', r.body.message === 'Invalid credentials');

  r = await get('/auth/me', studentToken);
  check('GET /me with valid token returns 200', r.status === 200);
  check('GET /me returns the correct user', r.body.data?.email === TEST_EMAIL);

  r = await get('/auth/me');
  check('GET /me without token returns 401', r.status === 401);

  r = await get('/auth/me', 'invalid.token.here');
  check('GET /me with bad token returns 401', r.status === 401);

  r = await get('/_debug/officer-only', studentToken);
  check('Student hitting officer-only route returns 403', r.status === 403);

  console.log(`\n--- Results: ${passed} PASS, ${failed} FAIL ---\n`);

  await cleanup();

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test error:', err.message);
  process.exit(1);
});
