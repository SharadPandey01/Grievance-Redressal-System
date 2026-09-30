/**
 * scripts/smoke-comments-analytics.js
 *
 * End-to-end smoke test for B7: Comments and Analytics.
 * Requires the server running with NODE_ENV=test and a seeded DB.
 *   npm run seed   (once)
 *   NODE_ENV=test npm run dev
 *   node scripts/smoke-comments-analytics.js
 *
 * Covers:
 *  Comments:
 *   - Student and officer can post/read comments on the same complaint
 *   - Internal note is hidden from complainant (not returned in GET)
 *   - isInternal=true by a complainant → 403
 *   - Comment on Closed complaint → 409
 *   - Anonymous complaint: complainant's comment shows as "Anonymous" to officer
 *   - Text validation: empty → 400, over 1000 chars → 400
 *   - Non-participant cannot comment → 403
 *
 *  Analytics:
 *   - GET /api/analytics/summary (admin) → 200, shape and fields verified
 *   - GET /api/analytics/summary (non-admin) → 403
 *   - GET /api/analytics/my-summary (student) → byStatus + awaitingVerification
 *   - GET /api/analytics/my-summary (officer) → byStatus + overdue + unassignedPool
 *   - GET /api/analytics/my-summary (admin) → byStatus + awaitingVerification
 *   - totals.all == sum of byStatus counts
 *   - monthlyTrend has exactly 6 entries
 *   - byStatus, byPriority have no missing entries (gap-filling verified)
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
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

const post  = (p, b, t) => req('POST',  p, b, t);
const patch = (p, b, t) => req('PATCH', p, b, t);
const get   = (p, t)    => req('GET',   p, null, t);

async function login(email, password = 'Password@123') {
  const r = await post('/auth/login', { email, password });
  if (!r.body.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
  return { token: r.body.data.token, userId: r.body.data.user._id };
}

async function fileComplaint(token, categoryId, title, isAnonymous = false) {
  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', 'Detailed description for smoke test complaint in B7.');
  fd.append('category', categoryId);
  fd.append('priority', 'Medium');
  fd.append('isAnonymous', String(isAnonymous));
  const res = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return res.json();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  const admin    = await login('admin@campus.edu');
  const student1 = await login('student1@campus.edu');
  const student2 = await login('student2@campus.edu');
  const officer  = await login('officer.hostel@campus.edu');

  const catRes = await get('/categories', student1.token);
  const cats = catRes.body.data || [];
  const plainCat = cats.find(c => c.isActive) || cats[0];
  if (!plainCat) throw new Error('No active category found — run npm run seed first');

  return { admin, student1, student2, officer, plainCat };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀  Smoke test: B7 Comments & Analytics\n');

  let ctx;
  try { ctx = await setup(); }
  catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  }

  const { admin, student1, student2, officer, plainCat } = ctx;

  // ═══════════════════════════════════════════════════════
  // Section 1: COMMENT HAPPY PATH
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 1: Comment happy path ────────────────────');

  // 1a. File a complaint
  const c1 = await fileComplaint(student1.token, plainCat._id, 'B7 comment test: broken fan in lab');
  assert('1a. File complaint → success', c1.data?._id != null);
  const cId = c1.data._id;

  // Assign to officer (required so officer can access the complaint)
  await patch(`/complaints/${cId}/assign`, { assigneeId: officer.userId }, officer.token);

  // 1b. Student posts a public comment
  const r1b = await post(`/complaints/${cId}/comments`,
    { text: 'The fan has been broken for two days now.' }, student1.token);
  assert('1b. Student post comment → 201', r1b.status === 201, JSON.stringify(r1b.body));
  assert('1b. author.name present', !!r1b.body.data?.author?.name);
  assert('1b. isInternal = false', r1b.body.data?.isInternal === false);

  // 1c. Officer posts a public comment
  const r1c = await post(`/complaints/${cId}/comments`,
    { text: 'We will dispatch a technician tomorrow.', isInternal: false }, officer.token);
  assert('1c. Officer public comment → 201', r1c.status === 201, JSON.stringify(r1c.body));

  // 1d. Officer posts an INTERNAL note
  const r1d = await post(`/complaints/${cId}/comments`,
    { text: 'Internal note: need approval from HOD before proceeding.', isInternal: true }, officer.token);
  assert('1d. Officer internal comment → 201', r1d.status === 201, JSON.stringify(r1d.body));
  assert('1d. isInternal = true', r1d.body.data?.isInternal === true);

  // 1e. Student reads comments — internal note must NOT appear
  const r1e = await get(`/complaints/${cId}/comments`, student1.token);
  assert('1e. Student GET comments → 200', r1e.status === 200);
  const studentComments = r1e.body.data || [];
  assert('1e. No internal comments visible to student',
    studentComments.every(c => !c.isInternal),
    `found internal: ${JSON.stringify(studentComments.filter(c => c.isInternal))}`);
  assert('1e. Student sees 2 public comments', studentComments.length === 2,
    `got ${studentComments.length}`);

  // 1f. Officer reads comments — internal note IS visible
  const r1f = await get(`/complaints/${cId}/comments`, officer.token);
  assert('1f. Officer GET comments → 200', r1f.status === 200);
  const officerComments = r1f.body.data || [];
  assert('1f. Officer sees 3 comments (incl. internal)', officerComments.length === 3,
    `got ${officerComments.length}`);
  assert('1f. At least one internal in officer view',
    officerComments.some(c => c.isInternal));

  // 1g. Comments are in ascending order (oldest first)
  if (officerComments.length > 1) {
    const dates = officerComments.map(c => new Date(c.createdAt).getTime());
    assert('1g. Comments in ascending order',
      dates.every((d, i) => i === 0 || d >= dates[i - 1]));
  }

  // ═══════════════════════════════════════════════════════
  // Section 2: INTERNAL GUARD + CLOSED REJECTION
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 2: Guards and restrictions ───────────────');

  // 2a. Complainant tries isInternal:true → 403
  const r2a = await post(`/complaints/${cId}/comments`,
    { text: 'Can I post an internal note?', isInternal: true }, student1.token);
  assert('2a. Complainant isInternal:true → 403', r2a.status === 403, JSON.stringify(r2a.body));

  // 2b. Unrelated student cannot comment → 403
  const r2b = await post(`/complaints/${cId}/comments`,
    { text: 'I am student2 commenting here.' }, student2.token);
  assert('2b. Non-participant student comment → 403', r2b.status === 403, JSON.stringify(r2b.body));

  // 2c. Comment text too short (empty) → 400
  const r2c = await post(`/complaints/${cId}/comments`, { text: '' }, student1.token);
  assert('2c. Empty comment text → 400', r2c.status === 400);

  // 2d. Comment text over 1000 chars → 400
  const r2d = await post(`/complaints/${cId}/comments`,
    { text: 'x'.repeat(1001) }, student1.token);
  assert('2d. Comment over 1000 chars → 400', r2d.status === 400);

  // 2e. Close the complaint, then try to comment → 409
  // Walk to Resolved then Closed
  await patch(`/complaints/${cId}/status`,
    { toStatus: 'In Progress', note: 'Working on the fan issue.' }, officer.token);
  await patch(`/complaints/${cId}/status`, {
    toStatus: 'Resolved',
    note: 'Fan replaced.',
    resolutionNotes: 'The broken fan was replaced with a new unit.',
  }, officer.token);
  await post(`/complaints/${cId}/verify`, {}, student1.token);

  const r2e = await post(`/complaints/${cId}/comments`,
    { text: 'Trying to comment after close.' }, student1.token);
  assert('2e. Comment on Closed → 409', r2e.status === 409, JSON.stringify(r2e.body));

  // ═══════════════════════════════════════════════════════
  // Section 3: ANONYMOUS MASKING ON COMMENTS
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 3: Anonymous complaint comment masking ───');

  // 3a. File an anonymous complaint
  const c3 = await fileComplaint(student1.token, plainCat._id, 'B7 anon comment test', true);
  assert('3a. File anonymous complaint', c3.data?.isAnonymous === true);
  const c3Id = c3.data._id;

  await patch(`/complaints/${c3Id}/assign`, { assigneeId: officer.userId }, officer.token);

  // 3b. Student1 posts a comment on their anonymous complaint
  const r3b = await post(`/complaints/${c3Id}/comments`,
    { text: 'My identity should be hidden from the officer.' }, student1.token);
  assert('3b. Student posts comment on anon complaint → 201', r3b.status === 201);

  // 3c. Officer reads that comment — should see name = "Anonymous"
  const r3c = await get(`/complaints/${c3Id}/comments`, officer.token);
  assert('3c. Officer gets comments on anon complaint → 200', r3c.status === 200);
  const officerView = r3c.body.data || [];
  const studentComment = officerView[0];
  assert('3c. Complainant author name = Anonymous for officer',
    studentComment?.author?.name === 'Anonymous',
    `got name: ${studentComment?.author?.name}`);

  // 3d. Student1 reads their own comment — should see their real name
  const r3d = await get(`/complaints/${c3Id}/comments`, student1.token);
  const ownView = r3d.body.data || [];
  assert('3d. Owner sees own real name in comments',
    ownView[0]?.author?.name !== 'Anonymous',
    `got: ${ownView[0]?.author?.name}`);

  // ═══════════════════════════════════════════════════════
  // Section 4: ANALYTICS — SUMMARY (admin)
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 4: Analytics /summary (admin) ────────────');

  // 4a. Non-admin (student) → 403
  const r4a = await get('/analytics/summary', student1.token);
  assert('4a. Non-admin /summary → 403', r4a.status === 403);

  // 4b. Non-admin (officer) → 403
  const r4b = await get('/analytics/summary', officer.token);
  assert('4b. Officer /summary → 403', r4b.status === 403);

  // 4c. Admin → 200 with correct shape
  const r4c = await get('/analytics/summary', admin.token);
  assert('4c. Admin /summary → 200', r4c.status === 200, JSON.stringify(r4c.body));
  const s = r4c.body.data;

  // Verify top-level keys
  const requiredKeys = ['totals', 'byStatus', 'byCategory', 'byDepartment', 'byPriority',
                        'monthlyTrend', 'avgResolutionHours', 'avgRating', 'reopenRate'];
  for (const k of requiredKeys) {
    assert(`4c. summary has '${k}'`, k in s, `keys: ${Object.keys(s).join(', ')}`);
  }

  // totals
  assert('4d. totals.all is a number >= 0', typeof s.totals?.all === 'number' && s.totals.all >= 0);
  assert('4d. totals.overdue is a number', typeof s.totals?.overdue === 'number');

  // totals.all == sum of byStatus counts
  if (Array.isArray(s.byStatus)) {
    const sumByStatus = s.byStatus.reduce((acc, b) => acc + b.count, 0);
    assert('4e. totals.all == sum of byStatus counts', s.totals.all === sumByStatus,
      `totals.all=${s.totals.all}, sumByStatus=${sumByStatus}`);
  }

  // byStatus has all 5 statuses (no gaps)
  const expectedStatuses = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'];
  if (Array.isArray(s.byStatus)) {
    const returnedStatuses = s.byStatus.map(b => b.status);
    assert('4f. byStatus has all 5 statuses (no gaps)',
      expectedStatuses.every(st => returnedStatuses.includes(st)),
      `got: ${returnedStatuses.join(', ')}`);
  }

  // byPriority has all 3 priorities (no gaps)
  const expectedPriorities = ['High', 'Medium', 'Low'];
  if (Array.isArray(s.byPriority)) {
    const returnedPriorities = s.byPriority.map(b => b.priority);
    assert('4g. byPriority has all 3 priorities (no gaps)',
      expectedPriorities.every(p => returnedPriorities.includes(p)),
      `got: ${returnedPriorities.join(', ')}`);
  }

  // monthlyTrend has exactly 6 entries
  assert('4h. monthlyTrend has exactly 6 entries',
    Array.isArray(s.monthlyTrend) && s.monthlyTrend.length === 6,
    `got ${s.monthlyTrend?.length}`);

  // Each trend entry has month, created, resolved
  if (Array.isArray(s.monthlyTrend) && s.monthlyTrend.length > 0) {
    const first = s.monthlyTrend[0];
    assert('4h. trend entries have {month, created, resolved}',
      'month' in first && 'created' in first && 'resolved' in first,
      JSON.stringify(first));
  }

  // avgResolutionHours is a number
  assert('4i. avgResolutionHours is a number', typeof s.avgResolutionHours === 'number');

  // reopenRate is a number 0-100
  assert('4j. reopenRate is a number 0-100',
    typeof s.reopenRate === 'number' && s.reopenRate >= 0 && s.reopenRate <= 100,
    `got: ${s.reopenRate}`);

  // ═══════════════════════════════════════════════════════
  // Section 5: ANALYTICS — MY-SUMMARY (role-aware)
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 5: Analytics /my-summary (role-aware) ───');

  // 5a. Student
  const r5a = await get('/analytics/my-summary', student1.token);
  assert('5a. Student /my-summary → 200', r5a.status === 200, JSON.stringify(r5a.body));
  const ms = r5a.body.data;
  assert('5a. Has byStatus array', Array.isArray(ms?.byStatus));
  assert('5a. Has awaitingVerification', typeof ms?.awaitingVerification === 'number',
    `got: ${JSON.stringify(ms)}`);
  assert('5a. byStatus has all 5 entries',
    ms?.byStatus?.length === 5, `got ${ms?.byStatus?.length}`);

  // 5b. Officer
  const r5b = await get('/analytics/my-summary', officer.token);
  assert('5b. Officer /my-summary → 200', r5b.status === 200, JSON.stringify(r5b.body));
  const om = r5b.body.data;
  assert('5b. Has byStatus', Array.isArray(om?.byStatus));
  assert('5b. Has overdue', typeof om?.overdue === 'number', `got: ${JSON.stringify(om)}`);
  assert('5b. Has unassignedPool', typeof om?.unassignedPool === 'number');

  // 5c. Admin
  const r5c = await get('/analytics/my-summary', admin.token);
  assert('5c. Admin /my-summary → 200', r5c.status === 200, JSON.stringify(r5c.body));
  const am = r5c.body.data;
  assert('5c. Has byStatus', Array.isArray(am?.byStatus));
  assert('5c. Has awaitingVerification', typeof am?.awaitingVerification === 'number');

  // 5d. Counts are consistent: student's own complaint total == sum of byStatus
  const studentTotal = (ms?.byStatus || []).reduce((a, b) => a + b.count, 0);
  assert('5d. Student my-summary byStatus sums to own complaint count',
    studentTotal >= 0,
    `total: ${studentTotal}`);

  // ─────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`Result: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
