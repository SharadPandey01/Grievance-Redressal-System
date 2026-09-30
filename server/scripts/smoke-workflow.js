/**
 * scripts/smoke-workflow.js
 *
 * End-to-end smoke test for B6 workflow endpoints.
 * Requires the server running with NODE_ENV=test and a seeded DB.
 *   npm run seed   (once)
 *   NODE_ENV=test npm run dev
 *   node scripts/smoke-workflow.js
 *
 * Covers:
 *  Happy path:  file → assign → In Progress → Resolved → verify (Closed) → feedback
 *  Reopen path: file → assign → In Progress → Resolved → reopen → In Progress again
 *  Illegal jumps: Submitted→Resolved, Closed→Submitted, wrong role attempts
 *  Duplicate feedback → 409
 *  Auto-close: backdate resolvedAt, run job, assert Closed
 *  allowedActions in GET /api/complaints/:id
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

async function post(path, body, token) { return req('POST', path, body, token); }
async function patch(path, body, token) { return req('PATCH', path, body, token); }
async function get(path, token) { return req('GET', path, null, token); }

async function login(email, password = 'Password@123') {
  const r = await post('/auth/login', { email, password });
  if (!r.body.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
  return { token: r.body.data.token, userId: r.body.data.user._id };
}

/** File a plain text complaint via multipart — returns the created complaint. */
async function fileComplaint(token, categoryId, title = 'Test complaint about hostel facilities') {
  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', 'This is a detailed description for the test complaint used in the smoke test.');
  fd.append('category', categoryId);
  fd.append('priority', 'Medium');
  fd.append('isAnonymous', 'false');

  const res = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  const admin    = await login('admin@campus.edu');
  const student1 = await login('student1@campus.edu');
  const student2 = await login('student2@campus.edu');
  const officer  = await login('officer.hostel@campus.edu');

  // Get a category without a default handler so we control assignment manually
  const catRes = await get('/categories', student1.token);
  const categories = catRes.body.data || [];
  let plainCat = categories.find(c => !c.defaultHandler && c.isActive);
  if (!plainCat) plainCat = categories.find(c => c.isActive);
  if (!plainCat) throw new Error('No active category found — run npm run seed first');

  return { admin, student1, student2, officer, plainCat };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀  Smoke test: B6 Workflow\n');

  let ctx;
  try { ctx = await setup(); }
  catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  }

  const { admin, student1, student2, officer, plainCat } = ctx;

  // ═══════════════════════════════════════════════════════
  // Section 1: HAPPY PATH — full lifecycle
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 1: Happy path ─────────────────────────────');

  // 1a. File complaint as student1
  const r1a = await fileComplaint(student1.token, plainCat._id);
  assert('1a. File complaint → 201', r1a.status === 201, JSON.stringify(r1a.body));
  assert('1a. Status = Submitted', r1a.body.data?.status === 'Submitted');
  const cId = r1a.body.data?._id;

  // 1b. allowedActions for student1 on Submitted = no workflow buttons (can't self-assign)
  const r1b = await get(`/complaints/${cId}`, student1.token);
  assert('1b. GET detail → 200', r1b.status === 200);
  assert('1b. allowedActions is array', Array.isArray(r1b.body.data?.allowedActions));
  assert('1b. Student has no workflow actions on Submitted',
    !r1b.body.data?.allowedActions.some(a => ['assign','updateStatus','verify'].includes(a)));

  // 1c. officer assigns the complaint to themselves
  const r1c = await patch(`/complaints/${cId}/assign`,
    { assigneeId: officer.userId, note: 'Taking ownership' }, officer.token);
  assert('1c. Assign → 200', r1c.status === 200, JSON.stringify(r1c.body));
  assert('1c. Status → Acknowledged', r1c.body.data?.status === 'Acknowledged');
  assert('1c. assignedTo set', r1c.body.data?.assignedTo != null);

  // 1d. allowedActions for officer = [assign, updateStatus]; next = [In Progress]
  const r1d = await get(`/complaints/${cId}`, officer.token);
  assert('1d. Officer sees updateStatus action', r1d.body.data?.allowedActions?.includes('updateStatus'));
  assert('1d. allowedNextStatuses = [In Progress]',
    r1d.body.data?.allowedNextStatuses?.[0] === 'In Progress');

  // 1e. student1 sees verify/reopen NOT available yet (status = Acknowledged)
  const r1e = await get(`/complaints/${cId}`, student1.token);
  assert('1e. Student has no verify/reopen on Acknowledged',
    !r1e.body.data?.allowedActions?.includes('verify') &&
    !r1e.body.data?.allowedActions?.includes('reopen'));

  // 1f. Officer changes status → In Progress
  const r1f = await patch(`/complaints/${cId}/status`,
    { toStatus: 'In Progress', note: 'Starting investigation' }, officer.token);
  assert('1f. Status → In Progress → 200', r1f.status === 200, JSON.stringify(r1f.body));
  assert('1f. Status = In Progress', r1f.body.data?.status === 'In Progress');

  // 1g. Officer changes status → Resolved (with resolutionNotes)
  const r1g = await patch(`/complaints/${cId}/status`, {
    toStatus: 'Resolved',
    note: 'Issue fixed by maintenance team',
    resolutionNotes: 'The water pipe was repaired and the leakage has been fixed.',
  }, officer.token);
  assert('1g. Status → Resolved → 200', r1g.status === 200, JSON.stringify(r1g.body));
  assert('1g. Status = Resolved', r1g.body.data?.status === 'Resolved');
  assert('1g. resolutionNotes set', !!r1g.body.data?.resolutionNotes);

  // 1h. student1 now has verify + reopen in allowedActions
  const r1h = await get(`/complaints/${cId}`, student1.token);
  assert('1h. Student sees verify action on Resolved', r1h.body.data?.allowedActions?.includes('verify'));
  assert('1h. Student sees reopen action on Resolved', r1h.body.data?.allowedActions?.includes('reopen'));

  // 1i. student1 verifies → Closed
  const r1i = await post(`/complaints/${cId}/verify`, {}, student1.token);
  assert('1i. Verify → 200', r1i.status === 200, JSON.stringify(r1i.body));
  assert('1i. Status = Closed', r1i.body.data?.status === 'Closed');
  assert('1i. closedAt set', !!r1i.body.data?.closedAt);

  // 1j. student1 submits feedback → 201
  const r1j = await post(`/complaints/${cId}/feedback`,
    { rating: 4, comment: 'Good resolution, thanks!' }, student1.token);
  assert('1j. Feedback → 201', r1j.status === 201, JSON.stringify(r1j.body));
  assert('1j. Rating stored', r1j.body.data?.rating === 4);

  // 1k. allowedActions after feedback is submitted → feedback gone from list
  const r1k = await get(`/complaints/${cId}`, student1.token);
  assert('1k. feedback action gone after submitting', !r1k.body.data?.allowedActions?.includes('feedback'));

  // ═══════════════════════════════════════════════════════
  // Section 2: STATUSLOG AUDIT TRAIL
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 2: StatusLog audit trail ─────────────────');

  const r2 = await get(`/complaints/${cId}`, admin.token);
  const logs = r2.body.data?.statusLogs || [];
  assert('2. At least 4 status log entries', logs.length >= 4,
    `got ${logs.length}: ${logs.map(l => l.toStatus).join(' → ')}`);
  assert('2. First log = Submitted', logs[0]?.toStatus === 'Submitted');
  assert('2. Last log = Closed', logs[logs.length - 1]?.toStatus === 'Closed');
  assert('2. Feedback stored on detail', r2.body.data?.feedback !== null);

  // ═══════════════════════════════════════════════════════
  // Section 3: REOPEN PATH
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 3: Reopen path ───────────────────────────');

  // New complaint for reopen test
  const r3a = await fileComplaint(student1.token, plainCat._id, 'Reopen test: internet down in lab');
  assert('3a. File second complaint → 201', r3a.status === 201);
  const c2Id = r3a.body.data?._id;

  // Assign → In Progress → Resolved
  await patch(`/complaints/${c2Id}/assign`, { assigneeId: officer.userId }, officer.token);
  await patch(`/complaints/${c2Id}/status`, { toStatus: 'In Progress', note: 'Working on it' }, officer.token);
  await patch(`/complaints/${c2Id}/status`, {
    toStatus: 'Resolved',
    note: 'Fixed',
    resolutionNotes: 'Router was replaced and internet is working fine now.',
  }, officer.token);

  // student1 reopens
  const r3b = await post(`/complaints/${c2Id}/reopen`,
    { reason: 'The issue is still persisting after the supposed fix.' }, student1.token);
  assert('3b. Reopen → 200', r3b.status === 200, JSON.stringify(r3b.body));
  assert('3b. Status → In Progress', r3b.body.data?.status === 'In Progress');
  assert('3b. reopenCount = 1', r3b.body.data?.reopenCount === 1);
  assert('3b. resolvedAt cleared', r3b.body.data?.resolvedAt === null || r3b.body.data?.resolvedAt === undefined);

  // ═══════════════════════════════════════════════════════
  // Section 4: ILLEGAL TRANSITIONS
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 4: Illegal transitions ───────────────────');

  // New complaint in Submitted state
  const r4a = await fileComplaint(student1.token, plainCat._id, 'Illegal transition test complaint');
  assert('4a. File third complaint → 201', r4a.status === 201);
  const c3Id = r4a.body.data?._id;

  // Officer assigns so they can try changeStatus
  await patch(`/complaints/${c3Id}/assign`, { assigneeId: officer.userId }, officer.token);
  // Now status = Acknowledged

  // 4b. Try Acknowledged → Resolved (skipping In Progress) → must get 409
  const r4b = await patch(`/complaints/${c3Id}/status`, {
    toStatus: 'Resolved',
    note: 'Trying to skip',
    resolutionNotes: 'Should not work.',
  }, officer.token);
  assert('4b. Acknowledged → Resolved (skip) → 409', r4b.status === 409, JSON.stringify(r4b.body));

  // 4c. Try verify on non-Resolved (Acknowledged) → 409
  const r4c = await post(`/complaints/${c3Id}/verify`, {}, student1.token);
  assert('4c. Verify on Acknowledged → 409', r4c.status === 409, JSON.stringify(r4c.body));

  // 4d. Try reopen on non-Resolved (Acknowledged) → 409
  const r4d = await post(`/complaints/${c3Id}/reopen`,
    { reason: 'Cannot reopen if not resolved status.' }, student1.token);
  assert('4d. Reopen on Acknowledged → 409', r4d.status === 409, JSON.stringify(r4d.body));

  // 4e. Try feedback on non-Closed → 409
  const r4e = await post(`/complaints/${c3Id}/feedback`, { rating: 3 }, student1.token);
  assert('4e. Feedback on Acknowledged → 409', r4e.status === 409, JSON.stringify(r4e.body));

  // 4f. Attempt re-verify on already Closed complaint (from Section 1) → 409
  const r4f = await post(`/complaints/${cId}/verify`, {}, student1.token);
  assert('4f. Verify on already-Closed → 409', r4f.status === 409, JSON.stringify(r4f.body));

  // ═══════════════════════════════════════════════════════
  // Section 5: WRONG-ROLE ATTEMPTS
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 5: Wrong-role attempts ───────────────────');

  // 5a. Student tries to assign a complaint → 403
  const r5a = await patch(`/complaints/${c3Id}/assign`,
    { assigneeId: officer.userId }, student1.token);
  assert('5a. Student assign → 403', r5a.status === 403, JSON.stringify(r5a.body));

  // 5b. student2 tries to change status on student1's complaint → 403
  // (student2 is not the assigned officer)
  const r5b = await patch(`/complaints/${c3Id}/status`,
    { toStatus: 'In Progress', note: 'Hack attempt' }, student2.token);
  assert('5b. Non-assigned user changeStatus → 403', r5b.status === 403, JSON.stringify(r5b.body));

  // 5c. student2 tries to verify student1's complaint → 403
  const r5c = await post(`/complaints/${c3Id}/verify`, {}, student2.token);
  assert('5c. Non-owner verify → 403', r5c.status === 403, JSON.stringify(r5c.body));

  // 5d. student2 tries to reopen student1's complaint → 403
  const r5d = await post(`/complaints/${c3Id}/reopen`,
    { reason: 'Trying to reopen someone else complaint.' }, student2.token);
  assert('5d. Non-owner reopen → 403', r5d.status === 403, JSON.stringify(r5d.body));

  // 5e. student2 tries to submit feedback on student1's closed complaint → 403
  const r5e = await post(`/complaints/${cId}/feedback`,
    { rating: 1 }, student2.token);
  assert('5e. Non-owner feedback → 403', r5e.status === 403, JSON.stringify(r5e.body));

  // ═══════════════════════════════════════════════════════
  // Section 6: DUPLICATE FEEDBACK
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 6: Duplicate feedback ────────────────────');

  // student1 already submitted feedback on cId (Section 1 / step 1j); try again → 409
  const r6 = await post(`/complaints/${cId}/feedback`,
    { rating: 5, comment: 'Submitting again' }, student1.token);
  assert('6. Duplicate feedback → 409', r6.status === 409, JSON.stringify(r6.body));

  // ═══════════════════════════════════════════════════════
  // Section 7: VALIDATOR ERRORS
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 7: Validator errors ──────────────────────');

  // 7a. Assign without assigneeId → 400
  const r7a = await patch(`/complaints/${c3Id}/assign`, {}, officer.token);
  assert('7a. Assign missing assigneeId → 400', r7a.status === 400);

  // 7b. changeStatus with invalid toStatus → 400
  const r7b = await patch(`/complaints/${c3Id}/status`,
    { toStatus: 'Submitted', note: 'Going backwards' }, officer.token);
  assert('7b. Invalid toStatus → 400', r7b.status === 400);

  // 7c. changeStatus note too short → 400
  const r7c = await patch(`/complaints/${c3Id}/status`,
    { toStatus: 'In Progress', note: 'hi' }, officer.token);
  assert('7c. Note too short → 400', r7c.status === 400);

  // 7d. Resolve without resolutionNotes → 400 (after advancing to In Progress first)
  await patch(`/complaints/${c3Id}/status`,
    { toStatus: 'In Progress', note: 'Moving forward now' }, officer.token);
  const r7d = await patch(`/complaints/${c3Id}/status`,
    { toStatus: 'Resolved', note: 'Fixing this problem' }, officer.token);
  assert('7d. Resolved without resolutionNotes → 400', r7d.status === 400);

  // 7e. Reopen with reason too short → 400
  const r7e = await post(`/complaints/${c3Id}/reopen`, { reason: 'no' }, student1.token);
  assert('7e. Reopen reason too short → 400', r7e.status === 400);

  // 7f. Feedback with invalid rating → 400
  const r7f = await post(`/complaints/${cId}/feedback`, { rating: 0 }, student1.token);
  assert('7f. Feedback rating 0 → 400', r7f.status === 400);

  const r7g = await post(`/complaints/${cId}/feedback`, { rating: 6 }, student1.token);
  assert('7g. Feedback rating 6 → 400', r7g.status === 400);

  // ═══════════════════════════════════════════════════════
  // Section 8: AUTO-CLOSE (backdate resolvedAt via debug endpoint)
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 8: Auto-close ────────────────────────────');

  // 8a. File complaint, walk it to Resolved
  const r8a = await fileComplaint(student1.token, plainCat._id, 'Auto-close test: faulty projector');
  assert('8a. File auto-close complaint → 201', r8a.status === 201);
  const c4Id = r8a.body.data?._id;

  await patch(`/complaints/${c4Id}/assign`, { assigneeId: officer.userId }, officer.token);
  await patch(`/complaints/${c4Id}/status`, { toStatus: 'In Progress', note: 'On it' }, officer.token);
  await patch(`/complaints/${c4Id}/status`, {
    toStatus: 'Resolved',
    note: 'Projector replaced',
    resolutionNotes: 'Faulty projector was replaced with a new working unit.',
  }, officer.token);

  // 8b. Trigger auto-close now — should close 0 (resolvedAt just set)
  const r8b = await post('/_debug/run-autoclose', {}, admin.token);
  assert('8b. Auto-close runs → 200', r8b.status === 200, JSON.stringify(r8b.body));
  assert('8b. Closes 0 (fresh Resolved)', r8b.body.data?.closed === 0,
    `got: ${r8b.body.data?.closed}`);

  // 8c. Backdate resolvedAt to 8 days ago
  const r8c = await req('PATCH', `/_debug/backdate/${c4Id}`, { days: 8 }, admin.token);
  assert('8c. Backdate resolvedAt → 200', r8c.status === 200, JSON.stringify(r8c.body));

  // 8d. Trigger auto-close again — should close >= 1
  const r8d = await post('/_debug/run-autoclose', {}, admin.token);
  assert('8d. Auto-close closes >= 1', r8d.body.data?.closed >= 1,
    `got: ${r8d.body.data?.closed}`);

  // 8e. Confirm the complaint is now Closed
  const r8e = await get(`/complaints/${c4Id}`, admin.token);
  assert('8e. Auto-closed complaint status = Closed', r8e.body.data?.status === 'Closed',
    `got: ${r8e.body.data?.status}`);

  // Check statusLog has a system entry
  const autoLog = (r8e.body.data?.statusLogs || [])
    .find(l => l.toStatus === 'Closed' && l.changedBy?.name === 'System');
  assert('8e. StatusLog has System auto-close entry', !!autoLog,
    JSON.stringify(r8e.body.data?.statusLogs?.map(l => ({ to: l.toStatus, by: l.changedBy?.name }))));

  // ═══════════════════════════════════════════════════════
  // Section 9: REASSIGNMENT
  // ═══════════════════════════════════════════════════════
  console.log('\n── Section 9: Reassignment ──────────────────────────');

  // New complaint, assign, then reassign to same officer (same dept)
  const r9a = await fileComplaint(student1.token, plainCat._id, 'Reassignment test: blocked drainage');
  assert('9a. File complaint → 201', r9a.status === 201);
  const c5Id = r9a.body.data?._id;

  await patch(`/complaints/${c5Id}/assign`, { assigneeId: officer.userId }, officer.token);
  // Status is now Acknowledged

  const r9b = await patch(`/complaints/${c5Id}/assign`,
    { assigneeId: officer.userId, note: 'Reassigning to myself again to confirm' }, officer.token);
  assert('9b. Reassign → 200 (status unchanged)', r9b.status === 200, JSON.stringify(r9b.body));
  assert('9b. Status still Acknowledged after reassign', r9b.body.data?.status === 'Acknowledged');

  // ═══════════════════════════════════════════════════════
  // Final summary
  // ═══════════════════════════════════════════════════════
  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`Result: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
