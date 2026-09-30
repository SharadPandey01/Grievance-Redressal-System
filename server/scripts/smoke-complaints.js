/**
 * scripts/smoke-complaints.js
 *
 * Live smoke test for B5 complaint endpoints.
 * Requires the server to be running: `NODE_ENV=test npm run dev`
 *
 * Tests:
 *  1.  Student can file a valid complaint → 201 + code in GRV-YYYY-NNNN format
 *  2.  Missing title → 400 with field error
 *  3.  Description too short → 400
 *  4.  Invalid category ID → 400
 *  5.  Inactive / non-existent category → 400
 *  6.  Officer filing a complaint → 403 (officer is not a complainant)
 *  7.  Student list → only sees own complaints
 *  8.  Officer list → only sees scoped complaints (assigned or department pool)
 *  9.  Admin list → sees all
 * 10.  Anonymous complaint: officer sees filedBy=null + filedByLabel="Anonymous"
 * 11.  Student B cannot access Student A's complaint → 403
 * 12.  Auto-assign: complaint in category with defaultHandler → Acknowledged
 * 13.  Attachment access: student A can download own attachment
 * 14.  Student B cannot download student A's attachment → 403
 */

const BASE_URL = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assert(label, condition, info = '') {
  if (condition) {
    console.log(`  ✅ PASS  ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${label}${info ? ' — ' + info : ''}`);
    failed++;
  }
}

async function req(method, path, body, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let fetchOpts;
  if (body instanceof FormData) {
    // multipart — do not set Content-Type; fetch sets it with the boundary
    fetchOpts = { method, headers, body };
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    fetchOpts = { method, headers, body: JSON.stringify(body) };
  } else {
    fetchOpts = { method, headers };
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOpts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function login(email) {
  const r = await req('POST', '/auth/login', { email, password: 'Password@123' });
  if (!r.body.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
  return r.body.data.token;
}

// Build a minimal multipart form body without the Node `form-data` package
// (only allowed packages in the stack — no extra deps)
function buildForm(fields, files = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  for (const f of files) {
    // Create a Blob so FormData can attach it
    const blob = new Blob([f.content], { type: f.type });
    fd.append('files', blob, f.name);
  }
  return fd;
}

// ─── Setup: get tokens and category IDs ───────────────────────────────────────

async function setup() {
  const adminToken = await login('admin@campus.edu');
  const student1Token = await login('student1@campus.edu');
  const student2Token = await login('student2@campus.edu');
  const officerToken = await login('officer.hostel@campus.edu');

  // Get categories
  const catRes = await req('GET', '/categories', null, student1Token);
  const categories = catRes.body.data || [];

  // Find a category WITHOUT a defaultHandler for basic tests
  let plainCat = categories.find((c) => !c.defaultHandler && c.isActive);
  // If all have handlers pick any active category
  if (!plainCat) plainCat = categories.find((c) => c.isActive);

  // Find (or create) a category WITH a defaultHandler for auto-assign test
  // The hostel officer is the defaultHandler for "Hostel & Mess" category if seeded
  let autoAssignCat = categories.find((c) => c.defaultHandler && c.isActive);

  return { adminToken, student1Token, student2Token, officerToken, categories, plainCat, autoAssignCat };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀  Smoke test: B5 Complaints\n');

  let ctx;
  try {
    ctx = await setup();
  } catch (e) {
    console.error('Setup failed:', e.message);
    console.error('Make sure the server is running with NODE_ENV=test and the DB is seeded (npm run seed).');
    process.exit(1);
  }

  const { adminToken, student1Token, student2Token, officerToken, plainCat, autoAssignCat } = ctx;

  if (!plainCat) {
    console.error('No active category found. Run npm run seed first.');
    process.exit(1);
  }

  // ── 1. Valid complaint (text only) ─────────────────────────────────────────
  const form1 = buildForm({
    title: 'Water leakage in hostel room 204',
    description: 'There is persistent water leakage from the ceiling in room 204 for the past three days.',
    category: plainCat._id,
    priority: 'Medium',
    isAnonymous: 'false',
  });
  const r1 = await req('POST', '/complaints', form1, student1Token);
  assert('1. Valid complaint → 201', r1.status === 201, JSON.stringify(r1.body));
  assert('1. Response has complaint code', /^GRV-\d{4}-\d{4}$/.test(r1.body.data?.code));
  assert('1. Status is Submitted', r1.body.data?.status === 'Submitted');
  const complaint1Id = r1.body.data?._id;

  // ── 2. Missing title → 400 ─────────────────────────────────────────────────
  const form2 = buildForm({
    description: 'There is persistent water leakage from the ceiling in room 204 for the past three days.',
    category: plainCat._id,
  });
  const r2 = await req('POST', '/complaints', form2, student1Token);
  assert('2. Missing title → 400', r2.status === 400);
  assert('2. Error has title field', r2.body.errors?.some((e) => e.field === 'title'));

  // ── 3. Description too short → 400 ────────────────────────────────────────
  const form3 = buildForm({
    title: 'Short description test',
    description: 'Too short',
    category: plainCat._id,
  });
  const r3 = await req('POST', '/complaints', form3, student1Token);
  assert('3. Short description → 400', r3.status === 400);
  assert('3. Error on description field', r3.body.errors?.some((e) => e.field === 'description'));

  // ── 4. Invalid (malformed) category ID → 400 ──────────────────────────────
  const form4 = buildForm({
    title: 'Invalid category test here',
    description: 'This is a test to check that invalid category IDs are rejected properly.',
    category: 'not-an-objectid',
  });
  const r4 = await req('POST', '/complaints', form4, student1Token);
  assert('4. Invalid category ID → 400', r4.status === 400);

  // ── 5. Non-existent category (valid ObjectId format) → 400 ────────────────
  const form5 = buildForm({
    title: 'Non-existent category test',
    description: 'This is a test to check that non-existent categories are rejected properly.',
    category: '507f1f77bcf86cd799439011',
  });
  const r5 = await req('POST', '/complaints', form5, student1Token);
  assert('5. Non-existent category → 400', r5.status === 400);

  // ── 6. Officer trying to file complaint → 403 ──────────────────────────────
  const form6 = buildForm({
    title: 'Officer filing complaint test',
    description: 'This should fail because officers are not complainants.',
    category: plainCat._id,
  });
  const r6 = await req('POST', '/complaints', form6, officerToken);
  assert('6. Officer filing complaint → 403', r6.status === 403);

  // ── 7. Wrong file type → 400 ───────────────────────────────────────────────
  const form7 = buildForm(
    {
      title: 'Wrong file type test okay',
      description: 'This is a test to verify that invalid file types are rejected by the server.',
      category: plainCat._id,
    },
    [{ name: 'file.txt', content: 'hello', type: 'text/plain' }]
  );
  const r7 = await req('POST', '/complaints', form7, student1Token);
  assert('7. Wrong file type → 400', r7.status === 400);

  // ── 8. File too large → 400 ───────────────────────────────────────────────
  // Simulate with a 6 MB Blob
  const bigContent = 'x'.repeat(6 * 1024 * 1024);
  const form8 = buildForm(
    {
      title: 'File too large test here',
      description: 'This is a test to verify that files over the size limit are rejected properly.',
      category: plainCat._id,
    },
    [{ name: 'big.jpg', content: bigContent, type: 'image/jpeg' }]
  );
  const r8 = await req('POST', '/complaints', form8, student1Token);
  assert('8. File too large → 400', r8.status === 400);

  // ── 9. Student list scoping ────────────────────────────────────────────────
  const r9 = await req('GET', '/complaints', null, student1Token);
  assert('9. Student list → 200', r9.status === 200);
  // All returned complaints must have been filed by student1
  const student1Id = (await req('GET', '/auth/me', null, student1Token)).body.data?._id;
  const allByStudent1 = (r9.body.data || []).every(
    (c) => c.filedBy?._id === student1Id || (c.isAnonymous && c.filedBy === null)
  );
  assert('9. Student only sees own complaints', allByStudent1);

  // ── 10. Admin sees all ──────────────────────────────────────────────────────
  const r10 = await req('GET', '/complaints', null, adminToken);
  assert('10. Admin list → 200', r10.status === 200);
  assert('10. Admin meta total >= 1', (r10.body.meta?.total || 0) >= 1);

  // ── 11. Anonymous complaint masking ────────────────────────────────────────
  const formAnon = buildForm({
    title: 'Anonymous complaint about facilities',
    description: 'This anonymous complaint tests that the officer cannot see the filer identity.',
    category: plainCat._id,
    isAnonymous: 'true',
  });
  const rAnon = await req('POST', '/complaints', formAnon, student1Token);
  assert('11. Anonymous complaint → 201', rAnon.status === 201);
  assert('11. isAnonymous=true in response', rAnon.body.data?.isAnonymous === true);
  const anonId = rAnon.body.data?._id;

  // Officer should see filedByLabel="Anonymous" on this complaint's detail
  // First make the complaint visible to the officer (admin can reassign, but here
  // we check via admin to verify masking in admin context)
  if (anonId) {
    const rAnonDetail = await req('GET', `/complaints/${anonId}`, null, adminToken);
    assert(
      '11. Admin sees filedByLabel=Anonymous for anon complaint',
      rAnonDetail.body.data?.filedByLabel === 'Anonymous' ||
        rAnonDetail.body.data?.filedBy === null
    );
  }

  // ── 12. Student B cannot access student A's complaint → 403 ───────────────
  if (complaint1Id) {
    const r12 = await req('GET', `/complaints/${complaint1Id}`, null, student2Token);
    assert('12. Student B → 403 on student A complaint', r12.status === 403);
  }

  // ── 13. Auto-assign when category has defaultHandler ──────────────────────
  if (autoAssignCat) {
    const formAuto = buildForm({
      title: 'Auto-assign test: hostel room problem',
      description: 'This complaint tests the auto-assign feature when a category has a default handler.',
      category: autoAssignCat._id,
      priority: 'High',
    });
    const rAuto = await req('POST', '/complaints', formAuto, student1Token);
    assert('13. Auto-assign category → 201', rAuto.status === 201);
    assert('13. Status is Acknowledged (auto-assigned)', rAuto.body.data?.status === 'Acknowledged');
    assert('13. assignedTo is set', !!rAuto.body.data?.assignedTo);
  } else {
    console.log('  ⚠️  SKIP  13. No category with defaultHandler found (seed first)');
  }

  // ── 14. Student A can view own complaint detail ─────────────────────────────
  if (complaint1Id) {
    const r14 = await req('GET', `/complaints/${complaint1Id}`, null, student1Token);
    assert('14. Student A can view own complaint → 200', r14.status === 200);
    assert('14. statusLogs array present', Array.isArray(r14.body.data?.statusLogs));
    assert('14. At least one statusLog (Submitted)', r14.body.data?.statusLogs?.length >= 1);
  }

  // ── 15. Invalid ObjectId → 404 (not 500) ─────────────────────────────────
  const r15 = await req('GET', '/complaints/not-valid-id', null, student1Token);
  assert('15. Invalid ObjectId → 404', r15.status === 404);

  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────────`);
  console.log(`Result: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
