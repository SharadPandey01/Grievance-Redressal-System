/**
 * tests/api.test.js
 *
 * Jest + Supertest integration suite.
 * Uses MONGODB_URI_TEST — never touches the dev database.
 * TC-01 … TC-08 match the blueprint IDs, plus extended coverage.
 */

require('dotenv').config();
require('./setup'); // connects/disconnects the test DB

const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');

// Models (cleared before each group)
const User      = require('../src/models/User');
const Category  = require('../src/models/Category');
const Complaint = require('../src/models/Complaint');
const StatusLog = require('../src/models/StatusLog');
const Comment   = require('../src/models/Comment');
const Feedback  = require('../src/models/Feedback');
const Counter   = require('../src/models/Counter');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** POST shorthand */
const post = (url, body, token) => {
  const r = request(app).post(url).send(body);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};
const patch = (url, body, token) => {
  const r = request(app).patch(url).send(body);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};
const get = (url, token) => {
  const r = request(app).get(url);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};

/** Clear all collections between test groups. */
async function clearDB() {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Complaint.deleteMany({}),
    StatusLog.deleteMany({}),
    Comment.deleteMany({}),
    Feedback.deleteMany({}),
    Counter.deleteMany({}),
  ]);
}

/** Register a user and return { token, userId }. */
async function registerAndLogin(data) {
  const reg = await post('/api/auth/register', data);
  const log = await post('/api/auth/login', { email: data.email, password: data.password });
  return { token: log.body.data.token, userId: log.body.data.user._id };
}

/** Directly insert an officer/admin into the DB (cannot self-register those roles). */
async function createUser(data) {
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(data.password, 10);
  return User.create({ ...data, passwordHash });
}

/** Login an existing user. */
async function login(email, password = 'Password@123') {
  const res = await post('/api/auth/login', { email, password });
  return { token: res.body.data?.token, userId: res.body.data?.user?._id };
}

/** Create an active category in the DB. */
async function createCategory(data) {
  return Category.create({ isActive: true, ...data });
}

/** File a complaint via HTTP as a given user. */
async function fileComplaint(token, catId, extra = {}) {
  const res = await request(app)
    .post('/api/complaints')
    .set('Authorization', `Bearer ${token}`)
    .field('title', extra.title || 'Test complaint about facility issue')
    .field('description', extra.description || 'This is a detailed description that meets the minimum length requirement.')
    .field('category', catId)
    .field('priority', extra.priority || 'Medium')
    .field('isAnonymous', String(extra.isAnonymous || false));
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TC-01 — TC-03: Authentication
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth — TC-01, TC-02, TC-03', () => {
  beforeEach(clearDB);

  // TC-01: Register valid student
  test('TC-01 register valid student → 201, no token in response', async () => {
    const res = await post('/api/auth/register', {
      name: 'Alice Student',
      email: 'alice@example.com',
      password: 'Password@123',
      role: 'student',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('alice@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.token).toBeUndefined();
  });

  // TC-02: Login valid returns token
  test('TC-02 login valid → 200, token and user returned', async () => {
    await post('/api/auth/register', {
      name: 'Alice Student', email: 'alice@example.com',
      password: 'Password@123', role: 'student',
    });
    const res = await post('/api/auth/login', {
      email: 'alice@example.com', password: 'Password@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // TC-03: Wrong password → 401 (generic message)
  test('TC-03 login wrong password → 401 generic message', async () => {
    await post('/api/auth/register', {
      name: 'Alice Student', email: 'alice@example.com',
      password: 'Password@123', role: 'student',
    });
    const res = await post('/api/auth/login', {
      email: 'alice@example.com', password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('register with role officer → 400 (public cannot self-register officer)', async () => {
    const res = await post('/api/auth/register', {
      name: 'Rogue Officer', email: 'rogue@example.com',
      password: 'Password@123', role: 'officer',
    });
    expect(res.status).toBe(400);
  });

  test('duplicate email register → 409', async () => {
    await post('/api/auth/register', {
      name: 'Alice', email: 'alice@example.com',
      password: 'Password@123', role: 'student',
    });
    const res = await post('/api/auth/register', {
      name: 'Alice 2', email: 'alice@example.com',
      password: 'Password@123', role: 'student',
    });
    expect(res.status).toBe(409);
  });

  test('login non-existent email → 401 generic message', async () => {
    const res = await post('/api/auth/login', {
      email: 'nobody@example.com', password: 'Password@123',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('GET /api/auth/me without token → 401', async () => {
    const res = await get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me with valid token → 200', async () => {
    const { token } = await registerAndLogin({
      name: 'Alice', email: 'alice@example.com',
      password: 'Password@123', role: 'student',
    });
    const res = await get('/api/auth/me', token);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('alice@example.com');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TC-04, TC-05: Complaints core
// ═══════════════════════════════════════════════════════════════════════════════

describe('Complaints core — TC-04, TC-05', () => {
  let studentToken, cat;

  beforeEach(async () => {
    await clearDB();
    const { token } = await registerAndLogin({
      name: 'S1', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = token;
    cat = await createCategory({ name: 'Test Cat', department: 'IT', description: 'desc' });
  });

  // TC-04: Valid complaint → 201, status Submitted, code generated
  test('TC-04 file valid complaint → 201, status Submitted, code GRV-YYYY-NNNN', async () => {
    const res = await fileComplaint(studentToken, cat._id.toString());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Submitted');
    expect(res.body.data.code).toMatch(/^GRV-\d{4}-\d{4}$/);
    const logsCount = await StatusLog.countDocuments({ complaint: res.body.data._id });
    expect(logsCount).toBeGreaterThanOrEqual(1);
  });

  // TC-05: Missing title → 400, nothing saved
  test('TC-05 missing title → 400, complaint not saved in DB', async () => {
    const countBefore = await Complaint.countDocuments();
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('description', 'A detailed enough description for the complaint here.')
      .field('category', cat._id.toString());
    expect(res.status).toBe(400);
    const countAfter = await Complaint.countDocuments();
    expect(countAfter).toBe(countBefore);
  });

  test('title too short → 400', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('title', 'Hi')
      .field('description', 'A detailed enough description for the complaint here.')
      .field('category', cat._id.toString());
    expect(res.status).toBe(400);
  });

  test('description too short → 400', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('title', 'Valid title for complaint')
      .field('description', 'Too short.')
      .field('category', cat._id.toString());
    expect(res.status).toBe(400);
  });

  test('officer cannot file a complaint → 403', async () => {
    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    const { token: offToken } = await login('officer@test.com');
    const res = await fileComplaint(offToken, cat._id.toString());
    expect(res.status).toBe(403);
  });

  test(`student cannot see another student's complaint → 403`, async () => {
    const { token: tok1 } = await registerAndLogin({
      name: 'S2', email: 'student2@test.com', password: 'Password@123', role: 'student',
    });
    const c1 = await fileComplaint(studentToken, cat._id.toString());
    const res = await get(`/api/complaints/${c1.body.data._id}`, tok1);
    expect(res.status).toBe(403);
  });

  test('list complaints — student sees only own', async () => {
    const { token: tok2 } = await registerAndLogin({
      name: 'S2', email: 'student2@test.com', password: 'Password@123', role: 'student',
    });
    await fileComplaint(studentToken, cat._id.toString());
    await fileComplaint(tok2, cat._id.toString());
    const res = await get('/api/complaints', studentToken);
    expect(res.status).toBe(200);
    // Student should only see their own
    expect(res.body.data.every(c => c.filedBy !== null)).toBe(true);
    expect(res.body.meta.total).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TC-06, TC-07, TC-08: Workflow
// ═══════════════════════════════════════════════════════════════════════════════

describe('Workflow — TC-06, TC-07, TC-08', () => {
  let studentToken, officerToken, adminToken, officerId, catId, complaintId;

  beforeEach(async () => {
    await clearDB();

    // Create users
    const student = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = student.token;

    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    officerId = officer._id.toString();
    const off = await login('officer@test.com');
    officerToken = off.token;

    const admin = await createUser({
      name: 'Admin', email: 'admin@test.com', password: 'Password@123', role: 'admin',
    });
    const adm = await login('admin@test.com');
    adminToken = adm.token;

    const cat = await createCategory({ name: 'IT Cat', department: 'IT', description: 'IT issues' });
    catId = cat._id.toString();

    const c = await fileComplaint(studentToken, catId);
    complaintId = c.body.data._id;
  });

  // TC-06: Assign → status becomes Acknowledged
  test('TC-06 assign complaint → status Acknowledged, StatusLog written', async () => {
    const res = await patch(`/api/complaints/${complaintId}/assign`,
      { assigneeId: officerId }, officerToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Acknowledged');
    const logs = await StatusLog.find({ complaint: complaintId });
    expect(logs.some(l => l.toStatus === 'Acknowledged')).toBe(true);
  });

  // TC-07: Resolve → status Resolved, StatusLog written with resolutionNotes
  test('TC-07 full path to Resolved → StatusLog includes Resolved entry', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Working on this issue now' }, officerToken);
    const res = await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved',
      note: 'Issue fully resolved',
      resolutionNotes: 'The root cause was identified and fixed permanently.',
    }, officerToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Resolved');
    expect(res.body.data.resolvedAt).toBeTruthy();
    const logs = await StatusLog.find({ complaint: complaintId });
    expect(logs.some(l => l.toStatus === 'Resolved')).toBe(true);
  });

  // TC-08: Student hitting officer-only route → 403
  test('TC-08 student hitting officer-only assign route → 403', async () => {
    const res = await patch(`/api/complaints/${complaintId}/assign`,
      { assigneeId: officerId }, studentToken);
    expect(res.status).toBe(403);
  });

  // Illegal transitions
  test('Submitted → Resolved directly → 409 (illegal transition)', async () => {
    const res = await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Jumping ahead', resolutionNotes: 'Skip logic.',
    }, officerToken);
    expect(res.status).toBe(409);
  });

  test('Submitted → Closed directly → 409', async () => {
    const res = await post(`/api/complaints/${complaintId}/verify`, {}, studentToken);
    expect(res.status).toBe(409);
  });

  test('Resolved → Submitted → 409 (illegal backward transition)', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Starting work' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Done', resolutionNotes: 'Fixed the issue completely.',
    }, officerToken);
    const res = await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'Submitted', note: 'Going back' }, officerToken);
    expect(res.status).toBe(409);
  });

  test('Cannot change status of Closed complaint → 409', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Starting work' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Done', resolutionNotes: 'Fixed.',
    }, officerToken);
    await post(`/api/complaints/${complaintId}/verify`, {}, studentToken);
    const res = await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Reopening by status' }, officerToken);
    expect(res.status).toBe(409);
  });

  test('Verify by non-owner → 403', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'On it' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Done', resolutionNotes: 'Fixed it all.',
    }, officerToken);
    const { token: tok2 } = await registerAndLogin({
      name: 'S2', email: 'student2@test.com', password: 'Password@123', role: 'student',
    });
    const res = await post(`/api/complaints/${complaintId}/verify`, {}, tok2);
    expect(res.status).toBe(403);
  });

  test('Reopen requires reason ≥ 10 chars → 400 if missing', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Working' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Done', resolutionNotes: 'Fixed everything properly.',
    }, officerToken);
    const res = await post(`/api/complaints/${complaintId}/reopen`, { reason: 'nope' }, studentToken);
    expect(res.status).toBe(400);
  });

  test('Feedback once only — duplicate → 409', async () => {
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Started' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Fixed', resolutionNotes: 'All fixed now.',
    }, officerToken);
    await post(`/api/complaints/${complaintId}/verify`, {}, studentToken);
    await post(`/api/complaints/${complaintId}/feedback`, { rating: 4 }, studentToken);
    const res = await post(`/api/complaints/${complaintId}/feedback`, { rating: 3 }, studentToken);
    expect(res.status).toBe(409);
  });

  test('Feedback on non-Closed complaint → 409', async () => {
    const res = await post(`/api/complaints/${complaintId}/feedback`, { rating: 4 }, studentToken);
    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Access scoping per role
// ═══════════════════════════════════════════════════════════════════════════════

describe('Access scoping per role', () => {
  let studentToken, officerToken, adminToken, officerId, catId, complaintId;

  beforeEach(async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;

    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    officerId = officer._id.toString();
    const off = await login('officer@test.com');
    officerToken = off.token;

    await createUser({ name: 'Admin', email: 'admin@test.com', password: 'Password@123', role: 'admin' });
    const adm = await login('admin@test.com');
    adminToken = adm.token;

    const cat = await createCategory({ name: 'IT', department: 'IT', description: 'desc' });
    catId = cat._id.toString();
    const c = await fileComplaint(studentToken, catId);
    complaintId = c.body.data._id;
  });

  test('admin can see all complaints', async () => {
    const res = await get('/api/complaints', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  test('officer sees unassigned pool in their dept', async () => {
    // Complaint in IT dept, not assigned — officer in IT should see it via scope=unassigned
    const res = await get('/api/complaints?scope=unassigned', officerToken);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  test('officer from other dept cannot access complaint via unassigned pool', async () => {
    const officer2 = await createUser({
      name: 'Hostel Officer', email: 'off2@test.com', password: 'Password@123',
      role: 'officer', department: 'Hostel',
    });
    const { token: tok2 } = await login('off2@test.com');
    // Complaint is in IT dept — hostel officer shouldn't see it
    const res = await get(`/api/complaints/${complaintId}`, tok2);
    expect(res.status).toBe(403);
  });

  test('admin can access category management, student cannot', async () => {
    const res1 = await post('/api/categories', {
      name: 'New Cat', department: 'Hostel', description: 'desc',
    }, adminToken);
    expect(res1.status).toBe(201);

    const res2 = await post('/api/categories', {
      name: 'New Cat 2', department: 'Hostel', description: 'desc',
    }, studentToken);
    expect(res2.status).toBe(403);
  });

  test('student cannot access /api/users (admin-only)', async () => {
    const res = await get('/api/users', studentToken);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Anonymous masking
// ═══════════════════════════════════════════════════════════════════════════════

describe('Anonymous masking', () => {
  let studentToken, officerToken, officerId, catId;

  beforeEach(async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;

    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    officerId = officer._id.toString();
    const off = await login('officer@test.com');
    officerToken = off.token;

    const cat = await createCategory({ name: 'IT', department: 'IT', description: 'desc' });
    catId = cat._id.toString();
  });

  test('anonymous complaint — officer sees filedBy null / filedByLabel Anonymous', async () => {
    const res = await fileComplaint(studentToken, catId, { isAnonymous: true });
    const cId = res.body.data._id;

    await patch(`/api/complaints/${cId}/assign`, { assigneeId: officerId }, officerToken);
    const view = await get(`/api/complaints/${cId}`, officerToken);
    expect(view.status).toBe(200);
    // filedBy should be null (masked) and filedByLabel should be 'Anonymous'
    expect(view.body.data.filedBy).toBeNull();
    expect(view.body.data.filedByLabel).toBe('Anonymous');
  });

  test('anonymous complaint — owner sees own filedBy', async () => {
    const res = await fileComplaint(studentToken, catId, { isAnonymous: true });
    const cId = res.body.data._id;
    const view = await get(`/api/complaints/${cId}`, studentToken);
    expect(view.status).toBe(200);
    expect(view.body.data.filedBy).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Comments: visibility, internal, closed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Comments', () => {
  let studentToken, officerToken, officerId, catId, complaintId;

  beforeEach(async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;

    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    officerId = officer._id.toString();
    const off = await login('officer@test.com');
    officerToken = off.token;

    const cat = await createCategory({ name: 'IT', department: 'IT', description: 'desc' });
    catId = cat._id.toString();
    const c = await fileComplaint(studentToken, catId);
    complaintId = c.body.data._id;
    // Assign so officer has access
    await patch(`/api/complaints/${complaintId}/assign`, { assigneeId: officerId }, officerToken);
  });

  test('officer can post internal note; student cannot see it', async () => {
    await post(`/api/complaints/${complaintId}/comments`,
      { text: 'Internal: escalating to management', isInternal: true }, officerToken);
    const res = await get(`/api/complaints/${complaintId}/comments`, studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.every(c => !c.isInternal)).toBe(true);
  });

  test('officer can see internal note', async () => {
    await post(`/api/complaints/${complaintId}/comments`,
      { text: 'Internal: escalating to management', isInternal: true }, officerToken);
    const res = await get(`/api/complaints/${complaintId}/comments`, officerToken);
    expect(res.body.data.some(c => c.isInternal)).toBe(true);
  });

  test('student setting isInternal:true → 403', async () => {
    const res = await post(`/api/complaints/${complaintId}/comments`,
      { text: 'Can I post internal?', isInternal: true }, studentToken);
    expect(res.status).toBe(403);
  });

  test('comment on Closed complaint → 409', async () => {
    await patch(`/api/complaints/${complaintId}/status`,
      { toStatus: 'In Progress', note: 'Working on it' }, officerToken);
    await patch(`/api/complaints/${complaintId}/status`, {
      toStatus: 'Resolved', note: 'Fixed', resolutionNotes: 'Root cause fixed.',
    }, officerToken);
    await post(`/api/complaints/${complaintId}/verify`, {}, studentToken);
    const res = await post(`/api/complaints/${complaintId}/comments`,
      { text: 'Posting after close' }, studentToken);
    expect(res.status).toBe(409);
  });

  test('comment text too short → 400', async () => {
    const res = await post(`/api/complaints/${complaintId}/comments`,
      { text: '' }, studentToken);
    expect(res.status).toBe(400);
  });

  test('anonymous complaint comment masking — officer sees Anonymous for complainant', async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    const offLogin = await login('officer@test.com');
    const cat = await createCategory({ name: 'IT', department: 'IT', description: 'desc' });

    const c = await fileComplaint(s.token, cat._id.toString(), { isAnonymous: true });
    const cId = c.body.data._id;
    await patch(`/api/complaints/${cId}/assign`, { assigneeId: officer._id.toString() }, offLogin.token);

    await post(`/api/complaints/${cId}/comments`, { text: 'My name should be hidden' }, s.token);
    const res = await get(`/api/complaints/${cId}/comments`, offLogin.token);
    expect(res.status).toBe(200);
    expect(res.body.data[0].author.name).toBe('Anonymous');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════════════════════════════════════════

describe('Analytics', () => {
  let studentToken, adminToken;

  beforeEach(async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;

    await createUser({ name: 'Admin', email: 'admin@test.com', password: 'Password@123', role: 'admin' });
    const adm = await login('admin@test.com');
    adminToken = adm.token;
  });

  test('GET /api/analytics/summary without auth → 401', async () => {
    const res = await get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });

  test('GET /api/analytics/summary as student → 403', async () => {
    const res = await get('/api/analytics/summary', studentToken);
    expect(res.status).toBe(403);
  });

  test('GET /api/analytics/summary as admin → 200 with required shape', async () => {
    const res = await get('/api/analytics/summary', adminToken);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toBeDefined();
    expect(Array.isArray(d.byStatus)).toBe(true);
    expect(d.byStatus.length).toBe(5);
    expect(Array.isArray(d.monthlyTrend)).toBe(true);
    expect(d.monthlyTrend.length).toBe(6);
    expect(typeof d.avgResolutionHours).toBe('number');
    expect(typeof d.reopenRate).toBe('number');
  });

  test('GET /api/analytics/my-summary as student → 200 with byStatus + awaitingVerification', async () => {
    const res = await get('/api/analytics/my-summary', studentToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.byStatus)).toBe(true);
    expect(typeof res.body.data.awaitingVerification).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin guards: category, user, last-admin
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin guards', () => {
  let adminToken, adminId, studentToken;

  beforeEach(async () => {
    await clearDB();
    const admin = await createUser({
      name: 'Admin', email: 'admin@test.com', password: 'Password@123', role: 'admin',
    });
    adminId = admin._id.toString();
    const adm = await login('admin@test.com');
    adminToken = adm.token;

    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;
  });

  test('last admin cannot be deactivated → 409', async () => {
    const res = await patch(`/api/users/${adminId}`, { isActive: false }, adminToken);
    expect(res.status).toBe(409);
  });

  test('admin cannot deactivate themselves → 409', async () => {
    const res = await patch(`/api/users/${adminId}`, { isActive: false }, adminToken);
    expect(res.status).toBe(409);
  });

  test('create category with duplicate name → 409', async () => {
    await post('/api/categories', { name: 'DupCat', department: 'IT', description: 'desc' }, adminToken);
    const res = await post('/api/categories', { name: 'DupCat', department: 'IT', description: 'desc' }, adminToken);
    expect(res.status).toBe(409);
  });

  test('soft-delete category → isActive becomes false', async () => {
    const cat = await post('/api/categories', { name: 'TempCat', department: 'IT', description: 'desc' }, adminToken);
    const catId = cat.body.data._id;
    const res = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const inDb = await Category.findById(catId);
    expect(inDb.isActive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sanitize middleware
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sanitize middleware', () => {
  test('MongoDB operator in login body is stripped — no operator injection', async () => {
    // Sending { email: { $gt: "" } } — after sanitize, $gt key is removed
    // The server should return 400 (empty email) or 401, never 200
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'anything' });
    expect([400, 401]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Attachment access control
// ═══════════════════════════════════════════════════════════════════════════════

describe('Attachment access control', () => {
  let studentToken, officerToken, officerId, catId, complaintId;

  beforeEach(async () => {
    await clearDB();
    const s = await registerAndLogin({
      name: 'Student', email: 'student@test.com', password: 'Password@123', role: 'student',
    });
    studentToken = s.token;

    const officer = await createUser({
      name: 'Officer', email: 'officer@test.com', password: 'Password@123',
      role: 'officer', department: 'IT',
    });
    officerId = officer._id.toString();
    const off = await login('officer@test.com');
    officerToken = off.token;

    const cat = await createCategory({ name: 'IT', department: 'IT', description: 'desc' });
    catId = cat._id.toString();
    const c = await fileComplaint(studentToken, catId);
    complaintId = c.body.data._id;
  });

  test('attachment with fake filename returns 404', async () => {
    const res = await get(`/api/complaints/${complaintId}/attachments/nonexistent.pdf`, studentToken);
    expect(res.status).toBe(404);
  });

  test('unauthenticated attachment access → 401', async () => {
    const res = await get(`/api/complaints/${complaintId}/attachments/some.pdf`);
    expect(res.status).toBe(401);
  });

  test('another student cannot access attachment → 403', async () => {
    const { token: tok2 } = await registerAndLogin({
      name: 'S2', email: 'student2@test.com', password: 'Password@123', role: 'student',
    });
    const res = await get(`/api/complaints/${complaintId}/attachments/some.pdf`, tok2);
    expect(res.status).toBe(403);
  });
});
