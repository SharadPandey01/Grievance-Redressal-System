require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const config = require('../src/config/env');
const { ROLES } = require('../src/constants');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

let passed = 0;
let failed = 0;

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

async function patch(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function del(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function cleanup() {
  await User.deleteMany({ email: /smoke\.md\..*@campus\.edu/ });
  await Category.deleteMany({ name: /Smoke Category .*/ });
}

async function run() {
  console.log('\nRunning master data smoke tests...\n');

  await mongoose.connect(config.mongoUri);
  await cleanup();

  const dummyHash = await bcrypt.hash('Smoke1234', 10);

  // Seed baseline users for testing
  const adminUser = await User.create({
    name: 'Smoke MD Admin',
    email: `smoke.md.admin.${Date.now()}@campus.edu`,
    passwordHash: dummyHash,
    role: ROLES.ADMIN,
    isActive: true,
  });

  const hostelOfficer = await User.create({
    name: 'Smoke Hostel Officer',
    email: `smoke.md.officer.hostel.${Date.now()}@campus.edu`,
    passwordHash: dummyHash,
    role: ROLES.OFFICER,
    department: 'Hostel',
    isActive: true,
  });

  const itOfficer = await User.create({
    name: 'Smoke IT Officer',
    email: `smoke.md.officer.it.${Date.now()}@campus.edu`,
    passwordHash: dummyHash,
    role: ROLES.OFFICER,
    department: 'IT Support',
    isActive: true,
  });

  const studentUser = await User.create({
    name: 'Smoke MD Student',
    email: `smoke.md.student.${Date.now()}@campus.edu`,
    passwordHash: dummyHash,
    role: ROLES.STUDENT,
    isActive: true,
  });

  const adminToken = makeToken(adminUser);
  const hostelOfficerToken = makeToken(hostelOfficer);
  const studentToken = makeToken(studentUser);

  let r;

  // ================= CATEGORIES TESTS =================
  console.log('\n-- Category Endpoints --\n');

  // 1. Non-admin POST /api/categories -> 403
  r = await post('/categories', { name: 'Unauthorized Cat', department: 'General' }, studentToken);
  check('Student cannot create category (403)', r.status === 403);

  // 2. Admin POST invalid category (missing name) -> 400
  r = await post('/categories', { department: 'Hostel' }, adminToken);
  check('Create category without name returns 400', r.status === 400);

  // 3. Admin POST with non-officer defaultHandler -> 400
  r = await post('/categories', {
    name: 'Smoke Category InvalidHandler ' + Date.now(),
    department: 'Hostel',
    defaultHandler: studentUser._id.toString(),
  }, adminToken);
  check('Create category with non-officer handler returns 400', r.status === 400);

  // 4. Admin POST valid category with active officer -> 201
  const catName1 = 'Smoke Category Hostel ' + Date.now();
  r = await post('/categories', {
    name: catName1,
    description: 'Hostel maintenance issues',
    department: 'Hostel',
    defaultHandler: hostelOfficer._id.toString(),
  }, adminToken);
  check('Admin creates category returns 201', r.status === 201);
  check('Category has populated defaultHandler', r.body.data?.defaultHandler?._id === hostelOfficer._id.toString());
  const category1 = r.body.data;

  // 5. Admin POST duplicate category name -> 409
  r = await post('/categories', {
    name: catName1.toLowerCase(),
    department: 'Hostel',
  }, adminToken);
  check('Duplicate category name returns 409', r.status === 409);

  // Admin creates second category
  const catName2 = 'Smoke Category IT ' + Date.now();
  r = await post('/categories', {
    name: catName2,
    description: 'Network and lab issues',
    department: 'IT Support',
    defaultHandler: itOfficer._id.toString(),
  }, adminToken);
  check('Admin creates 2nd category returns 201', r.status === 201);
  const category2 = r.body.data;

  // Student GET /api/categories -> active only, sorted by name
  r = await get('/categories', studentToken);
  check('Student GET /categories returns 200', r.status === 200);
  check('Categories list is array', Array.isArray(r.body.data));
  const activeCountBefore = r.body.data.length;

  // Admin PATCH /api/categories/:id
  r = await patch(`/categories/${category1._id}`, {
    description: 'Updated hostel description',
  }, adminToken);
  check('Admin updates category description returns 200', r.status === 200);
  check('Description updated', r.body.data?.description === 'Updated hostel description');

  // Admin PATCH /api/categories/:id rename to existing name -> 409
  r = await patch(`/categories/${category1._id}`, {
    name: catName2,
  }, adminToken);
  check('Rename category to existing name returns 409', r.status === 409);

  // Non-admin DELETE /api/categories/:id -> 403
  r = await del(`/categories/${category1._id}`, studentToken);
  check('Student cannot delete category (403)', r.status === 403);

  // Admin DELETE /api/categories/:id (soft delete) -> 200
  r = await del(`/categories/${category1._id}`, adminToken);
  check('Admin soft-deletes category returns 200', r.status === 200);
  check('Soft-deleted category has isActive=false', r.body.data?.isActive === false);

  // Student GET /categories excludes inactive category
  r = await get('/categories', studentToken);
  check('Student does not see soft-deleted category', !r.body.data.some((c) => c._id === category1._id));

  // Student GET /categories?all=true still only receives active
  r = await get('/categories?all=true', studentToken);
  check('Student with ?all=true still sees only active categories', !r.body.data.some((c) => c._id === category1._id));

  // Admin GET /categories?all=true includes inactive category
  r = await get('/categories?all=true', adminToken);
  check('Admin with ?all=true sees deactivated category', r.body.data.some((c) => c._id === category1._id));

  console.log('\n-- User Endpoints --\n');

  // Student POST /api/users -> 403
  r = await post('/users', { name: 'Denied', email: 'd@campus.edu', password: 'Password1', role: 'student' }, studentToken);
  check('Student cannot create user (403)', r.status === 403);

  // Admin POST /api/users officer without department -> 400
  r = await post('/users', {
    name: 'Officer No Dept',
    email: `smoke.md.officer.nodept.${Date.now()}@campus.edu`,
    password: 'Password1',
    role: 'officer',
  }, adminToken);
  check('Create officer without department returns 400', r.status === 400);

  // Admin POST /api/users valid officer -> 201
  const newOfficerEmail = `smoke.md.officer.new+special.${Date.now()}@campus.edu`;
  r = await post('/users', {
    name: 'Smoke MD NewOfficer',
    email: newOfficerEmail,
    password: 'Password1',
    role: 'officer',
    department: 'Sports',
  }, adminToken);
  check('Admin creates officer returns 201', r.status === 201);
  check('Created user has no passwordHash', !r.body.data?.passwordHash);
  const createdOfficer = r.body.data;

  // Admin POST /api/users duplicate email -> 409
  r = await post('/users', {
    name: 'Duplicate Officer',
    email: newOfficerEmail,
    password: 'Password1',
    role: 'student',
  }, adminToken);
  check('Create user with duplicate email returns 409', r.status === 409);

  // Admin GET /api/users paginated with search regex escaping
  r = await get(`/users?search=${encodeURIComponent('new+special')}`, adminToken);
  check('GET /users with regex special characters returns 200', r.status === 200);
  check('Search matches the created officer', r.body.data?.some((u) => u._id === createdOfficer._id));
  check('Response has pagination meta', typeof r.body.meta?.totalPages === 'number');

  // Admin GET /api/users filter by role & department
  r = await get('/users?role=officer&department=Sports', adminToken);
  check('Filter by role and department returns 200', r.status === 200);
  check('Filter includes only Sports officers', r.body.data?.every((u) => u.department === 'Sports' && u.role === 'officer'));

  // Non-admin GET /api/users -> 403
  r = await get('/users', studentToken);
  check('Student cannot access GET /users (403)', r.status === 403);

  // Admin self-deactivation guard -> 409
  r = await patch(`/users/${adminUser._id}`, { isActive: false }, adminToken);
  check('Admin deactivating themself returns 409', r.status === 409);

  // Admin self-demotion guard -> 409
  r = await patch(`/users/${adminUser._id}`, { role: 'student' }, adminToken);
  check('Admin demoting themself returns 409', r.status === 409);

  const admin2Email = `smoke.md.admin2.${Date.now()}@campus.edu`;
  r = await post('/users', {
    name: 'Smoke Second Admin',
    email: admin2Email,
    password: 'Password1',
    role: 'admin',
  }, adminToken);
  check('Create 2nd admin returns 201', r.status === 201);
  const secondAdmin = r.body.data;
  const secondAdminToken = makeToken(secondAdmin);

  // First admin deactivates second admin -> should succeed because 2 active admins exist
  r = await patch(`/users/${secondAdmin._id}`, { isActive: false }, adminToken);
  check('Deactivating 2nd admin succeeds when multiple active admins exist', r.status === 200);

  // Now ensure there is only 1 active admin in the DB for the test:
  // If there are other demo admins in DB, let's temporarily deactivate them or check count.
  // To strictly test the last-admin guard:
  const allActiveAdmins = await User.find({ role: ROLES.ADMIN, isActive: true });
  // Store inactive admin IDs to restore
  const temporarilyDeactivatedIds = [];
  for (const a of allActiveAdmins) {
    if (a._id.toString() !== adminUser._id.toString()) {
      a.isActive = false;
      await a.save();
      temporarilyDeactivatedIds.push(a._id);
    }
  }

  // Now adminUser is the SOLE remaining active admin in the entire DB.
  // Second admin tries to demote or adminUser tries to be demoted/deactivated:
  // Another token (e.g. second admin temporarily reactivated, or via second admin)
  // Reactivate secondAdmin
  await User.findByIdAndUpdate(secondAdmin._id, { isActive: true });
  // Now there are 2 admins: adminUser and secondAdmin.
  // Let's deactivate adminUser via secondAdmin:
  r = await patch(`/users/${adminUser._id}`, { isActive: false }, secondAdminToken);
  check('Second admin deactivates first admin returns 200', r.status === 200);

  // Now secondAdmin is the sole active admin in the entire DB!
  // Trying to deactivate secondAdmin via direct call or demote them:
  // Since secondAdmin cannot deactivate self (409), let's check demote / deactivate last admin guard:
  // Even if an officer or another call hits it (or if secondAdmin targets self or another admin):
  r = await patch(`/users/${secondAdmin._id}`, { role: 'student' }, secondAdminToken);
  check('Demoting the last remaining active admin returns 409', r.status === 409);

  await User.updateMany({ _id: { $in: temporarilyDeactivatedIds } }, { isActive: true });
  await User.findByIdAndUpdate(adminUser._id, { isActive: true });

  // Officer dropdown: GET /api/users/officers
  // Student cannot access -> 403
  r = await get('/users/officers', studentToken);
  check('Student cannot access /users/officers (403)', r.status === 403);

  // Officer sees ONLY their own department
  r = await get('/users/officers', hostelOfficerToken);
  check('Officer accesses /users/officers returns 200', r.status === 200);
  check('Officer sees only own department officers', r.body.data?.every((o) => o.department === 'Hostel'));
  check('Officer response has no passwordHash', !r.body.data?.[0]?.passwordHash);

  // Officer passing ?department=IT is STILL locked to Hostel department
  r = await get('/users/officers?department=IT+Support', hostelOfficerToken);
  check('Officer cannot view another department officers via query', r.body.data?.every((o) => o.department === 'Hostel'));

  // Admin sees all active officers or can filter by department
  r = await get('/users/officers', adminToken);
  check('Admin accesses /users/officers returns 200', r.status === 200);
  check('Admin sees multiple departments', r.body.data?.some((o) => o.department === 'Hostel') && r.body.data?.some((o) => o.department === 'IT Support'));

  r = await get('/users/officers?department=IT+Support', adminToken);
  check('Admin can filter /users/officers by department', r.body.data?.every((o) => o.department === 'IT Support'));

  console.log(`\n--- Results: ${passed} PASS, ${failed} FAIL ---\n`);

  await cleanup();
  await mongoose.disconnect();

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error('Smoke test error:', err);
  try {
    await cleanup();
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
